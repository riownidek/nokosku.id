import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNumber, cancelNumber, getUsdToIdrRate, usdToIdr, getOffers, getPrices } from "@/lib/herosms";
import { applyMarkupSync } from "@/lib/utils";
import { sendTelegramMessage } from "@/lib/telegram";

const TAG = "[OTP Buy]";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { service, country, serviceName } = await req.json();

    if (!service || country === undefined || country === null)
      return NextResponse.json({ error: "Parameter 'service' dan 'country' wajib diisi" }, { status: 400 });

    console.log(`${TAG} Request: user=${session.user.email} service=${service} country=${country}`);

    // ── 1. Ambil markup + kurs + data user secara paralel ──────────────────────
    const [markupSetting, usdRate, user] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "markup_percent" } }),
      getUsdToIdrRate(),
      prisma.user.findUnique({ where: { id: session.user.id } }),
    ]);

    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (user.isBlocked) return NextResponse.json({ error: "Akun Anda diblokir" }, { status: 403 });

    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    // ── 2. Ambil harga MINIMUM dari /activations/offers (primary) ─────────────────
    // Fallback ke getPrices jika REST endpoint belum tersedia
    // Struktur normalized: { [countryId]: { [serviceCode]: { cost: prices.min, count } } }
    let minPriceUsd = 0;
    try {
      let offers;
      try {
        offers = await getOffers(service);
      } catch {
        console.warn(`${TAG} getOffers gagal, fallback ke getPrices`);
        offers = await getPrices(service);
      }
      const priceEntry = offers?.[String(country)]?.[service];
      minPriceUsd = priceEntry?.cost ?? 0;
      console.log(`${TAG} Min price: country=${country} service=${service} minPriceUsd=${minPriceUsd}`);
    } catch (priceErr) {
      console.warn(`${TAG} Gagal ambil harga, lanjut tanpa maxPrice:`, priceErr);
    }

    const baseCostIdr = usdToIdr(minPriceUsd, usdRate);
    const cost = applyMarkupSync(baseCostIdr, markupPercent);

    // ── 3. Validasi saldo sebelum memanggil API (jika harga diketahui) ─────────
    if (cost > 0) {
      const userBalance = Number(user.balance);
      if (userBalance < cost) {
        return NextResponse.json(
          { error: `Saldo tidak mencukupi. Estimasi biaya: Rp ${cost.toLocaleString("id-ID")}, saldo Anda: Rp ${userBalance.toLocaleString("id-ID")}` },
          { status: 402 }
        );
      }
    }

    // ── 4. Beli nomor dari Hero-SMS ────────────────────────────────────────────
    let heroOrder: { activationId: string; phoneNumber: string };
    try {
      // Kirim maxPrice = minPriceUsd untuk memastikan Hero-SMS
      // tidak mengalokasikan nomor dengan harga lebih mahal dari harga minimum
      heroOrder = await getNumber(String(service), Number(country), minPriceUsd || undefined);
    } catch (apiErr: any) {
      console.error(`${TAG} Hero-SMS getNumber error:`, apiErr?.message);
      return NextResponse.json(
        { error: apiErr?.message ?? "Gagal mendapatkan nomor OTP. Saldo Anda tidak terpotong." },
        { status: 503 }
      );
    }

    const { activationId, phoneNumber } = heroOrder;

    // ── 5. Hitung biaya final berdasarkan harga minimum dari getOffers ──────────
    const finalCost = cost > 0 ? cost : applyMarkupSync(usdToIdr(0.05, usdRate), markupPercent);
    const baseCostIdrFinal = usdToIdr(minPriceUsd, usdRate);

    // ── 6. Validasi saldo kembali (pakai harga pasti setelah berhasil beli) ────
    const userBalance = Number(user.balance);
    if (userBalance < finalCost) {
      // Batalkan pesanan di Hero-SMS karena saldo tidak cukup
      cancelNumber(activationId).catch((err) =>
        console.error(`${TAG} Emergency cancel failed:`, err)
      );
      return NextResponse.json(
        { error: `Saldo tidak mencukupi. Biaya: Rp ${finalCost.toLocaleString("id-ID")}` },
        { status: 402 }
      );
    }

    // ── 7. Potong saldo + simpan order secara atomik ───────────────────────────
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    let order: any;
    try {
      const results = await prisma.$transaction([
        prisma.order.create({
          data: {
            userId: session.user.id,
            providerOrderId: activationId,
            targetData: phoneNumber,
            serviceCategory: "OTP",
            productName: serviceName ?? `OTP ${service}`,
            status: "ACTIVE",
            cost: finalCost,
            baseCost: baseCostIdrFinal,
            expiresAt,
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { balance: { decrement: finalCost } },
        }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            amount: finalCost,
            type: "DEDUCTION",
            status: "SUCCESS",
            note: `OTP ${serviceName ?? service} - ${phoneNumber}`,
          },
        }),
      ]);
      order = results[0];
    } catch (dbErr) {
      console.error(`${TAG} DB transaction failed, cancelling provider order:`, dbErr);
      cancelNumber(activationId).catch((err) =>
        console.error(`${TAG} Emergency cancel failed:`, err)
      );
      return NextResponse.json(
        { error: "Terjadi kesalahan sistem. Pesanan dibatalkan, saldo Anda tidak terpotong." },
        { status: 500 }
      );
    }

    console.log(`${TAG} SUCCESS: orderId=${order.id} number=${phoneNumber} cost=${finalCost} user=${session.user.email}`);

    // ── Telegram (fire-and-forget) ─────────────────────────────────────────────
    sendTelegramMessage(
      `📱 *OTP Dibeli*\nUser: ${session.user.email}\nNomor: \`${phoneNumber}\`\nLayanan: ${serviceName ?? service}\nNegara ID: ${country}\nBiaya: Rp ${finalCost.toLocaleString("id-ID")}`
    ).catch((err) => console.error(`${TAG} Telegram failed:`, err));

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        number: phoneNumber,
        providerOrderId: activationId,
        cost: finalCost,
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
