import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPpobOrder } from "@/lib/h2h";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const TAG = "[PPOB Order]";

/**
 * POST /api/ppob/order
 *
 * Membuat pesanan PPOB via H2H.id (server-side), memotong saldo pengguna,
 * dan mencatat order + transaksi ke database secara atomik.
 *
 * Body: {
 *   productCode: string    — kode produk H2H (field 'code' dari pricelist)
 *   target: string         — nomor/ID tujuan pelanggan
 *   displayPrice: number   — harga yang disepakati pengguna (setelah markup)
 *   qty?: number           — jumlah (untuk produk open denomination)
 * }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { productCode, target, displayPrice, qty } = body;

    if (!productCode || !target || displayPrice === undefined) {
      return NextResponse.json(
        { error: "productCode, target, dan displayPrice wajib diisi" },
        { status: 400 }
      );
    }

    const price = Number(displayPrice);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "displayPrice tidak valid" }, { status: 400 });
    }

    // ── Cek saldo pengguna ─────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });
    if (!user || Number(user.balance) < price) {
      return NextResponse.json(
        { error: `Saldo tidak cukup. Dibutuhkan ${price}, saldo Anda ${user?.balance ?? 0}` },
        { status: 402 }
      );
    }

    // ── Generate ref ID unik ────────────────────────────────────────────────────
    const refId = `NKS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // ── Buat order di H2H.id ───────────────────────────────────────────────────
    console.log(`${TAG} Placing H2H order: code=${productCode} target=${target} refId=${refId}`);
    const h2hResult = await createPpobOrder({
      productCode,
      target,
      refId,
      qty: qty ? Number(qty) : undefined,
    });

    const isSuccess = ["success", "sukses", "paid", "completed"].includes(
      h2hResult.status.toLowerCase()
    );
    const isFailed = ["failed", "gagal", "cancel"].includes(
      h2hResult.status.toLowerCase()
    );
    const finalStatus = isSuccess ? "COMPLETED" : isFailed ? "FAILED" : "PENDING";

    // ── Atomic: potong saldo + simpan order + catat transaksi ──────────────────
    const [updatedUser, order] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: price } },
      }),
      prisma.order.create({
        data: {
          userId:          session.user.id,
          providerOrderId: refId,
          targetData:      target,
          serviceCategory: "PPOB",
          productName:     productCode,
          status:          finalStatus,
          cost:            price,
          baseCost:        h2hResult.price ?? price,
          resultData:      h2hResult.sn ?? null,
          expiresAt:       new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          amount: price,
          type:   "DEDUCTION",
          status: "SUCCESS",
          note:   `PPOB H2H: ${productCode} → ${target} [${refId}]`,
        },
      }),
    ] as any);

    // Jika H2H langsung mengembalikan FAILED, auto-refund
    if (isFailed) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data: { balance: { increment: price } },
        }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            amount: price,
            type:   "REFUND",
            status: "SUCCESS",
            note:   `Auto-refund PPOB H2H: ${productCode} → ${h2hResult.message} [${refId}]`,
          },
        }),
      ] as any);
    }

    console.log(`${TAG} Success: refId=${refId} status=${finalStatus}`);
    return NextResponse.json({
      success: true,
      order,
      newBalance: Number(updatedUser.balance),
      h2hStatus: h2hResult.status,
      sn: h2hResult.sn,
    });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json(
      { error: err.message ?? "Gagal membuat pesanan PPOB" },
      { status: 500 }
    );
  }
}
