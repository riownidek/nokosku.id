import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TAG = "[PPOB Order]";

/**
 * POST /api/ppob/order
 *
 * Menerima hasil pesanan yang sudah dibuat oleh klien secara langsung ke Jagoanpedia
 * (karena server IP diblokir Cloudflare, order dibuat dari browser pengguna).
 *
 * Body: {
 *   serviceId: string       — ID layanan Jagoanpedia
 *   serviceName: string     — nama produk
 *   target: string          — nomor/ID tujuan
 *   providerOrderId: string — ID order dari Jagoanpedia (sudah terbuat di sisi klien)
 *   providerStatus: string  — status awal dari Jagoanpedia (pending/success/failed)
 *   baseCost: number        — harga asli dari Jagoanpedia
 *   displayPrice: number    — harga yang disepakati pengguna (base + margin)
 *   sn?: string             — serial number / kode hasil (jika sudah ada)
 * }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const {
      serviceId,
      serviceName,
      target,
      providerOrderId,
      providerStatus,
      baseCost,
      displayPrice,
      sn,
    } = await req.json();

    if (!serviceId || !serviceName || !target || !providerOrderId || displayPrice === undefined) {
      return NextResponse.json(
        { error: "serviceId, serviceName, target, providerOrderId, dan displayPrice wajib diisi" },
        { status: 400 }
      );
    }

    const price = Number(displayPrice);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "displayPrice tidak valid" }, { status: 400 });
    }

    // ── Ambil margin dari settings untuk verifikasi harga minimal ────────────
    const marginSetting = await prisma.setting.findUnique({
      where: { key: "markup_ppob_percent" },
    });
    const marginAmount = parseFloat(marginSetting?.value ?? "0");
    const expectedMin = Number(baseCost) + marginAmount;

    // Tolak jika klien mengirim harga lebih murah dari seharusnya (anti-cheat)
    if (price < expectedMin) {
      console.warn(`${TAG} Price mismatch: sent=${price} expectedMin=${expectedMin}`);
      return NextResponse.json(
        { error: `Harga tidak valid. Minimum: ${expectedMin}` },
        { status: 400 }
      );
    }

    // ── Cek saldo pengguna ────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });
    if (!user || Number(user.balance) < price) {
      return NextResponse.json(
        { error: `Saldo tidak cukup. Dibutuhkan ${price}, saldo Anda ${user?.balance ?? 0}` },
        { status: 402 }
      );
    }

    console.log(`${TAG} Recording order user=${session.user.id} service=${serviceId} providerOrderId=${providerOrderId} price=${price}`);

    // ── Potong saldo secara atomik menggunakan Prisma (bypass RLS otomatis) ─
    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: price } },
      });
    } catch (balanceErr) {
      console.error(`${TAG} Balance deduction failed:`, balanceErr);
      throw new Error("Gagal memotong saldo. Hubungi admin.");
    }

    // ── Simpan order ke DB ────────────────────────────────────────────────────
    const finalStatus = String(providerStatus ?? "").toUpperCase() === "SUCCESS"
      ? "COMPLETED"
      : String(providerStatus ?? "").toUpperCase() === "FAILED"
      ? "FAILED"
      : "PENDING";

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        providerOrderId: String(providerOrderId),
        targetData: target,
        serviceCategory: "PPOB",
        productName: serviceName,
        status: finalStatus,
        cost: price,
        baseCost: Number(baseCost) || price,
        resultData: sn ?? null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 jam
      },
    });

    // ── Catat transaksi ───────────────────────────────────────────────────────
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: price,
        type: "DEDUCTION",
        status: "SUCCESS",
        note: `Pembelian PPOB: ${serviceName} → ${target}`,
      },
    });

    console.log(`${TAG} Success: orderId=${order.id}`);
    return NextResponse.json({ success: true, order, newBalance });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err);
    return NextResponse.json(
      { error: err.message ?? "Gagal merekam pesanan PPOB" },
      { status: 500 }
    );
  }
}
