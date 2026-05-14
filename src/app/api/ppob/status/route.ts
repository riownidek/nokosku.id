import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkJagoanpediaStatus } from "@/lib/jagoanpedia";

const TAG = "[PPOB Status]";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId)
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });

  try {
    // Ambil order dari DB, pastikan milik user ini
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id, serviceCategory: "PPOB" },
    });
    if (!order)
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // Jika sudah final, kembalikan dari DB
    if (order.status === "COMPLETED" || order.status === "FAILED" || order.status === "CANCELLED") {
      return NextResponse.json({ status: order.status, resultData: order.resultData });
    }

    // Belum final → cek ke Jagoanpedia
    if (!order.providerOrderId) {
      return NextResponse.json({ status: order.status, resultData: null });
    }

    const statusRes = await checkJagoanpediaStatus(order.providerOrderId);
    const providerStatus = statusRes.data?.status?.toLowerCase() ?? "pending";
    const sn = statusRes.data?.sn ?? null;

    console.log(`${TAG} orderId=${orderId} providerStatus=${providerStatus}`);

    let dbStatus = order.status;
    if (providerStatus === "success") {
      dbStatus = "COMPLETED";
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED", resultData: sn },
      });
    } else if (providerStatus === "failed" || providerStatus === "cancelled") {
      dbStatus = "FAILED";
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ status: dbStatus, resultData: sn });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json({ error: err.message ?? "Gagal cek status" }, { status: 500 });
  }
}
