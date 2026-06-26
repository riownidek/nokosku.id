import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkOrderStatus } from "@/lib/h2h";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TAG = "[PPOB Status]";

/**
 * GET /api/ppob/status?orderId=xxx
 * Cek status pesanan PPOB dari H2H dan update DB jika berubah.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId diperlukan" }, { status: 400 });

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
    });
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // Sudah final — tidak perlu cek ke H2H
    if (order.status === "COMPLETED" || order.status === "FAILED" || order.status === "CANCELLED") {
      return NextResponse.json({ status: order.status, sn: order.resultData });
    }

    // Belum final → cek ke H2H via providerOrderId (= refId kita)
    if (!order.providerOrderId) {
      return NextResponse.json({ status: order.status });
    }

    const h2hStatus = await checkOrderStatus(order.providerOrderId);

    const isSuccess = ["success", "sukses", "paid", "completed"].includes(
      h2hStatus.status.toLowerCase()
    );
    const isFailed = ["failed", "gagal", "cancel"].includes(
      h2hStatus.status.toLowerCase()
    );

    if (isSuccess || isFailed) {
      const newStatus = isSuccess ? "COMPLETED" : "FAILED";
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          resultData: h2hStatus.sn ?? order.resultData,
        },
      });

      // Auto-refund jika gagal
      if (isFailed && order.cost > 0) {
        const existingRefund = await prisma.transaction.findFirst({
          where: { userId: session.user.id, type: "REFUND", note: { contains: order.providerOrderId } },
        });
        if (!existingRefund) {
          await prisma.$transaction([
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
                note: `Auto-refund status poll H2H: ${order.productName} [${order.providerOrderId}]`,
              },
            }),
          ] as any);
        }
      }

      console.log(`${TAG} Updated order ${orderId} → ${newStatus}`);
      return NextResponse.json({ status: newStatus, sn: h2hStatus.sn });
    }

    return NextResponse.json({ status: order.status, h2hStatus: h2hStatus.status });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
