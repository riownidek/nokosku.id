import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOTPServices } from "@/lib/rumahotp";
import { prisma } from "@/lib/prisma";
import { applyMarkupSync } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const markupSetting = await prisma.setting.findUnique({
      where: { key: "markup_percent" },
    });
    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    const services = await getOTPServices();

    const withMarkup = services.map((s: any) => {
      const rawPrice = Number(s.price ?? s.rate ?? s.cost ?? 0);
      const serviceId = s.service_code ?? s.code ?? s.id ?? s.service_id ?? "";
      const serviceName = s.service_name ?? s.name ?? "";
      
      return {
        ...s,
        code: String(serviceId),
        name: serviceName,
        price: rawPrice,
        displayPrice: applyMarkupSync(rawPrice, markupPercent),
        basePrice: rawPrice,
      };
    });

    return NextResponse.json(withMarkup);
  } catch (error) {
    console.error("[OTP Services]", error);
    return NextResponse.json({ error: "Gagal mengambil daftar layanan" }, { status: 500 });
  }
}
