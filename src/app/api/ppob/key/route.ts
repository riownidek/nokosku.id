import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/ppob/key
 * Kembalikan API Key Jagoanpedia ke klien yang sudah terautentikasi.
 * Kunci ini digunakan untuk memanggil Jagoanpedia langsung dari browser
 * (menghindari blokir Cloudflare Bot Fight Mode pada server Netlify/Vercel).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.JAGOANPEDIA_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return NextResponse.json(
      { error: "JAGOANPEDIA_API_KEY belum dikonfigurasi di server." },
      { status: 503 }
    );
  }

  // Kembalikan kunci beserta margin dari DB — agar klien bisa hitung displayPrice
  return NextResponse.json({ key: apiKey.trim() });
}
