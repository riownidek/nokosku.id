import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncRateNow } from "@/lib/exchange";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

/**
 * POST /api/admin/sync-rate
 * Memicu sinkronisasi manual kurs USD→IDR dari open.er-api.com
 */
export async function POST() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const result = await syncRateNow();
    return NextResponse.json({
      success: true,
      rate: result.rate,
      source: result.source,
      message:
        result.source === "live"
          ? `Kurs berhasil diperbarui: 1 USD = Rp ${result.rate.toLocaleString("id-ID")}`
          : `Gagal fetch kurs live. Menggunakan nilai fallback: ${result.rate}`,
    });
  } catch (err) {
    console.error("[Sync Rate]", err);
    return NextResponse.json({ error: "Gagal sinkronisasi kurs" }, { status: 500 });
  }
}
