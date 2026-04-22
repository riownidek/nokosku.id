import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateReferralCode } from "@/lib/utils";
import { sendTelegramMessage, newUserRegisteredMessage } from "@/lib/telegram";

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  referralCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validasi gagal" },
        { status: 400 }
      );
    }

    const { name, email, password, referralCode } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    // Resolve referral code → referrer id
    let referrerId: string | null = null;
    if (referralCode && referralCode.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
        select: { id: true },
      });
      if (referrer) referrerId = referrer.id;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newReferralCode = generateReferralCode();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        referralCode: newReferralCode,
        referredBy: referrerId ?? undefined,
        role: "USER",
      },
      select: { id: true, email: true, name: true },
    });

    // Fire-and-forget Telegram notification
    sendTelegramMessage(newUserRegisteredMessage({ name: user.name ?? email, email }));

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("[Register]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
