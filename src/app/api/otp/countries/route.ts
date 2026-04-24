import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOTPCountries } from "@/lib/rumahotp";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("service") ?? undefined;

  try {
    const countries = await getOTPCountries(serviceId);
    return NextResponse.json(countries);
  } catch (error: any) {
    console.error("[OTP Countries]", error);
    return NextResponse.json({ error: error?.message ?? "Gagal mengambil daftar negara" }, { status: 500 });
  }
}
