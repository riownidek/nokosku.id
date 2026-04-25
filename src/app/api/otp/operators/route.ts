import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOTPOperators } from "@/lib/rumahotp";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") ?? undefined;

  if (!country) {
    return NextResponse.json({ error: "Service dan country wajib diisi" }, { status: 400 });
  }

  try {
    const operators = await getOTPOperators(country);
    return NextResponse.json(operators);
  } catch (error: any) {
    console.error("[OTP Operators]", error);
    return NextResponse.json({ error: error?.message ?? "Gagal mengambil daftar operator" }, { status: 500 });
  }
}
