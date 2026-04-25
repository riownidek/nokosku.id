import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOTPOperators } from "@/lib/rumahotp";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const providerIdRaw = searchParams.get("provider_id");
  const providerId = providerIdRaw ? parseInt(providerIdRaw, 10) : undefined;

  if (!country) {
    return NextResponse.json({ error: "Parameter 'country' wajib diisi" }, { status: 400 });
  }

  try {
    console.log(`[OTP Operators] country=${country} provider_id=${providerId}`);
    const operators = await getOTPOperators(country, providerId);
    return NextResponse.json(operators);
  } catch (error: any) {
    console.error("[OTP Operators] ERROR:", error?.message ?? error);
    return NextResponse.json({ error: error?.message ?? "Gagal mengambil daftar operator" }, { status: 500 });
  }
}
