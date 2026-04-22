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

    const withMarkup = services.map((s) => ({
      ...s,
      displayPrice: applyMarkupSync(s.price, markupPercent),
      basePrice: s.price,
    }));

    return NextResponse.json(withMarkup);
  } catch (error) {
    console.error("[OTP Services]", error);
    return NextResponse.json({ error: "Gagal mengambil daftar layanan" }, { status: 500 });
  }
}
