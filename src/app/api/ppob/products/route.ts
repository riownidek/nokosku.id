import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMarkupSync } from "@/lib/utils";

export async function GET(req: Request) {
  console.log("=== [PPOB] Route handler dipanggil ===");

  // 1. Auth check
  let session: any;
  try {
    session = await auth();
  } catch (authErr: any) {
    console.log("=== [PPOB] AUTH ERROR ===", String(authErr));
    return NextResponse.json({ error: "Auth error", detail: String(authErr) }, { status: 500 });
  }

  if (!session?.user?.id) {
    console.log("=== [PPOB] Unauthorized - no session ===");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("=== [PPOB] Auth OK, user:", session.user.email, "===");

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  console.log("=== [PPOB] Category param:", category, "===");

  // 2. Markup setting
  let markupPercent = 0;
  try {
    const markupSetting = await prisma.setting.findUnique({ where: { key: "markup_percent" } });
    markupPercent = parseFloat(markupSetting?.value ?? "0");
    console.log("=== [PPOB] Markup loaded:", markupPercent, "===");
  } catch (dbErr: any) {
    console.log("=== [PPOB] DB ERROR saat baca markup ===", String(dbErr));
    // Non-fatal: lanjutkan dengan markup 0
  }

  // 3. Ambil API key dari AppConfig secara manual agar bisa log hasilnya
  let apiKey = "";
  try {
    const config = await prisma.appConfig.findFirst({ where: { key: "rumahotp_api_key" } });
    apiKey = config?.value?.trim() ?? "";
    console.log("=== [PPOB] API key dari DB:", apiKey ? `"${apiKey.substring(0, 6)}..."` : "KOSONG/TIDAK ADA", "===");
  } catch (dbErr: any) {
    console.log("=== [PPOB] DB ERROR saat baca api key ===", String(dbErr));
    return NextResponse.json({
      error: "Gagal membaca konfigurasi API Key dari database",
      detail: String(dbErr),
    }, { status: 500 });
  }

  if (!apiKey) {
    console.log("=== [PPOB] API KEY KOSONG - tidak bisa lanjut ===");
    return NextResponse.json({
      error: "API Key RumahOTP belum dikonfigurasi di Panel Admin",
      detail: "Masuk /admin/config dan isi nilai untuk rumahotp_api_key",
    }, { status: 500 });
  }

  // 4. Panggil RumahOTP API secara langsung (bypass lib agar log lebih jelas)
  try {
    const rumahOTPUrl = `https://www.rumahotp.io/api/v1/h2h/product`;
    console.log("=== [PPOB] Memanggil RumahOTP URL:", rumahOTPUrl, "===");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let raw: Response;
    try {
      raw = await fetch(rumahOTPUrl, {
        headers: {
          "x-apikey": apiKey,
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log("=== [PPOB] RumahOTP HTTP status:", raw.status, raw.statusText, "===");

    const responseText = await raw.text();
    console.log("=== [PPOB] RumahOTP raw response (pertama 500 char):", responseText.substring(0, 500), "===");

    if (!raw.ok) {
      return NextResponse.json({
        error: "RumahOTP API Error",
        detail: `HTTP ${raw.status} ${raw.statusText}: ${responseText}`,
      }, { status: 500 });
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (jsonErr) {
      return NextResponse.json({
        error: "RumahOTP mengembalikan respons bukan JSON",
        detail: responseText.substring(0, 1000),
      }, { status: 500 });
    }

    // Normalisasi array dari berbagai struktur respons
    let products: any[] = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (Array.isArray(data?.data)) {
      products = data.data;
    } else if (Array.isArray(data?.products)) {
      products = data.products;
    } else {
      console.log("=== [PPOB] Data bukan array. Struktur:", JSON.stringify(data).substring(0, 500), "===");
      return NextResponse.json({
        error: "Struktur respons RumahOTP tidak dikenali",
        detail: data,
      }, { status: 500 });
    }

    console.log("=== [PPOB] Jumlah produk diterima:", products.length, "===");

    // Lakukan filtering in-memory karena API RumahOTP statis
    if (category) {
      products = products.filter((p: any) => 
        p?.category?.toUpperCase() === category.toUpperCase()
      );
      console.log(`=== [PPOB] Jumlah produk setelah filter (${category}):`, products.length, "===");
    }

    const withMarkup = products.map((p: any) => ({
      ...p,
      price: Number(p.price ?? p.harga ?? 0),
      displayPrice: applyMarkupSync(Number(p.price ?? p.harga ?? 0), markupPercent),
      basePrice: Number(p.price ?? p.harga ?? 0),
    }));

    return NextResponse.json(withMarkup);

  } catch (fetchErr: any) {
    const isTimeout = fetchErr?.name === "AbortError";
    const detail = isTimeout
      ? "Request ke RumahOTP timeout setelah 10 detik"
      : String(fetchErr);
    console.log("=== [PPOB] FETCH ERROR ===", detail, "===");
    return NextResponse.json({
      error: "Gagal mengambil daftar produk PPOB",
      detail,
    }, { status: 500 });
  }
}
