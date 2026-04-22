import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOTPStatus, rateLimitDelay } from "@/lib/rumahotp";
import { sendTelegramMessage, orderCompletedMessage } from "@/lib/telegram";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId)
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
    });

    if (!order)
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    if (!order.providerOrderId)
      return NextResponse.json({ order, sms: null });

    // Cek apakah sudah kadaluarsa
    if (order.expiresAt && new Date() > order.expiresAt && order.status === "ACTIVE") {
      // Auto-cancel dan refund
      try {
        const { cancelOTPOrder } = await import("@/lib/rumahotp");
        await rateLimitDelay();
        await cancelOTPOrder(order.providerOrderId, "cancel");
      } catch {}

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
            note: `Refund OTP expired - ${order.targetData}`,
          },
        }),
      ]);

      return NextResponse.json({ order: { ...order, status: "CANCELLED" }, refunded: true });
    }

    // Polling status SMS dari RumahOTP
    await rateLimitDelay();
    const providerStatus = await getOTPStatus(order.providerOrderId);

    // Jika SMS diterima
    if (providerStatus.sms && order.status === "ACTIVE") {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED", resultData: providerStatus.sms },
      });

      sendTelegramMessage(
        orderCompletedMessage({
          userName: user?.name ?? user?.email ?? "",
          email: user?.email ?? "",
          productName: order.productName,
          category: "OTP",
          targetData: order.targetData,
          resultData: providerStatus.sms,
          cost: Number(order.cost),
          orderId: order.id,
        })
      );

      return NextResponse.json({
        order: { ...order, status: "COMPLETED", resultData: providerStatus.sms },
        sms: providerStatus.sms,
      });
    }

    return NextResponse.json({
      order,
      sms: providerStatus.sms ?? null,
      providerStatus: providerStatus.status,
    });
  } catch (error) {
    console.error("[OTP Status]", error);
    return NextResponse.json({ error: "Gagal mengecek status OTP" }, { status: 500 });
  }
}
