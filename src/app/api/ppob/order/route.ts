import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createJagoanpediaOrder, getJagoanpediaServices } from "@/lib/jagoanpedia";
import { supabaseAdmin } from "@/lib/supabase";

const TAG = "[PPOB Order]";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { serviceId, target } = await req.json();
    if (!serviceId || !target)
      return NextResponse.json({ error: "serviceId dan target wajib diisi" }, { status: 400 });

    // Ambil margin & harga layanan
    const marginSetting = await prisma.setting.findUnique({ where: { key: "markup_ppob_percent" } });
    const marginAmount = parseFloat(marginSetting?.value ?? "0");

    const services = await getJagoanpediaServices(marginAmount);
    const service = services.find((s) => s.service === serviceId);
    if (!service)
      return NextResponse.json({ error: "Layanan tidak ditemukan" }, { status: 404 });

    const displayPrice = service.displayPrice ?? service.price;

    // Cek saldo pengguna
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });
    if (!user || user.balance < displayPrice) {
      return NextResponse.json(
        { error: `Saldo tidak cukup. Dibutuhkan ${displayPrice}, saldo Anda ${user?.balance ?? 0}` },
        { status: 402 }
      );
    }

    console.log(`${TAG} Creating order for user=${session.user.id} service=${serviceId} target=${target} price=${displayPrice}`);

    // Buat order di Jagoanpedia
    const orderRes = await createJagoanpediaOrder(serviceId, target);
    if (!orderRes.success || !orderRes.data?.id) {
      throw new Error(orderRes.message ?? "Gagal membuat pesanan di provider");
    }

    const providerOrderId = orderRes.data.id;

    // Potong saldo dengan supabaseAdmin (bypass RLS)
    const newBalance = Number(user.balance) - displayPrice;
    const { error: balanceErr } = await supabaseAdmin
      .from("users")
      .update({ balance: newBalance })
      .eq("id", session.user.id);

    if (balanceErr) {
      console.error(`${TAG} Balance deduction failed:`, balanceErr);
      throw new Error("Gagal memotong saldo. Hubungi admin.");
    }

    // Simpan order ke DB
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        providerOrderId: providerOrderId,
        targetData: target,
        serviceCategory: "PPOB",
        productName: service.name,
        status: orderRes.data.status?.toUpperCase() === "SUCCESS" ? "COMPLETED" : "PENDING",
        cost: displayPrice,
        baseCost: service.price,
        resultData: orderRes.data.sn ?? null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 jam
      },
    });

    // Catat transaksi
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: displayPrice,
        type: "DEDUCTION",
        status: "SUCCESS",
        note: `Pembelian PPOB: ${service.name} → ${target}`,
      },
    });

    console.log(`${TAG} Success: orderId=${order.id} providerOrderId=${providerOrderId}`);
    return NextResponse.json({ success: true, order, newBalance });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json({ error: err.message ?? "Gagal membuat pesanan PPOB" }, { status: 500 });
  }
}
