import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyPakasirTransaction } from "@/lib/pakasir";

const TAG = "[CheckPayment]";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId)
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });

  try {
    const tx = await prisma.transaction.findFirst({
      where: { gatewayReference: orderId, userId: session.user.id },
      select: { id: true, status: true, amount: true, paymentMethod: true, createdAt: true },
    });

    if (!tx) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

    if (tx.status !== "PENDING") {
      return NextResponse.json({ status: tx.status, amount: tx.amount });
    }

    try {
      const verified = await verifyPakasirTransaction(orderId);
      const pakasirStatus = verified.data?.status ?? "pending";

      console.log(`${TAG} orderId=${orderId} pakasirStatus=${pakasirStatus}`);

      const isSuccess = pakasirStatus === "success";
      const isFailed  = pakasirStatus === "failed" || pakasirStatus === "expired";

      if (isSuccess) {
        // Fallback: webhook gagal → terapkan saldo via polling dengan supabaseAdmin
        const lockUpdate = await prisma.transaction.updateMany({
          where: { id: tx.id, status: "PENDING" },
          data: { status: "SUCCESS" },
        });

        if (lockUpdate.count > 0) {
          const { supabaseAdmin } = await import("@/lib/supabase");
          const depositAmount = Number(tx.amount);
          const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { balance: true },
          });
          const newBalance = (Number(currentUser?.balance) || 0) + depositAmount;

          const { error: balErr } = await supabaseAdmin
            .from("users")
            .update({ balance: newBalance })
            .eq("id", session.user.id);

          if (balErr) {
            console.error(`${TAG} Balance update failed:`, balErr);
          } else {
            console.log(`${TAG} Fallback SUCCESS: orderId=${orderId} +${depositAmount} newBalance=${newBalance}`);
          }
        } else {
          console.log(`${TAG} Already processed by webhook: orderId=${orderId}`);
        }

        return NextResponse.json({ status: "SUCCESS", pakasirStatus, amount: tx.amount });
      }

      if (isFailed) {
        await prisma.transaction.updateMany({
          where: { id: tx.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        return NextResponse.json({ status: "FAILED", pakasirStatus, amount: tx.amount });
      }

      return NextResponse.json({ status: "PENDING", pakasirStatus, amount: tx.amount });
    } catch {
      return NextResponse.json({ status: tx.status, amount: tx.amount, note: "gateway_unreachable" });
    }
  } catch (err) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json({ error: "Gagal memeriksa status pembayaran" }, { status: 500 });
  }
}
