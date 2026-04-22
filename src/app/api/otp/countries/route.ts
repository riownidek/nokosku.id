import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOTPCountries } from "@/lib/rumahotp";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const countries = await getOTPCountries();
    return NextResponse.json(countries);
  } catch (error) {
    console.error("[OTP Countries]", error);
    return NextResponse.json({ error: "Gagal mengambil daftar negara" }, { status: 500 });
  }
}
