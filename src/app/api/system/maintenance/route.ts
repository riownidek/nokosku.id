import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await prisma.appConfig.findUnique({
      where: { key: "maintenance_mode" },
    });
    const rawValue = cfg?.value ?? "(not found)";
    console.log(`[Maintenance API] raw value from DB: "${rawValue}"`);
    const maintenance = rawValue === "true";
    return NextResponse.json(
      { maintenance, _debug: rawValue },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("[Maintenance API] Prisma error:", e?.message ?? e);
    return NextResponse.json(
      { maintenance: false, error: e?.message },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
