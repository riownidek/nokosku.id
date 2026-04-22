import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPakasirTransaction } from "@/lib/pakasir";
import { sendTelegramMessage, depositSuccessMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ─── Find pending transaction ────────────────────────────────────────────
    const transaction = await prisma.transaction.findFirst({
      where: { gatewayReference: order_id },
      include: { user: { select: { id: true, name: true, email: true, referredBy: true } } },
    });

    if (!transaction) {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json({ message: "Already processed" });
    }

    // ─── Cross-verify with Pakasir API (prevent payload manipulation) ────────
    const verified = await verifyPakasirTransaction(order_id);

    if (!verified.status || verified.data?.status !== "success") {
      if (verified.data?.status === "failed" || verified.data?.status === "expired") {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED" },
        });
      }
      return NextResponse.json({ message: "Payment not confirmed" });
    }

    const depositAmount = transaction.amount;
    const userId = transaction.userId;
    const referrerId = transaction.user.referredBy;

    // ─── Calculate referral commission ──────────────────────────────────────
    let commissionAmount = 0;
    if (referrerId) {
      const commissionSetting = await prisma.setting.findUnique({
        where: { key: "referral_commission_percent" },
      });
      const percent = parseFloat(commissionSetting?.value ?? "0");
      commissionAmount = Math.floor((depositAmount * percent) / 100);
    }

    // ─── Atomic transaction: update balance + optional commission ────────────
    const ops: any[] = [
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCESS" },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: depositAmount } },
      }),
    ];

    if (commissionAmount > 0 && referrerId) {
      ops.push(
        prisma.user.update({
          where: { id: referrerId },
          data: { balance: { increment: commissionAmount } },
        })
      );
      ops.push(
        prisma.transaction.create({
          data: {
            userId: referrerId,
            amount: commissionAmount,
            type: "COMMISSION",
            status: "SUCCESS",
            note: `Komisi referral dari deposit ${transaction.user.email} — ${order_id}`,
          },
        })
      );
    }

    const results = await prisma.$transaction(ops);
    const updatedUser = results[1] as any;
    const newBalance = Number(updatedUser.balance);

    // ─── Telegram notification (fire-and-forget) ─────────────────────────────
    sendTelegramMessage(
      depositSuccessMessage({
        userName: transaction.user.name ?? transaction.user.email,
        email: transaction.user.email,
        amount: depositAmount,
        method: transaction.paymentMethod ?? "unknown",
        orderId: order_id,
        newBalance,
      })
    );

    return NextResponse.json({
      success: true,
      message: "Balance updated",
      commission: commissionAmount > 0 ? commissionAmount : undefined,
    });
  } catch (error) {
    console.error("[Pakasir Webhook]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
