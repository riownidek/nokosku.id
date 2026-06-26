import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPpobPricelist } from "@/lib/h2h";
import { prisma } from "@/lib/prisma";

// ── In-process server-side cache ──────────────────────────────────────────────
// Menghindari fetch berulang ke H2H (>10.000 produk) untuk setiap request user.
// TTL 5 menit — cukup segar tanpa overload vendor API.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

let productCache: {
  data: any[];
  markupAmount: number;
  expiredAt: number;
} | null = null;

const TAG = "[PPOB Services]";

/**
 * GET /api/ppob/services?category=&search=&page=&limit=
 *
 * Mengambil daftar layanan PPOB dari H2H.id, menerapkan markup harga,
 * dan mengembalikan halaman produk yang dipesan (pagination server-side).
 *
 * Query params (semua opsional):
 *   category — filter kategori (case-insensitive)
 *   search   — filter nama produk (case-insensitive)
 *   page     — nomor halaman, mulai dari 1 (default: 1)
 *   limit    — jumlah produk per halaman (default: 50, max: 200)
 *
 * Dengan cache 5 menit, request kedua+ dalam window yang sama
 * langsung dikembalikan dari memori proses tanpa hit ke H2H API.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Query params ────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const categoryFilter = (searchParams.get("category") ?? "").trim();
  const searchFilter   = (searchParams.get("search")   ?? "").trim();
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",   10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  try {
    // ── Verifikasi H2H credentials ────────────────────────────────────────────
    if (!process.env.H2H_MEMBER_ID || !process.env.H2H_PIN || !process.env.H2H_PASSWORD) {
      return NextResponse.json(
        { error: "Kredensial H2H.id belum dikonfigurasi di server. Hubungi admin." },
        { status: 503 }
      );
    }

    // ── Baca atau isi cache ───────────────────────────────────────────────────
    const now = Date.now();
    let markupAmount = 0;

    if (productCache && productCache.expiredAt > now) {
      // Cache hit
      console.log(`${TAG} Cache HIT (expires in ${Math.round((productCache.expiredAt - now) / 1000)}s)`);
      markupAmount = productCache.markupAmount;
    } else {
      // Cache miss — fetch dari H2H + DB
      console.log(`${TAG} Cache MISS — fetching from H2H...`);

      try {
        const markupSetting = await prisma.appConfig.findFirst({
          where: { key: "markup_ppob_percent" },
        });
        markupAmount = parseFloat(markupSetting?.value ?? "0");
      } catch {
        // abaikan — lanjut tanpa markup
      }

      const rawProducts = await getPpobPricelist();

      const withMarkup = rawProducts
        .filter((p) => p.status === "active")
        .map((p) => ({
          code:         p.code,
          name:         p.name,
          category:     p.category,
          price:        p.price,
          displayPrice: p.price + markupAmount,
          isOpenDenom:  p.isOpenDenom,
          service:      p.code,
        }));

      if (withMarkup.length === 0) {
        return NextResponse.json(
          { error: "Tidak ada layanan aktif dari H2H.id. Coba lagi nanti." },
          { status: 503 }
        );
      }

      productCache = {
        data:         withMarkup,
        markupAmount,
        expiredAt:    now + CACHE_TTL_MS,
      };
      console.log(`${TAG} Cached ${withMarkup.length} products. TTL=5min`);
    }

    // ── Filter dari cache ─────────────────────────────────────────────────────
    let filtered = productCache.data;

    if (categoryFilter && categoryFilter !== "Semua") {
      filtered = filtered.filter((p) =>
        p.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // ── Pagination ────────────────────────────────────────────────────────────
    const total      = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset     = (page - 1) * limit;
    const pageData   = filtered.slice(offset, offset + limit);

    // Kembalikan juga daftar kategori unik dari seluruh cache (bukan hanya halaman ini)
    const allCategories = [
      ...new Set(productCache.data.map((p) => p.category)),
    ].sort();

    console.log(`${TAG} page=${page}/${totalPages} items=${pageData.length}/${total}`);

    return NextResponse.json({
      success:    true,
      data:       pageData,
      pagination: { page, limit, total, totalPages },
      categories: allCategories,
      cachedAt:   productCache.expiredAt - CACHE_TTL_MS,
    });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json(
      { error: err.message ?? "Gagal mengambil layanan dari H2H.id" },
      { status: 502 }
    );
  }
}
