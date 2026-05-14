import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("[PPOB Proxy] Meneruskan request ke Jagoanpedia...");

    const response = await fetch("https://jagoanpedia.com/api/ppob", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // Meniru browser untuk meminimalisir deteksi dasar, meskipun Cloudflare BFM tetap bisa memblokir IP
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://jagoanpedia.com",
        "Referer": "https://jagoanpedia.com/",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      // Cek apakah ini halaman Cloudflare
      if (text.includes("cloudflare") || text.includes("cf-") || response.status === 403 || response.status === 404) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Akses diblokir oleh sistem keamanan Cloudflare Jagoanpedia. IP Server Netlify/Vercel masuk daftar hitam Bot Fight Mode.",
            suggestion: "Hubungi Admin Jagoanpedia untuk mem-whitelist IP server/domain website ini."
          },
          { status: 502 }
        );
      }
      return NextResponse.json({ success: false, error: `Jagoanpedia Error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[PPOB Proxy] Error:", error.message);
    return NextResponse.json({ success: false, error: "Internal Server Error saat menghubungi Jagoanpedia" }, { status: 500 });
  }
}
