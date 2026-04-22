import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/users — daftar semua user
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? "";
  const skip = (page - 1) * limit;

  try {
    const where = search
      ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, balance: true,
          role: true, isBlocked: true, referralCode: true, createdAt: true,
          _count: { select: { orders: true, transactions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[Admin Users GET]", error);
    return NextResponse.json({ error: "Gagal mengambil data pengguna" }, { status: 500 });
  }
}
