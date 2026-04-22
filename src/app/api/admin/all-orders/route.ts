import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/all-orders — global order history + tracking
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { providerOrderId: { contains: search, mode: "insensitive" } },
        { targetData: { contains: search, mode: "insensitive" } },
        { productName: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          providerOrderId: true,
          productName: true,
          targetData: true,
          serviceCategory: true,
          status: true,
          cost: true,
          baseCost: true,
          resultData: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const serialized = orders.map((o) => ({
      ...o,
      cost: Number(o.cost),
      baseCost: Number(o.baseCost),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      expiresAt: o.expiresAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ orders: serialized, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[AllOrders GET]", error);
    return NextResponse.json({ error: "Gagal mengambil data pesanan" }, { status: 500 });
  }
}

// PATCH /api/admin/all-orders — manual status update
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { orderId, status } = await req.json();
    if (!orderId || !status) return NextResponse.json({ error: "orderId dan status wajib diisi" }, { status: 400 });

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return NextResponse.json({ success: true, order: { ...updated, cost: Number(updated.cost) } });
  } catch (error) {
    console.error("[AllOrders PATCH]", error);
    return NextResponse.json({ error: "Gagal update status pesanan" }, { status: 500 });
  }
}
