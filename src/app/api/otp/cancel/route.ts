import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelNumber } from "@/lib/herosms";

const TAG = "[OTP Cancel]";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderId } = await req.json();

    // ─── Ambil order & kunci dengan check status awal ─────────────────────────
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
    });

    if (!order)
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // Validasi status akhir — IDEMPOTENCY: jangan proses ulang jika sudah final
    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Pesanan sudah dibatalkan sebelumnya", alreadyCancelled: true },
        { status: 409 }
      );
    }
    if (order.status !== "ACTIVE" && order.status !== "WAITING" && order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Pesanan berstatus "${order.status}" tidak dapat dibatalkan` },
        { status: 400 }
      );
    }

    // ─── KUNCI TRANSAKSI: set status ke CANCELLING dulu (atomic lock) ─────────
    // Ini mencegah race condition di mana dua request bersamaan keduanya berhasil refund.
    const locked = await prisma.order.updateMany({
      where: {
        id:     orderId,
        userId: session.user.id,
        // Hanya update jika masih dalam status yang bisa dibatalkan (CAS pattern)
        status: { in: ["ACTIVE", "WAITING", "PENDING"] },
      },
      data: { status: "CANCELLING" },
    });

    if (locked.count === 0) {
      // Race condition: request lain sudah mengunci order ini
      return NextResponse.json(
        { error: "Pesanan sedang diproses pembatalannya. Coba lagi sebentar." },
        { status: 409 }
      );
    }

    // ─── Batalkan di Hero-SMS ─────────────────────────────────────────────────
    let cancelledAtProvider = false;
    if (order.providerOrderId) {
      try {
        cancelledAtProvider = await cancelNumber(order.providerOrderId);
        console.log(`${TAG} Hero-SMS cancel result for ${order.providerOrderId}: ${cancelledAtProvider}`);
      } catch (err) {
        console.warn(`${TAG} Hero-SMS cancel request failed:`, err);
      }

      if (!cancelledAtProvider) {
        // Provider menolak — kembalikan status ke ACTIVE dan lepas kunci
        await prisma.order.update({
          where: { id: orderId },
          data:  { status: order.status }, // restore status semula
        });
        return NextResponse.json(
          { error: "Pembatalan ditolak oleh provider (OTP mungkin sudah terkirim). Saldo tidak dikembalikan." },
          { status: 409 }
        );
      }
    } else {
      cancelledAtProvider = true;
    }

    // ─── Cek apakah sudah ada transaksi REFUND untuk order ini (idempotency) ──
    const existingRefund = await prisma.transaction.findFirst({
      where: {
        userId: session.user.id,
        type:   "REFUND",
        note:   { contains: orderId },
      },
    });
    if (existingRefund) {
      // Refund sudah pernah dilakukan, cukup pastikan order CANCELLED
      await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      console.warn(`${TAG} Duplicate refund detected for orderId=${orderId} — skipping balance increment`);
      return NextResponse.json({ success: true, refunded: 0, note: "Already refunded" });
    }

    // ─── Update status + refund secara atomik ────────────────────────────────
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data:  { status: "CANCELLED" },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data:  { balance: { increment: order.cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          amount: order.cost,
          type:   "REFUND",
          status: "SUCCESS",
          // Sertakan orderId dalam note agar bisa digunakan sebagai idempotency key
          note:   `Refund OTP dibatalkan - ${order.targetData} [orderId:${orderId}]`,
        },
      }),
    ]);

    console.log(`${TAG} SUCCESS: orderId=${orderId} refunded=${Number(order.cost)} user=${session.user.id}`);
    return NextResponse.json({ success: true, refunded: Number(order.cost) });
  } catch (error) {
    console.error(`${TAG} Unhandled error:`, error);
    // Jika ada error setelah locking, coba kembalikan status
    try {
      const { orderId } = await req.clone().json().catch(() => ({ orderId: null }));
      if (orderId) {
        await prisma.order.updateMany({
          where: { id: orderId, status: "CANCELLING" },
          data:  { status: "ACTIVE" },
        });
      }
    } catch { /* ignore cleanup error */ }
    return NextResponse.json({ error: "Gagal membatalkan pesanan" }, { status: 500 });
  }
}
