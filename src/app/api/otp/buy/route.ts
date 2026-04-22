import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buyOTPNumber, rateLimitDelay } from "@/lib/rumahotp";
import { applyMarkupSync } from "@/lib/utils";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { service, country, operator, serviceName } = await req.json();
    if (!service || !country)
      return NextResponse.json({ error: "Service dan country wajib diisi" }, { status: 400 });

    // Ambil markup dari DB
    const markupSetting = await prisma.setting.findUnique({ where: { key: "markup_percent" } });
    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    // Cek saldo user
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (user.isBlocked) return NextResponse.json({ error: "Akun Anda diblokir" }, { status: 403 });

    // Beli nomor dari RumahOTP
    await rateLimitDelay();
    const otpOrder = await buyOTPNumber({ service, country, operator });

    if (!otpOrder?.id || !otpOrder?.number) {
      return NextResponse.json({ error: "Gagal mendapatkan nomor OTP" }, { status: 400 });
    }

    // Hitung biaya dengan markup (gunakan price dari response API)
    const baseCost = otpOrder as any; // API may return price
    const cost = applyMarkupSync(baseCost.price ?? 0, markupPercent);

    // Cek saldo cukup
    const userBalance = Number(user.balance);
    if (userBalance < cost) {
      // Batalkan pesanan di provider
      try {
        const { cancelOTPOrder } = await import("@/lib/rumahotp");
        await rateLimitDelay();
        await cancelOTPOrder(otpOrder.id, "cancel");
      } catch {}
      return NextResponse.json({ error: "Saldo tidak mencukupi" }, { status: 402 });
    }

    const timeoutMinutes = 5;
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Simpan order + potong saldo secara atomik
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId: session.user.id,
          providerOrderId: String(otpOrder.id),
          targetData: otpOrder.number,
          serviceCategory: "OTP",
          productName: serviceName ?? service,
          status: "ACTIVE",
          cost,
          baseCost: (baseCost.price as number) ?? 0,
          expiresAt,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          amount: cost,
          type: "DEDUCTION",
          status: "SUCCESS",
          note: `OTP ${serviceName ?? service} - ${otpOrder.number}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        number: otpOrder.number,
        providerOrderId: otpOrder.id,
        cost,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("[OTP Buy]", error);
    return NextResponse.json({ error: "Gagal membeli nomor OTP" }, { status: 500 });
  }
}
