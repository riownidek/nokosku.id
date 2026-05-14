import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJagoanpediaServices } from "@/lib/jagoanpedia";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Ambil margin PPOB dari settings — key: "markup_ppob_percent"
    const marginSetting = await prisma.setting.findUnique({
      where: { key: "markup_ppob_percent" },
    });
    const marginAmount = parseFloat(marginSetting?.value ?? "0");

    const services = await getJagoanpediaServices(marginAmount);
    return NextResponse.json({ services });
  } catch (err: any) {
    console.error("[PPOB Services]", err);
    return NextResponse.json({ error: err.message ?? "Gagal mengambil layanan PPOB" }, { status: 500 });
  }
}
