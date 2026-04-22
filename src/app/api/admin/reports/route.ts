import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/reports — laporan keuangan dan statistik
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "30"; // hari
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(period));

  try {
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalDeposit,
      totalDeposit30d,
      totalOrders,
      totalOrders30d,
      totalSpendAPI,
      pendingDeposits,
      recentTransactions,
      ordersByCategory,
      depositByMethod,
    ] = await Promise.all([
      // Total semua user
      prisma.user.count({ where: { role: "USER" } }),

      // User aktif (punya order dalam 30 hari)
      prisma.user.count({
        where: {
          role: "USER",
          orders: { some: { createdAt: { gte: daysAgo } } },
        },
      }),

      // User baru hari ini
      prisma.user.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),

      // Total deposit sukses sepanjang masa
      prisma.transaction.aggregate({
        where: { type: "DEPOSIT", status: "SUCCESS" },
        _sum: { amount: true },
      }),

      // Total deposit sukses dalam periode
      prisma.transaction.aggregate({
        where: { type: "DEPOSIT", status: "SUCCESS", createdAt: { gte: daysAgo } },
        _sum: { amount: true },
        _count: true,
      }),

      // Total order sepanjang masa
      prisma.order.count(),

      // Total order dalam periode
      prisma.order.count({ where: { createdAt: { gte: daysAgo } } }),

      // Total pengeluaran ke API (harga dasar)
      prisma.order.aggregate({
        where: { status: "COMPLETED" },
        _sum: { baseCost: true },
      }),

      // Deposit pending
      prisma.transaction.count({ where: { type: "DEPOSIT", status: "PENDING" } }),

      // Transaksi terbaru
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { email: true, name: true } } },
      }),

      // Order by kategori
      prisma.order.groupBy({
        by: ["serviceCategory"],
        _count: true,
        _sum: { cost: true },
      }),

      // Deposit by metode pembayaran
      prisma.transaction.groupBy({
        by: ["paymentMethod"],
        where: { type: "DEPOSIT", status: "SUCCESS" },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    // Hitung profil margin
    const totalRevenue = Number(totalDeposit._sum.amount ?? 0);
    const totalApiSpend = Number(totalSpendAPI._sum.baseCost ?? 0);
    const totalOrderCost = await prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { cost: true },
    });
    const grossProfit = Number(totalOrderCost._sum.cost ?? 0) - totalApiSpend;

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        newUsersToday,
        pendingDeposits,
        totalOrders,
        totalOrders30d,
      },
      finance: {
        totalDeposit: totalRevenue,
        totalDeposit30d: Number(totalDeposit30d._sum.amount ?? 0),
        depositCount30d: totalDeposit30d._count,
        totalApiSpend,
        grossProfit,
      },
      charts: {
        ordersByCategory,
        depositByMethod,
      },
      recentTransactions,
    });
  } catch (error) {
    console.error("[Admin Reports]", error);
    return NextResponse.json({ error: "Gagal mengambil laporan" }, { status: 500 });
  }
}
