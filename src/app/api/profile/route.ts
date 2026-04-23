import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, email: true, name: true, balance: true,
        role: true, referralCode: true, referredBy: true, createdAt: true,
      },
    });

    // Hitung jumlah referral & bonus (estimasi 500/referral)
    const referralCount = await prisma.user.count({ where: { referredBy: session.user.id } });
    const referralBonus = referralCount * 500;

    return NextResponse.json({ ...user, referralCount, referralBonus });
  } catch {
    return NextResponse.json({ error: "Gagal mengambil profil" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 2)
      return NextResponse.json({ error: "Nama minimal 2 karakter" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
  }
}
