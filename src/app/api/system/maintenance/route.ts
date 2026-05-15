import { NextResponse } from "next/server";

// Edge-safe: gunakan Supabase REST + Service Role Key — TANPA Prisma / TCP connection
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ maintenance: false }, { headers: { "Cache-Control": "no-store" } });
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_configs?key=eq.maintenance_mode&select=value&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ maintenance: false }, { headers: { "Cache-Control": "no-store" } });
    }

    const data = await res.json();
    const maintenance = data?.[0]?.value === "true";

    return NextResponse.json({ maintenance }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ maintenance: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
