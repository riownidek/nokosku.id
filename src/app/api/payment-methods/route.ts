import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, code: true, category: true, adminFeePercent: true, estimasiMenit: true, instruction: true, iconUrl: true },
    });
    return NextResponse.json({ methods });
  } catch {
    return NextResponse.json({
      methods: [
        { id: "1", name: "QRIS", code: "qris", category: "indonesia", adminFeePercent: 0.7, estimasiMenit: 2, instruction: null, iconUrl: null },
        { id: "2", name: "USDT - TRC20", code: "usdt_trc20", category: "crypto", adminFeePercent: 0.7, estimasiMenit: 10, instruction: null, iconUrl: null },
      ],
    });
  }
}
