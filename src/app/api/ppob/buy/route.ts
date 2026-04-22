import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createH2HOrder, rateLimitDelay, getH2HProducts } from "@/lib/rumahotp";
import { applyMarkupSync } from "@/lib/utils";
import { sendTelegramMessage, orderCompletedMessage } from "@/lib/telegram";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productCode, target, productName, category } = await req.json();
    if (!productCode || !target)
      return NextResponse.json({ error: "productCode dan target wajib diisi" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (user.isBlocked) return NextResponse.json({ error: "Akun Anda diblokir" }, { status: 403 });

    // Ambil info produk untuk harga
    const markupSetting = await prisma.setting.findUnique({ where: { key: "markup_percent" } });
    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    await rateLimitDelay();
    const products = await getH2HProducts(category);
    const product = products.find((p) => p.product_code === productCode);
    if (!product)
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });

    const cost = applyMarkupSync(product.price, markupPercent);
    const userBalance = Number(user.balance);

    if (userBalance < cost)
      return NextResponse.json({ error: "Saldo tidak mencukupi" }, { status: 402 });

    const refId = `PPOB-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Buat pesanan di RumahOTP
    await rateLimitDelay();
    const h2hRes = await createH2HOrder({ product_code: productCode, target, ref_id: refId });

    const orderStatus = h2hRes.status === "success" ? "COMPLETED" : 
                        h2hRes.status === "failed" ? "FAILED" : "PENDING";

    // Simpan order + potong saldo secara atomik
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId: session.user.id,
          providerOrderId: h2hRes.trx_id ?? refId,
          targetData: target,
          serviceCategory: "PPOB",
          productName: productName ?? product.product_name,
          status: orderStatus,
          cost,
          baseCost: product.price,
          resultData: h2hRes.sn ?? null,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          amount: cost,
          type: "DEDUCTION",
          status: "SUCCESS",
          note: `PPOB ${productName ?? product.product_name} - ${target}`,
        },
      }),
    ]);

    // Jika gagal, refund otomatis
    if (orderStatus === "FAILED") {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            amount: cost,
            type: "REFUND",
            status: "SUCCESS",
            note: `Refund PPOB failed - ${target}`,
          },
        }),
      ]);
      return NextResponse.json({ error: "Pembelian gagal, saldo dikembalikan" }, { status: 400 });
    }

    // Notifikasi jika selesai
    if (orderStatus === "COMPLETED") {
      sendTelegramMessage(
        orderCompletedMessage({
          userName: user.name ?? user.email,
          email: user.email,
          productName: productName ?? product.product_name,
          category: "PPOB",
          targetData: target,
          resultData: h2hRes.sn ?? "-",
          cost,
          orderId: order.id,
        })
      );
    }

    return NextResponse.json({ success: true, order: { ...order, sn: h2hRes.sn } });
  } catch (error) {
    console.error("[PPOB Buy]", error);
    return NextResponse.json({ error: "Gagal melakukan pembelian PPOB" }, { status: 500 });
  }
}
