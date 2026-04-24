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
    // Cari transaksi milik user ini
    const tx = await prisma.transaction.findFirst({
      where: { gatewayReference: orderId, userId: session.user.id },
      select: { id: true, status: true, amount: true, paymentMethod: true, createdAt: true },
    });

    if (!tx) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

    // Jika sudah sukses/gagal di DB, kembalikan langsung
    if (tx.status !== "PENDING") {
      return NextResponse.json({ status: tx.status, amount: tx.amount });
    }

    // Cross-verify ke Pakasir
    try {
      const verified = await verifyPakasirTransaction(orderId);
      const pakasirStatus = verified.data?.status ?? "pending";

      console.log(`${TAG} orderId=${orderId} pakasirStatus=${pakasirStatus}`);

      return NextResponse.json({
        status: pakasirStatus === "success" ? "SUCCESS" : pakasirStatus === "failed" || pakasirStatus === "expired" ? "FAILED" : "PENDING",
        pakasirStatus,
        amount: tx.amount,
      });
    } catch {
      // Jika Pakasir tidak bisa dihubungi, kembalikan status dari DB
      return NextResponse.json({ status: tx.status, amount: tx.amount, note: "gateway_unreachable" });
    }
  } catch (err) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json({ error: "Gagal memeriksa status pembayaran" }, { status: 500 });
  }
}
