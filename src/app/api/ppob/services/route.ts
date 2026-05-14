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
    // Cek apakah API Key Jagoanpedia sudah dikonfigurasi
    const apiKey = process.env.JAGOANPEDIA_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        { error: "JAGOANPEDIA_API_KEY belum dikonfigurasi di environment variables. Hubungi admin untuk mengisi API Key Jagoanpedia." },
        { status: 503 }
      );
    }

    // Ambil margin PPOB dari settings — key: "markup_ppob_percent"
    const marginSetting = await prisma.setting.findUnique({
      where: { key: "markup_ppob_percent" },
    });
    const marginAmount = parseFloat(marginSetting?.value ?? "0");

    const services = await getJagoanpediaServices(marginAmount);

    // Jika array kosong, kembalikan error deskriptif
    if (!services || services.length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada layanan yang tersedia dari Jagoanpedia. Kemungkinan penyebab: API Key tidak valid, saldo akun provider habis, atau layanan sedang maintenance.",
          services: [],
        },
        { status: 200 } // tetap 200 agar frontend bisa membedakan "kosong" vs "crash"
      );
    }

    return NextResponse.json({ services });
  } catch (err: any) {
    console.error("[PPOB Services]", err);
    return NextResponse.json({ error: err.message ?? "Gagal mengambil layanan PPOB" }, { status: 500 });
  }
}
