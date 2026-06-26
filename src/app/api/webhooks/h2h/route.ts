import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interpretCallbackMessage, checkOrderStatus } from "@/lib/h2h";

export const dynamic = "force-dynamic";

const TAG = "[Webhook H2H]";

/**
 * GET /api/webhooks/h2h
 *
 * Callback dari H2H.id untuk transaksi reguler (PPOB, pulsa, token PLN, dll).
 *
 * Dari dokumentasi resmi H2H:
 *   URL Callback yang didaftarkan: https://nokosku.id/api/webhooks/h2h
 *   H2H akan otomatis menambahkan parameter:
 *     ?refid={ref_id}&message={message}&key={webhook_key}
 *
 * PENTING:
 * - Tidak ada parameter `status` yang terpisah dari H2H.
 * - Status transaksi ditentukan berdasarkan isi dari parameter `message`.
 * - Callback bersifat idempoten: callback yang masuk lebih dari satu kali
 *   tidak akan mengubah data yang sudah final.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const refid   = searchParams.get("refid")   ?? searchParams.get("refID") ?? "";
  const message = searchParams.get("message") ?? "";
  const key     = searchParams.get("key")     ?? "";

  console.log(`${TAG} GET callback: refid=${refid} message=${message} key=${key ? "***" : "(none)"}`);

  // ── Validasi Webhook Key (opsional — jika H2H_WEBHOOK_KEY diset) ────────────
  const webhookKey = process.env.H2H_WEBHOOK_KEY;
  if (webhookKey && key !== webhookKey) {
    console.warn(`${TAG} Invalid webhook key for refid=${refid}`);
    return NextResponse.json({ error: "Invalid key" }, { status: 403 });
  }

  if (!refid) {
    console.warn(`${TAG} Missing refid in callback`);
    return NextResponse.json({ error: "refid required" }, { status: 400 });
  }

  try {
    // ── Cari order di DB berdasarkan providerOrderId = refId kita ──────────────
    const order = await prisma.order.findFirst({
      where: { providerOrderId: refid },
    });

    if (!order) {
      console.warn(`${TAG} Order not found for refid=${refid}`);
      // Tetap return 200 agar H2H tidak retry terus
      return NextResponse.json({ status: "ok", note: "order_not_found" });
    }

    // ── Idempotency: skip jika sudah final ─────────────────────────────────────
    if (order.status === "COMPLETED" || order.status === "FAILED" || order.status === "CANCELLED") {
      console.log(`${TAG} Already final: orderId=${order.id} status=${order.status}`);
      return NextResponse.json({ status: "ok", note: "already_final" });
    }

    // ── Interpretasi status dari message ───────────────────────────────────────
    // Docs: "Jangan mengharapkan parameter status; status ditentukan dari message"
    const interpreted = interpretCallbackMessage(message);
    console.log(`${TAG} Interpreted from message="${message}": ${interpreted}`);

    // Jika pending, cek ke H2H untuk kepastian status
    let finalStatus: "COMPLETED" | "FAILED" | "PENDING" = "PENDING";
    let sn: string | null = order.resultData;

    if (interpreted === "success") {
      finalStatus = "COMPLETED";
      // Ekstrak SN dari message jika ada (format: "SN=xxxx" atau "token=xxxx")
      const snMatch = message.match(/(?:SN|token|serial)=([^\s,;]+)/i);
      if (snMatch) sn = snMatch[1];
    } else if (interpreted === "failed") {
      finalStatus = "FAILED";
    } else {
      // Status masih ambigu — polling ke H2H untuk kepastian
      try {
        const h2hStatus = await checkOrderStatus(refid);
        if (h2hStatus.status === "success" || h2hStatus.status === "completed") {
          finalStatus = "COMPLETED";
          sn = h2hStatus.sn ?? sn;
        } else if (h2hStatus.status === "failed") {
          finalStatus = "FAILED";
        }
      } catch (e) {
        console.warn(`${TAG} Failed to poll H2H status for refid=${refid}:`, e);
        // Tetap PENDING — tunggu callback berikutnya
        return NextResponse.json({ status: "ok", note: "status_pending" });
      }
    }

    if (finalStatus === "PENDING") {
      return NextResponse.json({ status: "ok", note: "still_pending" });
    }

    // ── Update status order di DB ──────────────────────────────────────────────
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status:     finalStatus,
        resultData: sn,
      },
    });

    // ── Auto-refund jika FAILED + saldo belum dikembalikan (idempoten) ─────────
    if (finalStatus === "FAILED" && order.cost > 0) {
      const existingRefund = await prisma.transaction.findFirst({
        where: {
          userId: order.userId,
          type:   "REFUND",
          note:   { contains: refid },
        },
      });

      if (!existingRefund) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: order.userId },
            data:  { balance: { increment: order.cost } },
          }),
          prisma.transaction.create({
            data: {
              userId: order.userId,
              amount: order.cost,
              type:   "REFUND",
              status: "SUCCESS",
              note:   `Auto-refund callback H2H: ${order.productName} [${refid}] — ${message}`,
            },
          }),
        ] as any);
        console.log(`${TAG} Refund issued: orderId=${order.id} amount=${order.cost}`);
      } else {
        console.log(`${TAG} Refund already exists for refid=${refid}`);
      }
    }

    console.log(`${TAG} Updated orderId=${order.id} → ${finalStatus}`);
    return NextResponse.json({ status: "ok", finalStatus });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    // Return 200 agar H2H tidak retry berulang kali jika error bukan karena data invalid
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/webhooks/h2h
 *
 * Callback untuk order SMM dari H2H.
 * H2H mengirim POST dengan JSON body.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const refid   = body.ref_id   ?? body.refid   ?? body.refID ?? "";
    const message = body.message  ?? body.status  ?? "";
    const key     = body.key      ?? "";

    console.log(`${TAG} POST callback (SMM): refid=${refid} message=${message}`);

    // Validasi webhook key
    const webhookKey = process.env.H2H_WEBHOOK_KEY;
    if (webhookKey && key !== webhookKey) {
      return NextResponse.json({ error: "Invalid key" }, { status: 403 });
    }

    if (!refid) {
      return NextResponse.json({ error: "ref_id required" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { providerOrderId: refid },
    });

    if (!order) {
      return NextResponse.json({ status: "ok", note: "order_not_found" });
    }

    // Idempotency
    if (order.status === "COMPLETED" || order.status === "FAILED") {
      return NextResponse.json({ status: "ok", note: "already_final" });
    }

    const txStatus  = body.transaction_status ?? body.status ?? "";
    const isSuccess = ["completed", "success", "sukses", "partial"].includes(txStatus.toLowerCase());
    const isFailed  = ["failed", "cancelled", "cancel", "gagal"].includes(txStatus.toLowerCase());

    const finalStatus: "COMPLETED" | "FAILED" | null =
      isSuccess ? "COMPLETED" : isFailed ? "FAILED" : null;

    if (!finalStatus) {
      return NextResponse.json({ status: "ok", note: "still_pending" });
    }

    await prisma.order.update({
      where: { id: order.id },
      data:  { status: finalStatus },
    });

    if (finalStatus === "FAILED" && order.cost > 0) {
      const existingRefund = await prisma.transaction.findFirst({
        where: { userId: order.userId, type: "REFUND", note: { contains: refid } },
      });
      if (!existingRefund) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: order.userId },
            data:  { balance: { increment: order.cost } },
          }),
          prisma.transaction.create({
            data: {
              userId: order.userId,
              amount: order.cost,
              type:   "REFUND",
              status: "SUCCESS",
              note:   `Auto-refund SMM callback H2H [${refid}]`,
            },
          }),
        ] as any);
      }
    }

    return NextResponse.json({ status: "ok", finalStatus });
  } catch (err: any) {
    console.error(`${TAG} POST Error:`, err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
