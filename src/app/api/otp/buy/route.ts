import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buyOTPNumber, rateLimitDelay, cancelOTPOrder } from "@/lib/rumahotp";
import { applyMarkupSync } from "@/lib/utils";
import { sendTelegramMessage } from "@/lib/telegram";

const TAG = "[OTP Buy]";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { number_id, provider_id, operator_id, serviceName } = await req.json();
    if (!number_id || !provider_id)
      return NextResponse.json({ error: "number_id dan provider_id wajib diisi" }, { status: 400 });

    console.log(`${TAG} Request: user=${session.user.email} number_id=${number_id} provider_id=${provider_id}`);

    // ── 1. Ambil markup + data user SEBELUM memanggil API eksternal ──────────
    const [markupSetting, user] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "markup_percent" } }),
      prisma.user.findUnique({ where: { id: session.user.id } }),
    ]);

    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (user.isBlocked) return NextResponse.json({ error: "Akun Anda diblokir" }, { status: 403 });

    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    // ── 2. Beli nomor dari RumahOTP (dengan timeout built-in di lib) ─────────
    let otpOrder: Awaited<ReturnType<typeof buyOTPNumber>>;
    try {
      await rateLimitDelay();
      otpOrder = await buyOTPNumber({ 
        number_id: Number(number_id), 
        provider_id: Number(provider_id), 
        operator_id: operator_id ? String(operator_id) : undefined 
      });
    } catch (apiErr: any) {
      const isTimeout = apiErr?.message?.includes("timeout");
      const msg = isTimeout
        ? "Maaf, layanan OTP sedang lambat merespons. Saldo Anda tidak terpotong. Coba lagi dalam beberapa saat."
        : "Maaf, layanan OTP sedang gangguan dari pusat. Saldo Anda tidak terpotong.";
      console.error(`${TAG} RumahOTP API error:`, apiErr?.message);
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    if (!otpOrder?.id || !otpOrder?.number) {
      console.error(`${TAG} Invalid response from RumahOTP:`, otpOrder);
      return NextResponse.json(
        { error: "Gagal mendapatkan nomor OTP — layanan tidak merespons dengan benar. Saldo Anda tidak terpotong." },
        { status: 502 }
      );
    }

    // ── 3. Hitung biaya setelah dapat response (harga dari API) ─────────────
    const baseCostRaw = (otpOrder as any).price ?? 0;
    const cost = applyMarkupSync(baseCostRaw, markupPercent);

    // ── 4. Validasi saldo SETELAH dapat harga dari API ───────────────────────
    const userBalance = Number(user.balance);
    if (userBalance < cost) {
      // Batalkan pesanan di provider (fire-and-forget)
      rateLimitDelay()
        .then(() => cancelOTPOrder(otpOrder.id, "cancel"))
        .catch((err) => console.error(`${TAG} Cancel order failed:`, err));

      console.warn(`${TAG} Insufficient balance: user=${session.user.email} balance=${userBalance} cost=${cost}`);
      return NextResponse.json(
        { error: `Saldo tidak mencukupi. Biaya: Rp ${cost.toLocaleString("id-ID")}, saldo Anda: Rp ${userBalance.toLocaleString("id-ID")}` },
        { status: 402 }
      );
    }

    // ── 5. Potong saldo + simpan order secara atomik ─────────────────────────
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let order: any;
    try {
      const results = await prisma.$transaction([
        prisma.order.create({
          data: {
            userId: session.user.id,
            providerOrderId: String(otpOrder.id),
            targetData: otpOrder.number,
            serviceCategory: "OTP",
            productName: serviceName ?? `OTP ${number_id}`,
            status: "ACTIVE",
            cost,
            baseCost: baseCostRaw,
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
            note: `OTP ${serviceName ?? number_id} - ${otpOrder.number}`,
          },
        }),
      ]);
      order = results[0];
    } catch (dbErr) {
      // DB transaction gagal → order sudah dibuat di RumahOTP tapi saldo tidak terpotong
      // Cancel order di provider
      console.error(`${TAG} DB transaction failed, cancelling provider order:`, dbErr);
      rateLimitDelay()
        .then(() => cancelOTPOrder(otpOrder.id, "cancel"))
        .catch((err) => console.error(`${TAG} Emergency cancel failed:`, err));
      return NextResponse.json(
        { error: "Terjadi kesalahan sistem. Pesanan dibatalkan, saldo Anda tidak terpotong." },
        { status: 500 }
      );
    }

    console.log(`${TAG} SUCCESS: orderId=${order.id} number=${otpOrder.number} cost=${cost} user=${session.user.email}`);

    // ── Telegram (fire-and-forget) ────────────────────────────────────────────
    sendTelegramMessage(
      `📱 *OTP Dibeli*\nUser: ${session.user.email}\nNomor: \`${otpOrder.number}\`\nLayanan: ${serviceName ?? number_id}\nBiaya: Rp ${cost.toLocaleString("id-ID")}`
    ).catch((err) => console.error(`${TAG} Telegram failed:`, err));

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
  } catch (error: any) {
    console.error(`${TAG} Unhandled error:`, error?.message ?? error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem. Saldo Anda tidak terpotong." },
      { status: 500 }
    );
  }
}
