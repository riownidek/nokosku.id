import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getH2HProducts } from "@/lib/rumahotp";
import { applyMarkupSync } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;

  try {
    const markupSetting = await prisma.setting.findUnique({ where: { key: "markup_percent" } });
    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    const products = await getH2HProducts(category);

    const withMarkup = products.map((p) => ({
      ...p,
      displayPrice: applyMarkupSync(p.price, markupPercent),
      basePrice: p.price,
    }));

    return NextResponse.json(withMarkup);
  } catch (error) {
    console.error("[PPOB Products]", error);
    return NextResponse.json({ error: "Gagal mengambil daftar produk PPOB" }, { status: 500 });
  }
}
