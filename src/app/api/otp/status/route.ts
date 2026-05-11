import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatus, cancelNumber } from "@/lib/herosms";
import { sendTelegramMessage, orderCompletedMessage } from "@/lib/telegram";

const TAG = "[OTP Status]";

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

    // Cek apakah sudah kadaluarsa → auto-cancel + refund
    if (order.expiresAt && new Date() > order.expiresAt && order.status === "ACTIVE") {
      try {
        await cancelNumber(order.providerOrderId);
      } catch (err) {
        console.warn(`${TAG} Hero-SMS cancel on expire failed:`, err);
      }

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

    // Polling status SMS dari Hero-SMS
    // Hero-SMS getStatus mengembalikan { status: "WAIT"|"OK"|"CANCEL"|"TIMEOUT", code? }
    const providerStatus = await getStatus(order.providerOrderId);

    // Jika SMS sudah diterima (status OK + ada kode)
    if (providerStatus.status === "OK" && providerStatus.code && order.status === "ACTIVE") {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED", resultData: providerStatus.code },
      });

      sendTelegramMessage(
        orderCompletedMessage({
          userName: user?.name ?? user?.email ?? "",
          email: user?.email ?? "",
          productName: order.productName,
          category: "OTP",
          targetData: order.targetData,
          resultData: providerStatus.code,
          cost: Number(order.cost),
          orderId: order.id,
        })
      ).catch((err) => console.error(`${TAG} Telegram failed:`, err));

      return NextResponse.json({
        order: { ...order, status: "COMPLETED", resultData: providerStatus.code },
        sms: providerStatus.code,
      });
    }

    // Jika Hero-SMS mengembalikan CANCEL → refund otomatis
    if (providerStatus.status === "CANCEL" && order.status === "ACTIVE") {
      await prisma.$transaction([
        prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } }),
        prisma.user.update({ where: { id: session.user.id }, data: { balance: { increment: order.cost } } }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            amount: order.cost,
            type: "REFUND",
            status: "SUCCESS",
            note: `Refund OTP dibatalkan provider - ${order.targetData}`,
          },
        }),
      ]);
      return NextResponse.json({ order: { ...order, status: "CANCELLED" }, refunded: true });
    }

    return NextResponse.json({
      order,
      sms: providerStatus.code ?? null,
      providerStatus: providerStatus.status,
    });
  } catch (error) {
    console.error(`${TAG}`, error);
    return NextResponse.json({ error: "Gagal mengecek status OTP" }, { status: 500 });
  }
}
