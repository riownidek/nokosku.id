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

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
    });

    if (!order)
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // Izinkan pembatalan untuk status ACTIVE atau WAITING
    if (order.status !== "ACTIVE" && order.status !== "WAITING") {
      return NextResponse.json(
        { error: `Pesanan berstatus "${order.status}" tidak dapat dibatalkan` },
        { status: 400 }
      );
    }

    // Batalkan di Hero-SMS (jika ada activationId / providerOrderId)
    let cancelledAtProvider = false;
    if (order.providerOrderId) {
      try {
        cancelledAtProvider = await cancelNumber(order.providerOrderId);
        console.log(`${TAG} Hero-SMS cancel result for ${order.providerOrderId}: ${cancelledAtProvider}`);
      } catch (err) {
        // Tetap lanjutkan refund meski gagal di provider (edge case nomor sudah expired di sisi mereka)
        console.warn(`${TAG} Hero-SMS cancel request failed (proceeding with refund):`, err);
      }
    }

    // Update status + refund secara atomik
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { balance: { increment: order.cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          amount: order.cost,
          type: "REFUND",
          status: "SUCCESS",
          note: `Refund OTP dibatalkan - ${order.targetData}`,
        },
      }),
    ]);

    console.log(`${TAG} SUCCESS: orderId=${orderId} refunded=${Number(order.cost)} user=${session.user.email}`);
    return NextResponse.json({ success: true, refunded: Number(order.cost) });
  } catch (error) {
    console.error(`${TAG} Unhandled error:`, error);
    return NextResponse.json({ error: "Gagal membatalkan pesanan" }, { status: 500 });
  }
}
