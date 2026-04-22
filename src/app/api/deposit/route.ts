import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createPakasirDeposit, PAKASIR_PAYMENT_METHODS } from "@/lib/pakasir";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const depositSchema = z.object({
  amount: z.number().min(10000, "Minimum deposit Rp 10.000"),
  method: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validasi gagal" },
        { status: 400 }
      );
    }

    const { amount, method } = parsed.data;

    // Validasi method pembayaran
    const validMethods = PAKASIR_PAYMENT_METHODS.map((m) => m.value);
    if (!validMethods.includes(method as any)) {
      return NextResponse.json(
        { error: "Metode pembayaran tidak valid" },
        { status: 400 }
      );
    }

    // Cek min/max dari settings
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["min_deposit", "max_deposit"] } },
    });
    const minDeposit = parseInt(
      settings.find((s) => s.key === "min_deposit")?.value ?? "10000"
    );
    const maxDeposit = parseInt(
      settings.find((s) => s.key === "max_deposit")?.value ?? "10000000"
    );

    if (amount < minDeposit || amount > maxDeposit) {
      return NextResponse.json(
        {
          error: `Deposit harus antara Rp ${minDeposit.toLocaleString("id-ID")} - Rp ${maxDeposit.toLocaleString("id-ID")}`,
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const orderId = `DEP-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Buat transaksi di Pakasir
    const pakasirRes = await createPakasirDeposit(
      method as any,
      orderId,
      amount,
      { customerName: user?.name ?? undefined, customerEmail: user?.email }
    );

    if (!pakasirRes.status || !pakasirRes.data?.payment_url) {
      return NextResponse.json(
        { error: pakasirRes.message ?? "Gagal membuat transaksi pembayaran" },
        { status: 400 }
      );
    }

    // Simpan transaksi ke DB
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount,
        status: "PENDING",
        type: "DEPOSIT",
        gatewayReference: orderId,
        paymentMethod: method,
        paymentUrl: pakasirRes.data.payment_url,
      },
    });

    return NextResponse.json({
      success: true,
      paymentUrl: pakasirRes.data.payment_url,
      orderId,
      vaNumber: pakasirRes.data.va_number,
      qrString: pakasirRes.data.qr_string,
    });
  } catch (error) {
    console.error("[Deposit]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ methods: PAKASIR_PAYMENT_METHODS });
}
