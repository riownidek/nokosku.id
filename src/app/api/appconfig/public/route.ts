import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/appconfig/public — ambil config yang aman untuk public (banner, popup)
export async function GET() {
  try {
    const configs = await prisma.appConfig.findMany({
      where: { group: { in: ["visual", "popup"] } },
      select: { key: true, value: true },
    });
    const result: Record<string, string> = {};
    for (const c of configs) result[c.key] = c.value;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
