import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { key: "maintenance_mode" }
    });
    
    return NextResponse.json(
      { maintenance: config?.value === "true" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json({ maintenance: false });
  }
}
