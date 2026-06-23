import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPpobPricelist, getSmmPricelist } from "@/lib/h2h";

export const dynamic = "force-dynamic";

/**
 * GET /api/h2h/pricelist?type=ppob|smm
 * Mengembalikan daftar harga dari H2H.id (dengan opsi margin)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "ppob";

  try {
    const products = type === "smm"
      ? await getSmmPricelist()
      : await getPpobPricelist();

    return NextResponse.json({ success: true, count: products.length, data: products });
  } catch (err: any) {
    console.error("[H2H Pricelist]", err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
