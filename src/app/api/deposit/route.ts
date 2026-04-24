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

/**
 * Petakan kode DB (bisa berisi nama bank/provider) ke metode Pakasir baku.
 * Returns null jika tidak cocok → metode crypto/manual.
 */
function getPakasirMethod(code: string): string | null {
  const c = code.toLowerCase();
  if (c.includes("qris"))     return "qris";
  if (c.includes("bca"))      return "bca_va";
  if (c.includes("bni"))      return "bni_va";
  if (c.includes("bri"))      return "bri_va";
  if (c.includes("mandiri"))  return "mandiri_va";
  if (c.includes("permata"))  return "permata_va";
  if (c.includes("cimb"))     return "cimb_va";
  if (c.includes("danamon"))  return "danamon_va";
  if (c.includes("ovo"))      return "ovo";
  if (c.includes("dana"))     return "dana";
  if (c.includes("gopay"))    return "gopay";
  if (c.includes("shopee"))   return "shopeepay";
  return null;
}

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

    // ── Validasi + ambil metode pembayaran dari DB ─────────────────────────────
    let paymentMethodRecord: {
      name: string; adminFeePercent: number; code: string;
      instruction: string | null; category: string;
    } | null = null;

    try {
      paymentMethodRecord = await prisma.paymentMethod.findFirst({
        where: { code: method, isActive: true },
        select: { name: true, adminFeePercent: true, code: true, instruction: true, category: true },
      });
    } catch (dbErr) {
      console.warn(`${TAG} DB query PaymentMethod gagal, fallback QRIS:`, dbErr);
      paymentMethodRecord = { name: "QRIS", adminFeePercent: 0.7, code: "qris", instruction: null, category: "indonesia" };
    }

    if (!paymentMethodRecord)
      return NextResponse.json({ error: `Metode pembayaran "${method}" tidak tersedia atau tidak aktif.` }, { status: 400 });

    // ── Validasi min/max deposit ───────────────────────────────────────────────
    let minDeposit = 10000;
    let maxDeposit = 10_000_000;
    try {
      const settings = await prisma.setting.findMany({
        where: { key: { in: ["min_deposit", "max_deposit"] } },
      });
      minDeposit = parseInt(settings.find((s) => s.key === "min_deposit")?.value ?? "10000");
      maxDeposit = parseInt(settings.find((s) => s.key === "max_deposit")?.value ?? "10000000");
    } catch { /* pakai default jika setting belum ada */ }

    if (amount < minDeposit || amount > maxDeposit)
      return NextResponse.json({
        error: `Deposit harus antara ${minDeposit.toLocaleString("id-ID")} - Rp ${maxDeposit.toLocaleString("id-ID")}`,
      }, { status: 400 });

    // ── Data user ─────────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const orderId = `DEP-${uuidv4().substring(0, 8).toUpperCase()}`;
    console.log(`${TAG} Creating | orderId=${orderId} | method=${method} | amount=${amount}`);

    // ── Tentukan alur: Pakasir atau Manual/Crypto ─────────────────────────────
    let paymentUrl: string | undefined;
    let vaNumber:   string | undefined;
    let qrUrl:      string | undefined;
    let instruction: string | undefined;

    const pakasirMethod = getPakasirMethod(method);

    if (pakasirMethod) {
      // ── Alur Pakasir (QRIS / VA / e-wallet) ─────────────────────────────────
      let pakasirRes: Awaited<ReturnType<typeof createPakasirDeposit>>;
      try {
        pakasirRes = await createPakasirDeposit(
          pakasirMethod as any,
          orderId,
          amount,
          { customerName: user?.name ?? undefined, customerEmail: user?.email }
        );
      } catch (pakasirErr: any) {
        console.error(`${TAG} Pakasir API exception:`, pakasirErr?.message ?? pakasirErr);
        return NextResponse.json({
          error: `Gateway pembayaran tidak merespons: ${pakasirErr?.message ?? "Unknown error"}`,
        }, { status: 502 });
      }

      console.log(`${TAG} Pakasir Raw Response:`, JSON.stringify(pakasirRes));

      // Pakasir bisa jadi mengembalikan { code: 200, data: {...} } atau { status: true, data: {...} }
      // Kita cek keberadaan 'data' sebagai penanda sukses jika 'status' tidak eksplisit true
      const isSuccess = pakasirRes.status === true || (pakasirRes.status as any) === 200 || !!pakasirRes.data;

      if (!isSuccess) {
        console.error(`${TAG} Pakasir request failed. Response:`, pakasirRes);
        return NextResponse.json({ error: pakasirRes.message ?? "Gagal membuat invoice Pakasir. Pastikan API Key valid." }, { status: 400 });
      }

      // Pakasir boleh tidak return payment_url untuk QRIS (hanya qr_string)
      paymentUrl = pakasirRes.data?.payment_url ?? undefined;
      vaNumber   = pakasirRes.data?.va_number ?? undefined;
      qrUrl      = pakasirRes.data?.qr_string ?? undefined;

      console.log(`${TAG} Pakasir OK | paymentUrl=${!!paymentUrl} qrUrl=${!!qrUrl} vaNumber=${!!vaNumber}`);
    } else {
      // ── Alur Manual/Crypto ───────────────────────────────────────────────────
      // Gunakan instruction dari DB sebagai panduan, bukan href
      instruction = paymentMethodRecord.instruction ?? `Silakan hubungi admin untuk instruksi pembayaran ${paymentMethodRecord.name}.`;
      console.log(`${TAG} Manual/Crypto method | instruction length=${instruction.length}`);
    }

    // ── Simpan transaksi ke DB ─────────────────────────────────────────────────
    try {
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
    } catch (dbErr: any) {
      console.error(`${TAG} DB Insert Error:`, dbErr);
      return NextResponse.json({ error: `Gagal menyimpan transaksi ke database: ${dbErr?.message ?? "Unknown DB error"}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentUrl,
      vaNumber,
      qrUrl,
      instruction,
      method: paymentMethodRecord.name,
      category: paymentMethodRecord.category,
      adminFee: Math.ceil(amount * paymentMethodRecord.adminFeePercent / 100),
    });

  } catch (error: any) {
    console.error(`${TAG} Unhandled error:`, error?.message ?? error);
    return NextResponse.json({ error: "Terjadi kesalahan server internal" }, { status: 500 });
  }
}

// GET — ambil metode aktif dari DB untuk wizard Step 2
export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true, name: true, code: true, category: true,
        adminFeePercent: true, estimasiMenit: true, iconUrl: true,
      },
    });
    return NextResponse.json({ methods });
  } catch {
    // Fallback jika DB belum ada data — tampilkan QRIS default
    return NextResponse.json({
      methods: [
        { id: "default_qris",   name: "QRIS",                  code: "qris",     category: "indonesia", adminFeePercent: 0.7, estimasiMenit: 2,  iconUrl: null },
        { id: "default_bca",    name: "BCA Virtual Account",    code: "bca_va",   category: "indonesia", adminFeePercent: 0,   estimasiMenit: 5,  iconUrl: null },
        { id: "default_bri",    name: "BRI Virtual Account",    code: "bri_va",   category: "indonesia", adminFeePercent: 0,   estimasiMenit: 5,  iconUrl: null },
        { id: "default_bni",    name: "BNI Virtual Account",    code: "bni_va",   category: "indonesia", adminFeePercent: 0,   estimasiMenit: 5,  iconUrl: null },
        { id: "default_usdt",   name: "USDT - TRC20",           code: "usdt_trc20", category: "crypto", adminFeePercent: 0.7, estimasiMenit: 10, iconUrl: null },
      ],
    });
  }
}
