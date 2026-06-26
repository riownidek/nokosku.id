import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPpobPricelist,
  createPpobOrder,
  mapH2HStatusToOrderStatus,
} from "@/lib/h2h";
import { sendTelegramMessage, orderCompletedMessage } from "@/lib/telegram";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

const TAG = "[PPOB Buy]";

/**
 * POST /api/ppob/buy
 *
 * Endpoint pembelian PPOB via H2H.id.
 * Seluruh komunikasi dilakukan server-side — tidak ada kunci yang diekspos ke browser.
 *
 * Body: {
 *   productCode: string   — kode produk H2H (field `code` dari pricelist)
 *   target:      string   — nomor/ID tujuan pelanggan
 *   productName: string   — nama produk (opsional, fallback ke pricelist)
 *   qty?:        number   — untuk produk open denomination (kelipatan 1000)
 *   inquiryId?:  string   — wajib untuk produk PPOB tagihan (PLN pascabayar, BPJS, dll)
 * }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productCode, target, productName, qty, inquiryId } = await req.json();

    if (!productCode || !target)
      return NextResponse.json(
        { error: "productCode dan target wajib diisi" },
        { status: 400 }
      );

    console.log(`${TAG} Request: user=${session.user.email} product=${productCode} target=${target}`);

    // ── 1. Cek user + ambil markup harga ──────────────────────────────────────
    const [user, markupSetting] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.appConfig.findFirst({ where: { key: "markup_ppob_percent" } }),
    ]);

    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if ((user as any).isBlocked) return NextResponse.json({ error: "Akun Anda diblokir" }, { status: 403 });

    const markupAmount = parseFloat(markupSetting?.value ?? "0");

    // ── 2. Validasi produk dari pricelist H2H ─────────────────────────────────
    let product: { code: string; name: string; price: number } | undefined;
    try {
      const pricelist = await getPpobPricelist();
      const found = pricelist.find((p) => p.code === productCode && p.status === "active");
      if (found) {
        product = { code: found.code, name: found.name, price: found.price };
      }
    } catch (apiErr: any) {
      console.error(`${TAG} Pricelist check failed:`, apiErr?.message);
      // Izinkan lanjut dengan harga dari request jika pricelist timeout
      // (edge case: H2H sedang lambat, tapi produk valid)
    }

    if (!product) {
      // Jika tidak ditemukan di pricelist, tolak
      return NextResponse.json(
        { error: `Produk "${productCode}" tidak ditemukan atau tidak aktif di H2H` },
        { status: 404 }
      );
    }

    const baseCost = product.price;
    const cost     = baseCost + markupAmount;
    const userBalance = Number(user.balance);

    // ── 3. Cek saldo SEBELUM request ke H2H ──────────────────────────────────
    if (userBalance < cost) {
      console.warn(`${TAG} Insufficient balance: balance=${userBalance} cost=${cost}`);
      return NextResponse.json(
        {
          error: `Saldo tidak mencukupi. Biaya: Rp ${cost.toLocaleString("id-ID")}, ` +
                 `saldo Anda: Rp ${userBalance.toLocaleString("id-ID")}`,
        },
        { status: 402 }
      );
    }

    const refId = `PPOB-${uuidv4().substring(0, 8).toUpperCase()}`;

    // ── 4. Eksekusi pesanan ke H2H ────────────────────────────────────────────
    let h2hRes: Awaited<ReturnType<typeof createPpobOrder>>;
    try {
      h2hRes = await createPpobOrder({
        productCode,
        target,
        refId,
        qty:       qty       ? Number(qty)       : undefined,
        inquiryId: inquiryId ? String(inquiryId) : undefined,
      });
    } catch (apiErr: any) {
      const isTimeout = apiErr?.message?.includes("timeout");
      const msg = isTimeout
        ? "Layanan PPOB sedang lambat merespons. Saldo Anda tidak terpotong. Coba lagi."
        : `Gagal membuat pesanan ke H2H: ${apiErr?.message ?? "Gangguan jaringan"}. Saldo tidak terpotong.`;
      console.error(`${TAG} createPpobOrder failed:`, apiErr?.message);
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    console.log(
      `${TAG} H2H response: refId=${refId} status=${h2hRes.status} invoice=${h2hRes.invoice}`
    );

    const orderStatus = mapH2HStatusToOrderStatus(h2hRes.status);

    // ── 5. Jika H2H langsung mengembalikan FAILED → tolak tanpa potong saldo ─
    if (orderStatus === "FAILED") {
      console.warn(`${TAG} Order FAILED immediately: refId=${refId} msg=${h2hRes.message}`);
      return NextResponse.json(
        {
          error: `Pembelian gagal: ${h2hRes.message || "Produk tidak tersedia"}. Saldo Anda tidak terpotong.`,
        },
        { status: 400 }
      );
    }

    // ── 6. Potong saldo + simpan order + catat transaksi secara atomik ─────────
    let order: any;
    try {
      const results = await prisma.$transaction([
        prisma.order.create({
          data: {
            userId:          session.user.id,
            providerOrderId: refId,
            targetData:      target,
            serviceCategory: "PPOB",
            productName:     productName ?? product.name,
            status:          orderStatus,
            cost,
            baseCost,
            resultData:      h2hRes.sn ?? null,
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data:  { balance: { decrement: cost } },
        }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            amount: cost,
            type:   "DEDUCTION",
            status: "SUCCESS",
            note:   `PPOB H2H: ${productName ?? product.name} → ${target} [${refId}]`,
          },
        }),
      ] as any);
      order = results[0];
    } catch (dbErr) {
      console.error(
        `${TAG} DB transaction failed after H2H success! CRITICAL:`,
        `refId=${refId} invoice=${h2hRes.invoice}`,
        dbErr
      );
      return NextResponse.json(
        {
          error: "Pesanan berhasil di provider tapi gagal dicatat. " +
                 "Hubungi admin dengan kode: " + refId,
        },
        { status: 500 }
      );
    }

    console.log(`${TAG} SUCCESS: orderId=${order.id} status=${orderStatus} cost=${cost}`);

    // ── 7. Notifikasi Telegram (fire-and-forget) ──────────────────────────────
    if (orderStatus === "COMPLETED") {
      sendTelegramMessage(
        orderCompletedMessage({
          userName:   (user as any).name ?? (user as any).email,
          email:      (user as any).email,
          productName: productName ?? product.name,
          category:   "PPOB",
          targetData: target,
          resultData: h2hRes.sn ?? "-",
          cost,
          orderId:    order.id,
        })
      ).catch((err) => console.error(`${TAG} Telegram failed:`, err));
    }

    return NextResponse.json({
      success: true,
      order: {
        id:      order.id,
        status:  orderStatus,
        sn:      h2hRes.sn,
        invoice: h2hRes.invoice,
        refId,
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
