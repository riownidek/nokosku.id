import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPpobPricelist } from "@/lib/h2h";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TAG = "[PPOB Products]";

/**
 * GET /api/ppob/products?category=&search=
 *
 * Mengembalikan daftar produk PPOB dari H2H.id,
 * dengan dukungan filter kategori dan pencarian.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryFilter = searchParams.get("category") ?? "";
  const searchFilter   = searchParams.get("search")   ?? "";

  try {
    if (!process.env.H2H_MEMBER_ID || !process.env.H2H_PIN || !process.env.H2H_PASSWORD) {
      return NextResponse.json(
        { error: "Kredensial H2H.id belum dikonfigurasi. Hubungi admin." },
        { status: 503 }
      );
    }

    // Ambil markup dari DB
    let markupAmount = 0;
    try {
      const markupSetting = await prisma.appConfig.findFirst({
        where: { key: "markup_ppob_percent" },
      });
      markupAmount = parseFloat(markupSetting?.value ?? "0");
    } catch { /* abaikan jika DB error */ }

    // Panggil H2H pricelist
    const products = await getPpobPricelist();

    // Filter: aktif saja (status dinormalisasi menjadi "active"/"inactive")
    let filtered = products.filter((p) => p.status === "active");

    // Filter kategori
    if (categoryFilter) {
      filtered = filtered.filter((p) =>
        p.category.toLowerCase().includes(categoryFilter.toLowerCase())
      );
    }

    // Filter pencarian
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    }

    // Terapkan markup dan normalkan field
    const result = filtered.map((p) => ({
      code:         p.code,
      name:         p.name,
      category:     p.category,
      price:        p.price,
      displayPrice: p.price + markupAmount,
      isOpenDenom:  p.isOpenDenom,
      description:  p.description ?? "",
      // Alias untuk kompatibilitas komponen lama
      service:      p.code,
      product_code: p.code,
      product_name: p.name,
    }));

    console.log(`${TAG} Returning ${result.length}/${products.length} products`);
    return NextResponse.json({ success: true, total: result.length, data: result });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json(
      { error: err.message ?? "Gagal mengambil produk dari H2H.id" },
      { status: 502 }
    );
  }
}
