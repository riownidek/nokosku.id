import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

const actionSchema = z.object({
  action: z.enum(["block", "unblock", "add_balance", "deduct_balance", "topup", "deduct"]),
  amount: z.number().optional(),
  note: z.string().optional(),
});

// PATCH /api/admin/users/[id] — blokir/unblokir, tambah/potong saldo
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validasi gagal" }, { status: 400 });

  const { action, amount, note } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    switch (action) {
      case "block":
        await prisma.user.update({ where: { id }, data: { isBlocked: true } });
        return NextResponse.json({ success: true, message: "Akun berhasil diblokir" });

      case "unblock":
        await prisma.user.update({ where: { id }, data: { isBlocked: false } });
        return NextResponse.json({ success: true, message: "Akun berhasil dibuka blokirnya" });

      case "add_balance":
      case "topup":
        if (!amount || amount <= 0)
          return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
        await prisma.$transaction([
          prisma.user.update({ where: { id }, data: { balance: { increment: amount } } }),
          prisma.transaction.create({
            data: {
              userId: id, amount, type: "DEPOSIT", status: "SUCCESS",
              note: note ?? `Saldo ditambahkan oleh admin (${session.user.email})`,
            },
          }),
        ]);
        return NextResponse.json({ success: true, message: `Saldo +Rp ${amount.toLocaleString("id-ID")} berhasil ditambahkan` });

      case "deduct_balance":
      case "deduct":
        if (!amount || amount <= 0)
          return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
        if (Number(user.balance) < amount)
          return NextResponse.json({ error: "Saldo user tidak mencukupi" }, { status: 400 });
        await prisma.$transaction([
          prisma.user.update({ where: { id }, data: { balance: { decrement: amount } } }),
          prisma.transaction.create({
            data: {
              userId: id, amount, type: "DEDUCTION", status: "SUCCESS",
              note: note ?? `Saldo dipotong oleh admin (${session.user.email})`,
            },
          }),
        ]);
        return NextResponse.json({ success: true, message: `Saldo -Rp ${amount.toLocaleString("id-ID")} berhasil dipotong` });

      default:
        return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Admin User Action]", error);
    return NextResponse.json({ error: "Gagal melakukan aksi" }, { status: 500 });
  }
}

// GET /api/admin/users/[id] — detail user + riwayat
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 20 },
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
