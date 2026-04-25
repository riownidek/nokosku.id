import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createH2HOrder, rateLimitDelay, getH2HProducts } from "@/lib/rumahotp";
import { applyMarkupSync } from "@/lib/utils";
import { sendTelegramMessage, orderCompletedMessage } from "@/lib/telegram";
import { v4 as uuidv4 } from "uuid";

const TAG = "[PPOB Buy]";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productCode, target, productName, category } = await req.json();
    if (!productCode || !target)
      return NextResponse.json({ error: "productCode dan target wajib diisi" }, { status: 400 });

    console.log(`${TAG} Request: user=${session.user.email} product=${productCode} target=${target}`);

    // ── 1. Cek user + ambil markup ────────────────────────────────────────────
    const [user, markupSetting] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.setting.findUnique({ where: { key: "markup_percent" } }),
    ]);

    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (user.isBlocked) return NextResponse.json({ error: "Akun Anda diblokir" }, { status: 403 });

    const markupPercent = parseFloat(markupSetting?.value ?? "0");

    // ── 2. Ambil harga produk dari RumahOTP ───────────────────────────────────
    let product: { product_code: string; product_name: string; price: number } | undefined;
    try {
      await rateLimitDelay();
      const products = await getH2HProducts();
      product = products.find((p) => p.product_code === productCode);
    } catch (apiErr: any) {
      const isTimeout = apiErr?.message?.includes("timeout");
      const msg = isTimeout
        ? "Layanan PPOB sedang lambat merespons. Saldo Anda tidak terpotong. Coba lagi."
        : "Gagal mengambil informasi produk dari server. Saldo Anda tidak terpotong.";
      console.error(`${TAG} Get products failed:`, apiErr?.message);
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    if (!product) {
      console.warn(`${TAG} Product not found: ${productCode}`);
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const cost = applyMarkupSync(product.price, markupPercent);
    const userBalance = Number(user.balance);

    // ── 3. Cek saldo SEBELUM request ke RumahOTP ─────────────────────────────
    if (userBalance < cost) {
      console.warn(`${TAG} Insufficient balance: user=${session.user.email} balance=${userBalance} cost=${cost}`);
      return NextResponse.json(
        { error: `Saldo tidak mencukupi. Biaya: Rp ${cost.toLocaleString("id-ID")}, saldo Anda: Rp ${userBalance.toLocaleString("id-ID")}` },
        { status: 402 }
      );
    }

    const refId = `PPOB-${uuidv4().substring(0, 8).toUpperCase()}`;

    // ── 4. Eksekusi pesanan di RumahOTP ───────────────────────────────────────
    let h2hRes: Awaited<ReturnType<typeof createH2HOrder>>;
    try {
      await rateLimitDelay();
      h2hRes = await createH2HOrder({ product_code: productCode, target, ref_id: refId });
    } catch (apiErr: any) {
      const isTimeout = apiErr?.message?.includes("timeout");
      const msg = isTimeout
        ? "Maaf, layanan PPOB sedang lambat. Saldo Anda tidak terpotong. Coba lagi dalam beberapa saat."
        : "Maaf, layanan PPOB sedang gangguan dari pusat. Saldo Anda tidak terpotong.";
      console.error(`${TAG} createH2HOrder failed:`, apiErr?.message);
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    console.log(`${TAG} RumahOTP response: refId=${refId} status=${h2hRes.status} trx_id=${h2hRes.trx_id}`);

    // ── 5. Tentukan status berdasarkan response ───────────────────────────────
    const orderStatus =
      h2hRes.status === "success" ? "COMPLETED" :
      h2hRes.status === "failed"  ? "FAILED"    : "PENDING";

    // ── 6. Jika gagal langsung → kembalikan error TANPA potong saldo ─────────
    if (orderStatus === "FAILED") {
      console.warn(`${TAG} Order FAILED immediately: refId=${refId} message=${h2hRes.message}`);
      return NextResponse.json(
        { error: `Pembelian gagal: ${h2hRes.message ?? "Produk tidak tersedia"}. Saldo Anda tidak terpotong.` },
        { status: 400 }
      );
    }

    // ── 7. Potong saldo + simpan order secara atomik ──────────────────────────
    let order: any;
    try {
      const results = await prisma.$transaction([
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
      order = results[0];
    } catch (dbErr) {
      console.error(`${TAG} DB transaction failed after RumahOTP success:`, dbErr);
      // RumahOTP sudah memproses tapi DB gagal — ini edge case kritis
      // Log trx_id agar bisa di-refund manual
      console.error(`${TAG} CRITICAL: RumahOTP trx_id=${h2hRes.trx_id} refId=${refId} NOT recorded in DB. Manual refund needed.`);
      return NextResponse.json(
        { error: "Terjadi kesalahan sistem saat mencatat transaksi. Hubungi admin dengan kode: " + refId },
        { status: 500 }
      );
    }

    console.log(`${TAG} SUCCESS: orderId=${order.id} status=${orderStatus} cost=${cost} user=${session.user.email}`);

    // ── 8. Notifikasi Telegram (fire-and-forget) ──────────────────────────────
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
      ).catch((err) => console.error(`${TAG} Telegram failed:`, err));
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: orderStatus,
        sn: h2hRes.sn,
        trxId: h2hRes.trx_id,
        cost,
      },
    });
  } catch (error: any) {
    console.error(`${TAG} Unhandled error:`, error?.message ?? error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem. Saldo Anda tidak terpotong." },
      { status: 500 }
    );
  }
}
