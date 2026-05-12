import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCountries } from "@/lib/herosms";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rawCountries = await getCountries();
    const countries = Object.values(rawCountries).map(c => ({
      id: c.id,
      name: c.eng,
    }));
    
    countries.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(countries);
  } catch (error: any) {
    console.error("[OTP Countries]", error);
    return NextResponse.json({ error: error?.message ?? "Gagal mengambil daftar negara" }, { status: 500 });
  }
}
