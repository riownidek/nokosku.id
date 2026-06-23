import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TAG = "[H2H Webhook]";

/**
 * GET /api/webhooks/h2h
 * Digunakan oleh H2H untuk notifikasi status PPOB.
 * Parameter: refid, message, status (via query string)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const refId   = searchParams.get("refid")   ?? searchParams.get("ref_id") ?? "";
  const message = searchParams.get("message") ?? searchParams.get("msg")    ?? "";
  const status  = (searchParams.get("status") ?? "").toLowerCase();

  console.log(`${TAG} [GET] refId=${refId} status=${status} message=${message}`);

  if (!refId) {
    return NextResponse.json({ error: "refid diperlukan" }, { status: 400 });
  }

  try {
    await processH2HUpdate({ refId, status, message, sn: searchParams.get("sn") ?? undefined });
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`${TAG} GET error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/webhooks/h2h
 * Digunakan oleh H2H untuk notifikasi status SMM.
 * Body JSON: { ref_id, status, message, ... }
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const refId   = body.ref_id  ?? body.refid  ?? "";
  const status  = (body.status ?? "").toLowerCase();
  const message = body.message ?? body.msg ?? "";
  const sn      = body.sn      ?? body.serial_number;

  console.log(`${TAG} [POST] refId=${refId} status=${status} message=${message}`);

  if (!refId) {
    return NextResponse.json({ error: "ref_id diperlukan" }, { status: 400 });
  }

  try {
    await processH2HUpdate({ refId, status, message, sn });
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`${TAG} POST error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared update logic
// ─────────────────────────────────────────────────────────────────────────────

async function processH2HUpdate(params: {
  refId: string;
  status: string;
  message: string;
  sn?: string | null;
}) {
  const { refId, status, message, sn } = params;

  // Cari order berdasarkan providerOrderId (= refId kita) atau gatewayReference
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { providerOrderId: refId },
        { gatewayReference: refId } as any,
      ],
    },
  });

  if (!order) {
    console.warn(`${TAG} Order not found for refId=${refId} — ignoring`);
    return;
  }

  // Idempotency: skip jika sudah final
  if (order.status === "COMPLETED" || order.status === "FAILED") {
    console.log(`${TAG} Order ${order.id} already final (${order.status}) — skip`);
    return;
  }

  // Map status H2H → status internal
  let newStatus: string;
  if (["success", "sukses", "paid", "completed"].includes(status)) {
    newStatus = "COMPLETED";
  } else if (["failed", "gagal", "cancel", "cancelled", "refund"].includes(status)) {
    newStatus = "FAILED";
  } else {
    newStatus = "PENDING"; // processing, waiting, etc.
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status:     newStatus,
      resultData: sn ?? order.resultData,
      note:       message || undefined,
    } as any,
  });

  // Jika gagal, kembalikan saldo (refund otomatis)
  if (newStatus === "FAILED" && order.cost > 0) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: order.userId },
        data: { balance: { increment: order.cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: order.userId,
          amount: order.cost,
          type:   "REFUND",
          status: "SUCCESS",
          note:   `Auto-refund H2H: ${order.productName} — ${message}`,
        },
      }),
    ]);
    console.log(`${TAG} Auto-refunded ${order.cost} to userId=${order.userId}`);
  }

  console.log(`${TAG} Updated order ${order.id} → ${newStatus}`);
}
