import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/orders/active — ambil semua pesanan OTP yang masih ACTIVE atau WAITING
// Digunakan untuk restore kartu OTP setelah navigasi
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const activeOrders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        serviceCategory: "OTP",
        status: { in: ["ACTIVE", "WAITING", "PENDING"] },
        // Hanya tampilkan yang belum kedaluwarsa
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        providerOrderId: true,
        targetData: true,
        productName: true,
        cost: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        resultData: true,
      },
    });

    return NextResponse.json({ orders: activeOrders });
  } catch (err) {
    console.error("[ActiveOrders]", err);
    return NextResponse.json({ error: "Gagal mengambil pesanan aktif" }, { status: 500 });
  }
}
