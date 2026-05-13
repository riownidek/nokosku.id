import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

const TAG = "[Banding API]";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { targetNumber } = await req.json();
    if (!targetNumber || targetNumber.trim().length < 5)
      return NextResponse.json({ error: "Nomor target tidak valid" }, { status: 400 });

    // ── Ambil harga banding dari AppConfig ───────────────────────────────────
    const priceConfig = await prisma.appConfig.findUnique({ where: { key: "banding_price" } });
    const cost = parseFloat(priceConfig?.value ?? "500");

    // ── Cek saldo user ───────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (Number(user.balance) < cost)
      return NextResponse.json({ error: `Saldo tidak cukup. Dibutuhkan: Rp ${cost.toLocaleString("id-ID")}` }, { status: 402 });

    // ── Pilih SMTP aktif (rotasi berdasarkan usageCount vs dailyLimit) ───────
    const smtp = await prisma.smtpAccount.findFirst({
      where: { isActive: true },
      orderBy: { usageCount: "asc" },
    });
    if (!smtp)
      return NextResponse.json({ error: "Tidak ada akun pengirim email aktif. Hubungi admin." }, { status: 503 });

    if (smtp.usageCount >= smtp.dailyLimit) {
      // Coba cari yang lain
      const nextSmtp = await prisma.smtpAccount.findFirst({
        where: { isActive: true, id: { not: smtp.id } },
        orderBy: { usageCount: "asc" },
      });
      if (!nextSmtp)
        return NextResponse.json({ error: "Semua akun email pengirim telah mencapai limit harian." }, { status: 503 });
    }

    const activeSmtp = smtp.usageCount < smtp.dailyLimit ? smtp :
      await prisma.smtpAccount.findFirst({ where: { isActive: true, id: { not: smtp.id } }, orderBy: { usageCount: "asc" } });

    if (!activeSmtp)
      return NextResponse.json({ error: "Tidak ada SMTP tersedia." }, { status: 503 });

    // ── Kirim email via Nodemailer ────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: activeSmtp.host,
      port: activeSmtp.port,
      secure: false,
      auth: { user: activeSmtp.email, pass: activeSmtp.appPassword },
      tls: { rejectUnauthorized: false },
    });

    const mailBody = `saat saya login akun saya ada teks login tidak tersedia ${targetNumber.trim()}`;

    await transporter.sendMail({
      from: `"NOKOSKU Support" <${activeSmtp.email}>`,
      to: "support@support.whatsapp.com",
      subject: "Account Login Issue Report",
      text: mailBody,
      html: `<p>${mailBody}</p>`,
    });

    console.log(`${TAG} Email sent via ${activeSmtp.email} to support@support.whatsapp.com for ${targetNumber}`);

    // ── Potong saldo + catat riwayat (atomik) ────────────────────────────────
    await prisma.$transaction([
      prisma.user.update({ where: { id: session.user.id }, data: { balance: { decrement: cost } } }),
      prisma.transaction.create({
        data: { userId: session.user.id, amount: cost, type: "DEDUCTION", status: "SUCCESS", note: `Banding WhatsApp - ${targetNumber}` },
      }),
      prisma.bandingHistory.create({
        data: {
          userId: session.user.id,
          targetNumber: targetNumber.trim(),
          smtpId: activeSmtp.id,
          smtpEmail: activeSmtp.email,
          status: "SUCCESS",
          cost,
        },
      }),
      prisma.smtpAccount.update({ where: { id: activeSmtp.id }, data: { usageCount: { increment: 1 }, lastUsedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true, message: `Banding berhasil dikirim ke ${targetNumber}` });
  } catch (err: any) {
    console.error(`${TAG} Error:`, err?.message ?? err);

    // Catat gagal ke BandingHistory tanpa potong saldo
    try {
      await prisma.bandingHistory.create({
        data: {
          userId: session.user.id,
          targetNumber: "unknown",
          status: "FAILED",
          errorMessage: err?.message ?? "Unknown error",
          cost: 0,
        },
      });
    } catch {}

    return NextResponse.json({ error: "Gagal mengirim banding. Saldo tidak terpotong." }, { status: 500 });
  }
}
