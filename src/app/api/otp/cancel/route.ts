import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelOTPOrder, rateLimitDelay } from "@/lib/rumahotp";

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

    if (order.status !== "ACTIVE")
      return NextResponse.json({ error: "Pesanan tidak dapat dibatalkan" }, { status: 400 });

    // Batalkan di RumahOTP
    if (order.providerOrderId) {
      await rateLimitDelay();
      await cancelOTPOrder(order.providerOrderId, "cancel");
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
          note: `Refund OTP cancelled - ${order.targetData}`,
        },
      }),
    ]);

    return NextResponse.json({ success: true, refunded: Number(order.cost) });
  } catch (error) {
    console.error("[OTP Cancel]", error);
    return NextResponse.json({ error: "Gagal membatalkan pesanan" }, { status: 500 });
  }
}
