import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOffers, getPrices, getUsdToIdrRate, usdToIdr, SERVICE_NAMES, COUNTRY_NAMES } from "@/lib/herosms";
import { prisma } from "@/lib/prisma";
import { applyMarkupSync } from "@/lib/utils";

const TAG = "[OTP Services]";

// Daftar country ID yang didukung di quick-select
const SUPPORTED_COUNTRIES = [2, 73, 46]; // Indonesia, Filipina, Malaysia

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceFilter = searchParams.get("service"); // wajib saat dipanggil dari OTP page

  try {
    const [markupSetting, usdRate] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "markup_percent" } }),
      getUsdToIdrRate(),
    ]);
    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    // Ambil harga MINIMUM dari REST API modern Hero-SMS
    // Fallback ke legacy getPrices jika endpoint baru gagal
    let rawPrices;
    try {
      rawPrices = await getOffers(serviceFilter ?? undefined);
    } catch (offersErr) {
      console.warn(`${TAG} getOffers gagal, fallback ke getPrices:`, offersErr);
      rawPrices = await getPrices(serviceFilter ?? undefined);
    }

    console.log(`${TAG} Raw price keys (first 5):`, Object.keys(rawPrices).slice(0, 5));

    const services: any[] = [];

    // ── Iterasi: countryId → serviceCode (struktur aktual API) ─────────────────
    for (const [countryIdStr, serviceCodes] of Object.entries(rawPrices)) {
      const countryId = Number(countryIdStr);

      // Jika ada filter service, hanya proses country yang relevan
      // Optionally hanya tampilkan negara populer saat serviceFilter aktif
      if (serviceFilter && !SUPPORTED_COUNTRIES.includes(countryId)) continue;

      const countryName = COUNTRY_NAMES[countryId] ?? `Negara ${countryId}`;

      for (const [svcCode, priceData] of Object.entries(serviceCodes)) {
        // Jika ada filter service, lewati kode layanan yang tidak sesuai
        if (serviceFilter && svcCode !== serviceFilter) continue;

        const svcName = SERVICE_NAMES[svcCode] ?? svcCode.toUpperCase();

        // ⚠️ Field aktual API adalah "cost" bukan "price"
        const rawCost = priceData.cost ?? 0;
        const stockCount = priceData.count ?? 0;

        // Hanya tampilkan jika ada stok
        if (rawCost === 0 && stockCount === 0) continue;

        const priceIdr = usdToIdr(rawCost, usdRate);
        const displayPrice = applyMarkupSync(priceIdr, markupPercent);

        services.push({
          code: svcCode,
          name: svcName,
          countryId,
          countryName,
          priceUsd: rawCost,
          priceIdr,
          displayPrice,
          count: stockCount,
        });
      }
    }

    console.log(`${TAG} Parsed ${services.length} entries. Filter: ${serviceFilter ?? "all"}`);

    // Urutkan: populer dulu, lalu alfabet
    const popularOrder = ["wa", "tg", "ig", "lf", "go", "fb"];
    services.sort((a, b) => {
      const ai = popularOrder.indexOf(a.code);
      const bi = popularOrder.indexOf(b.code);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error(`${TAG} Error:`, error);
    return NextResponse.json({ error: "Gagal mengambil daftar layanan" }, { status: 500 });
  }
}
