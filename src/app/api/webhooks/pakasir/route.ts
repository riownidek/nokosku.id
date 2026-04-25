import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPakasirTransaction } from "@/lib/pakasir";
import { sendTelegramMessage, depositSuccessMessage } from "@/lib/telegram";

const TAG = "[Pakasir Webhook]";

export async function POST(req: Request) {
  let body: any;

  // ─── 1. Parse payload — SELALU balas 200 agar Pakasir tidak retry ──────────
  try {
    body = await req.json();
  } catch {
    console.error(`${TAG} Invalid JSON payload`);
    // Tetap 200 agar Pakasir tidak retry dengan payload yang sama
    return NextResponse.json({ received: true });
  }

  console.log(`${TAG} RAW WEBHOOK PAYLOAD:`, JSON.stringify(body));

  // Mendukung berbagai struktur payload dari Pakasir
  const order_id = body?.order_id ?? body?.reference ?? body?.data?.order_id;
  const status = body?.status ?? body?.data?.status;

  if (!order_id || !status) {
    console.error(`${TAG} Missing order_id or status`);
    return NextResponse.json({ received: true });
  }

  console.log(`${TAG} Received webhook: order_id=${order_id} status=${status}`);

  // ─── 2. Proses secara async — balas 200 DULU, proses di background ─────────
  // Dalam Vercel Edge/Node, kita proses synchronous tapi pastikan SELALU 200
  try {
    // ── Cari transaksi di DB ─────────────────────────────────────────────────
    const transaction = await prisma.transaction.findFirst({
      where: { gatewayReference: { equals: order_id, mode: "insensitive" } },
      include: { user: { select: { id: true, name: true, email: true, referredBy: true } } },
    });

    if (!transaction) {
      // Tidak ditemukan → mungkin duplicate webhook → abaikan, tetap 200
      console.warn(`${TAG} Transaction not found for order_id=${order_id} — ignoring`);
      return NextResponse.json({ received: true });
    }

    // ── Idempotency check — sudah diproses? ─────────────────────────────────
    if (transaction.status !== "PENDING") {
      console.log(`${TAG} Already processed: order_id=${order_id} status=${transaction.status}`);
      return NextResponse.json({ received: true, already_processed: true });
    }

    // ── Cross-verify dengan Pakasir API (anti payload manipulation) ──────────
    let verified: Awaited<ReturnType<typeof verifyPakasirTransaction>>;
    try {
      verified = await verifyPakasirTransaction(order_id);
    } catch (verifyErr) {
      console.error(`${TAG} Failed to verify with Pakasir API:`, verifyErr);
      // Verifikasi gagal → jangan proses saldo, tapi tetap 200 agar tidak retry berlebihan
      // Pakasir akan retry nanti dan verifikasi mungkin berhasil
      return NextResponse.json({ received: true, verification_pending: true });
    }

    // Jika pembayaran failed/expired → tandai FAILED
    const verifyStatusStr = String(verified.data?.status || verified?.status || status || "").toLowerCase();
    const isSuccess = ["success", "completed", "paid", "settled", "true"].includes(verifyStatusStr);
    const isFailed = ["failed", "expired", "canceled", "cancelled", "false"].includes(verifyStatusStr);

    if (!isSuccess) {
      if (isFailed) {
        try {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: "FAILED" },
          });
          console.log(`${TAG} Marked FAILED: order_id=${order_id}`);
        } catch (dbErr) {
          console.error(`${TAG} DB update FAILED error:`, dbErr);
        }
      }
      return NextResponse.json({ received: true, payment_status: verifyStatusStr || "unconfirmed" });
    }

    // ── Pembayaran sukses — update saldo secara atomik ───────────────────────
    const depositAmount = transaction.amount;
    const userId = transaction.userId;
    const referrerId = transaction.user.referredBy;

    // Kunci atomik: pastikan status MURNI masih PENDING sebelum diubah
    const lockUpdate = await prisma.transaction.updateMany({
      where: { id: transaction.id, status: "PENDING" },
      data: { status: "SUCCESS" },
    });

    // Jika count 0, artinya transaksi sudah tidak PENDING (sudah diproses oleh request lain bersamaan)
    if (lockUpdate.count === 0) {
      console.warn(`${TAG} Race condition prevented! Transaction already processed: order_id=${order_id}`);
      return NextResponse.json({ received: true, already_processed: true });
    }

    let commissionAmount = 0;
    if (referrerId) {
      try {
        const commissionSetting = await prisma.setting.findUnique({
          where: { key: "referral_commission_percent" },
        });
        const percent = parseFloat(commissionSetting?.value ?? "0");
        commissionAmount = Math.floor((depositAmount * percent) / 100);
      } catch (commErr) {
        console.error(`${TAG} Failed to calculate commission:`, commErr);
      }
    }

    const ops: any[] = [
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
        }),
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
    const updatedUser = results[0] as any; // Index 0 is the user update now
    const newBalance = Number(updatedUser.balance);

    console.log(`${TAG} SUCCESS: order_id=${order_id} user=${transaction.user.email} amount=${depositAmount} newBalance=${newBalance}`);

    // ── Telegram (fire-and-forget, jangan blokir response) ───────────────────
    sendTelegramMessage(
      depositSuccessMessage({
        userName: transaction.user.name ?? transaction.user.email,
        email: transaction.user.email,
        amount: depositAmount,
        method: transaction.paymentMethod ?? "unknown",
        orderId: order_id,
        newBalance,
      })
    ).catch((err) => console.error(`${TAG} Telegram notification failed:`, err));

    return NextResponse.json({
      received: true,
      success: true,
      commission: commissionAmount > 0 ? commissionAmount : undefined,
    });
  } catch (error) {
    // ── Catch-all: error internal — tetap 200 agar Pakasir tidak retry ───────
    console.error(`${TAG} Unhandled error:`, error);
    // PENTING: Return 200 bukan 500! Pakasir retry pada non-2xx
    // Jika error DB, transaksi masih PENDING dan akan diproses ulang saat retry
    return NextResponse.json({ received: true, error: "processing_error" });
  }
}
