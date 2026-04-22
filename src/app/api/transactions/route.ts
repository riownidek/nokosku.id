import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const skip = (page - 1) * limit;

  try {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[Transactions]", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat transaksi" }, { status: 500 });
  }
}
