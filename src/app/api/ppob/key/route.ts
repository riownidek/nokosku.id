import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/ppob/key
 *
 * Verifikasi bahwa kredensial H2H.id tersedia di server.
 * Mengembalikan flag `ready: true` jika semua env var H2H sudah dikonfigurasi.
 * (Tidak lagi mengekspos kunci ke klien — H2H dipanggil server-side saja)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = process.env.H2H_MEMBER_ID;
  const pin      = process.env.H2H_PIN;
  const password = process.env.H2H_PASSWORD;

  if (!memberId || !pin || !password) {
    return NextResponse.json(
      { error: "Kredensial H2H.id belum dikonfigurasi di server. Hubungi admin untuk mengisi H2H_MEMBER_ID, H2H_PIN, dan H2H_PASSWORD." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ready: true });
}
