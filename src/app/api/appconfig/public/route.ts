import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/appconfig/public — ambil config yang aman untuk public (banner, popup, pricing)
// Keys yang di-expose: visual, popup, dan safe keys dari group api
const SAFE_API_KEYS = ["min_deposit_amount", "max_deposit_amount", "usd_to_idr_rate", "markup_percent"];

export async function GET() {
  try {
    const configs = await prisma.appConfig.findMany({
      where: {
        OR: [
          { group: { in: ["visual", "popup"] } },
          { key: { in: SAFE_API_KEYS } },
        ],
      },
      select: { key: true, value: true },
    });

    // Juga cek markup_percent dari tabel Setting
    let markupPercent = "0";
    try {
      const setting = await prisma.setting.findUnique({ where: { key: "markup_percent" } });
      if (setting?.value) markupPercent = setting.value;
    } catch {}

    const result: Record<string, string> = { markup_percent: markupPercent };
    for (const c of configs) result[c.key] = c.value;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ markup_percent: "0" });
  }
}
