import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Dibaca langsung dari DB via REST supabase agar tidak ada circular dependency di middleware
    const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!dbUrl || !dbKey) {
      return NextResponse.json({ maintenance: false });
    }

    const res = await fetch(`${dbUrl}/rest/v1/app_configs?key=eq.maintenance_mode&select=value`, {
      headers: {
        apikey: dbKey,
        Authorization: `Bearer ${dbKey}`,
      },
      next: { revalidate: 30 }, // cache 30 detik di server
    });

    if (!res.ok) return NextResponse.json({ maintenance: false });

    const data = await res.json();
    const value = data?.[0]?.value;
    const maintenance = value === "true";

    return NextResponse.json({ maintenance }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ maintenance: false });
  }
}
