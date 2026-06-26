import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPpobPricelist } from "@/lib/h2h";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TAG = "[PPOB Services]";

/**
 * GET /api/ppob/services
 *
 * Mengambil daftar layanan PPOB dari H2H.id dan menerapkan markup harga.
 * Diakses oleh frontend PPOB page.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verifikasi H2H credentials tersedia
    if (!process.env.H2H_MEMBER_ID || !process.env.H2H_PIN || !process.env.H2H_PASSWORD) {
      return NextResponse.json(
        { error: "Kredensial H2H.id belum dikonfigurasi di server. Hubungi admin." },
        { status: 503 }
      );
    }

    // Ambil markup dari DB (opsional — 0 jika belum diset)
    let markupAmount = 0;
    try {
      const marginSetting = await prisma.appConfig.findFirst({
        where: { key: "markup_ppob_percent" },
      });
      markupAmount = parseFloat(marginSetting?.value ?? "0");
    } catch {
      // Ignore DB error — lanjut tanpa markup
    }

    const products = await getPpobPricelist();

    // Terapkan markup
    const withMarkup = products
      .filter((p) => p.status === "active")
      .map((p) => ({
        ...p,
        displayPrice: p.price + markupAmount,
        // Normalkan field untuk kompatibilitas dengan ServiceCard component
        service: p.code,
        name:    p.name,
        category: p.category,
        price:   p.price,
      }));

    if (withMarkup.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada layanan aktif dari H2H.id. Coba lagi nanti." },
        { status: 503 }
      );
    }

    console.log(`${TAG} Returning ${withMarkup.length} products with markup=${markupAmount}`);
    return NextResponse.json({ success: true, data: withMarkup });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json(
      { error: err.message ?? "Gagal mengambil layanan dari H2H.id" },
      { status: 502 }
    );
  }
}
