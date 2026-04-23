import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createPakasirDeposit } from "@/lib/pakasir";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const TAG = "[Deposit]";

const depositSchema = z.object({
  amount: z.number().min(10000, "Minimum deposit Rp 10.000"),
  method: z.string().min(1, "Metode wajib diisi"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validasi gagal" }, { status: 400 });

    const { amount, method } = parsed.data;

    // ── Validasi method dari tabel PaymentMethod (by `code`) ─────────────────
    // Wizard deposit mengirim `method: m.code` (string seperti "qris", "usdt_trc20")
    let paymentMethod: { name: string; adminFeePercent: number; code: string } | null = null;
    try {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { code: method, isActive: true },
        select: { name: true, adminFeePercent: true, code: true },
      });
    } catch {
      // Tabel mungkin belum ada — fallback ke QRIS
      console.warn(`${TAG} Tabel PaymentMethod belum tersedia — fallback ke validasi QRIS`);
      const FALLBACK_CODES = ["qris", "bca_va", "bni_va", "bri_va", "mandiri_va", "ovo", "dana", "gopay", "shopeepay"];
      if (!FALLBACK_CODES.includes(method))
        return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 });
      paymentMethod = { name: method.toUpperCase(), adminFeePercent: 0.7, code: method };
    }

    if (!paymentMethod)
      return NextResponse.json({ error: `Metode pembayaran "${method}" tidak tersedia` }, { status: 400 });

    // ── Validasi min/max deposit dari settings ───────────────────────────────
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["min_deposit", "max_deposit"] } },
    });
    const minDeposit = parseInt(settings.find((s) => s.key === "min_deposit")?.value ?? "10000");
    const maxDeposit = parseInt(settings.find((s) => s.key === "max_deposit")?.value ?? "10000000");

    if (amount < minDeposit || amount > maxDeposit)
      return NextResponse.json({
        error: `Deposit harus antara Rp ${minDeposit.toLocaleString("id-ID")} - Rp ${maxDeposit.toLocaleString("id-ID")}`,
      }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const orderId = `DEP-${uuidv4().substring(0, 8).toUpperCase()}`;
    console.log(`${TAG} Creating deposit | orderId=${orderId} | method=${method} | amount=${amount}`);

    // ── Buat transaksi di Pakasir ─────────────────────────────────────────────
    // Pakasir hanya terima method baku (qris, bca_va, dll).
    // Kita petakan `method` (kode unik dari DB) ke metode Pakasir.
    const getPakasirMethod = (code: string): string | null => {
      const c = code.toLowerCase();
      if (c.includes("qris")) return "qris";
      if (c.includes("bca")) return "bca_va";
      if (c.includes("bni")) return "bni_va";
      if (c.includes("bri")) return "bri_va";
      if (c.includes("mandiri")) return "mandiri_va";
      if (c.includes("permata")) return "permata_va";
      if (c.includes("cimb")) return "cimb_va";
      if (c.includes("danamon")) return "danamon_va";
      if (c.includes("ovo")) return "ovo";
      if (c.includes("dana")) return "dana";
      if (c.includes("gopay")) return "gopay";
      if (c.includes("shopee")) return "shopeepay";
      return null;
    };

    const pakasirMethod = getPakasirMethod(method);

    let paymentUrl: string | undefined;
    let vaNumber: string | undefined;
    let qrUrl: string | undefined;
    let instruction: string | undefined; // teks instruksi — BUKAN URL

    if (pakasirMethod) {
      const pakasirRes = await createPakasirDeposit(
        pakasirMethod as any,
        orderId,
        amount,
        { customerName: user?.name ?? undefined, customerEmail: user?.email }
      );

      if (!pakasirRes.status || !pakasirRes.data?.payment_url) {
        console.error(`${TAG} Pakasir error:`, pakasirRes.message);
        return NextResponse.json({ error: pakasirRes.message ?? "Gagal membuat transaksi pembayaran" }, { status: 400 });
      }

      paymentUrl = pakasirRes.data.payment_url;
      vaNumber = pakasirRes.data.va_number;
      qrUrl = pakasirRes.data.qr_string;
    } else {
      // Crypto/manual method — tidak melalui Pakasir
      // Ambil teks instruksi dan simpan ke field 'instruction' (BUKAN paymentUrl)
      const methodRecord = await prisma.paymentMethod.findFirst({
        where: { code: method },
        select: { instruction: true },
      });
      instruction = methodRecord?.instruction ?? undefined;
    }

    // ── Simpan transaksi ke DB ────────────────────────────────────────────────
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount,
        status: "PENDING",
        type: "DEPOSIT",
        gatewayReference: orderId,
        paymentMethod: method,
        paymentUrl: paymentUrl ?? null,
      },
    });

    console.log(`${TAG} Transaksi disimpan | orderId=${orderId}`);

    return NextResponse.json({
      success: true,
      paymentUrl,      // URL gateway Pakasir (hanya untuk metode QRIS/VA/e-wallet)
      orderId,
      vaNumber,
      qrUrl,
      instruction,     // Teks instruksi manual (crypto/transfer) — tampilkan sebagai teks
      method: paymentMethod.name,
      adminFee: Math.ceil(amount * paymentMethod.adminFeePercent / 100),
    });
  } catch (error) {
    console.error(`${TAG} Error:`, error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// GET — kembalikan metode dari tabel PaymentMethod (fallback ke QRIS)
export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, code: true, category: true, adminFeePercent: true, estimasiMenit: true },
    });
    return NextResponse.json({ methods });
  } catch {
    return NextResponse.json({
      methods: [{ id: "1", name: "QRIS", code: "qris", category: "indonesia", adminFeePercent: 0.7, estimasiMenit: 2 }],
    });
  }
}
