import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrices, getUsdToIdrRate, usdToIdr, SERVICE_NAMES, COUNTRY_NAMES } from "@/lib/herosms";
import { prisma } from "@/lib/prisma";
import { applyMarkupSync } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceFilter = searchParams.get("service"); // optional filter

  try {
    const [markupSetting, usdRate] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "markup_percent" } }),
      getUsdToIdrRate(),
    ]);
    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    // Ambil semua harga dari Hero-SMS (atau filter per service)
    const rawPrices = await getPrices(serviceFilter ?? undefined);

    // Bangun daftar layanan dari data harga
    // Format: [{ code, name, countryId, countryName, priceUsd, priceIdr, displayPrice }]
    const services: any[] = [];

    for (const [svcCode, countries] of Object.entries(rawPrices)) {
      // Jika ada filter service, lewati yang tidak sesuai
      if (serviceFilter && svcCode !== serviceFilter) continue;

      const svcName = SERVICE_NAMES[svcCode] ?? svcCode.toUpperCase();

      for (const [countryIdStr, priceData] of Object.entries(countries)) {
        const countryId = Number(countryIdStr);
        const countryName = COUNTRY_NAMES[countryId] ?? `Negara ${countryId}`;
        const priceUsd = priceData.price ?? 0;
        const priceIdr = usdToIdr(priceUsd, usdRate);
        const displayPrice = applyMarkupSync(priceIdr, markupPercent);

        services.push({
          code: svcCode,
          name: svcName,
          countryId,
          countryName,
          priceUsd,
          priceIdr,
          displayPrice,
          count: priceData.count ?? 0,
        });
      }
    }

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
    console.error("[OTP Services]", error);
    return NextResponse.json({ error: "Gagal mengambil daftar layanan" }, { status: 500 });
  }
}
