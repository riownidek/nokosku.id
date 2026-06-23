import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPpobOrder, createSmmOrder } from "@/lib/h2h";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const TAG = "[H2H Order]";

/**
 * POST /api/h2h/order
 *
 * Body: {
 *   productCode: string
 *   target: string          — nomor/username/URL tujuan
 *   type?: "smm"            — wajib untuk SMM order
 *   qty?: number            — wajib untuk SMM, opsional untuk open-denom PPOB
 * }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { productCode, target, qty } = body;
    const isSMM = (body.type ?? "").toLowerCase() === "smm";

    if (!productCode || !target)
      return NextResponse.json({ error: "productCode dan target wajib diisi" }, { status: 400 });
    if (isSMM && !qty)
      return NextResponse.json({ error: "qty wajib diisi untuk pesanan SMM" }, { status: 400 });

    // Generate reference ID unik
    const refId = `NKS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Cek saldo (estimasi dari pricelist — validasi ketat dilakukan setelah response H2H)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });
    if (!user || Number(user.balance) <= 0) {
      return NextResponse.json({ error: "Saldo tidak mencukupi" }, { status: 402 });
    }

    // Buat order ke H2H
    let result;
    if (isSMM) {
      result = await createSmmOrder({
        productCode, target, qty: Number(qty), refId,
      });
    } else {
      result = await createPpobOrder({
        productCode, target, refId, qty: qty ? Number(qty) : undefined,
      });
    }

    const isSuccess = ["success", "sukses", "paid"].includes(result.status.toLowerCase());
    const isFailed  = ["failed", "gagal", "cancel"].includes(result.status.toLowerCase());
    const price     = result.price ?? 0;

    if (price > 0) {
      // Potong saldo + catat order secara atomik
      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data:  { balance: { decrement: price } },
        }),
        prisma.order.create({
          data: {
            userId:          session.user.id,
            providerOrderId: refId,
            targetData:      target,
            serviceCategory: isSMM ? "SMM" : "PPOB",
            productName:     productCode,
            status:          isSuccess ? "COMPLETED" : isFailed ? "FAILED" : "PENDING",
            cost:            price,
            baseCost:        price,
            resultData:      result.sn ?? null,
          },
        }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            amount: price,
            type:   "DEDUCTION",
            status: "SUCCESS",
            note:   `${isSMM ? "SMM" : "PPOB"} H2H: ${productCode} → ${target} [${refId}]`,
          },
        }),
      ]);
    }

    console.log(`${TAG} refId=${refId} status=${result.status} price=${price}`);
    return NextResponse.json({ success: true, refId, ...result });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json({ error: err.message ?? "Gagal membuat pesanan H2H" }, { status: 500 });
  }
}
