/**
 * Seed default PaymentMethod ke tabel payment_methods
 * Jalankan sekali: npx dotenv-cli -e .env.temp -- npx tsx prisma/seed-payment-methods.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding PaymentMethod...");

  const methods = [
    // ── Indonesia (via Pakasir) ──────────────────────────────────────────────
    {
      name: "QRIS",
      code: "qris",
      category: "indonesia",
      adminFeePercent: 0.7,
      estimasiMenit: 2,
      isActive: true,
      sortOrder: 1,
      instruction: "Scan kode QR menggunakan aplikasi m-banking atau e-wallet Anda.",
    },
    {
      name: "BCA Virtual Account",
      code: "bca_va",
      category: "indonesia",
      adminFeePercent: 0,
      estimasiMenit: 5,
      isActive: true,
      sortOrder: 2,
      instruction: "Transfer ke nomor Virtual Account BCA yang ditampilkan. Konfirmasi otomatis dalam 5 menit.",
    },
    {
      name: "BRI Virtual Account",
      code: "bri_va",
      category: "indonesia",
      adminFeePercent: 0,
      estimasiMenit: 5,
      isActive: true,
      sortOrder: 3,
      instruction: "Transfer ke nomor Virtual Account BRI yang ditampilkan. Konfirmasi otomatis dalam 5 menit.",
    },
    {
      name: "BNI Virtual Account",
      code: "bni_va",
      category: "indonesia",
      adminFeePercent: 0,
      estimasiMenit: 5,
      isActive: true,
      sortOrder: 4,
      instruction: "Transfer ke nomor Virtual Account BNI yang ditampilkan. Konfirmasi otomatis dalam 5 menit.",
    },
    {
      name: "Mandiri Virtual Account",
      code: "mandiri_va",
      category: "indonesia",
      adminFeePercent: 0,
      estimasiMenit: 5,
      isActive: true,
      sortOrder: 5,
      instruction: "Transfer ke nomor Virtual Account Mandiri yang ditampilkan. Konfirmasi otomatis dalam 5 menit.",
    },
    // ── Crypto (manual, tidak via Pakasir) ───────────────────────────────────
    {
      name: "USDT - TRC20",
      code: "usdt_trc20",
      category: "crypto",
      adminFeePercent: 0.7,
      estimasiMenit: 10,
      isActive: true,
      sortOrder: 10,
      instruction: "Kirim USDT via jaringan TRC20 ke alamat berikut:\n\n[ISI ALAMAT WALLET TRC20 ANDA DI SINI]\n\nSetelah transfer, hubungi admin dengan bukti TX Hash untuk konfirmasi saldo.",
    },
  ];

  for (const m of methods) {
    const result = await prisma.paymentMethod.upsert({
      where: { code: m.code },
      update: { name: m.name, adminFeePercent: m.adminFeePercent, estimasiMenit: m.estimasiMenit, sortOrder: m.sortOrder, instruction: m.instruction },
      create: m,
    });
    console.log(`  ✅ ${result.name} (${result.code}) — ${result.category}`);
  }

  console.log("\n🎉 PaymentMethod seeding selesai!");
  console.log("──────────────────────────────────────────────────────");
  console.log("⚠️  LANGKAH SELANJUTNYA:");
  console.log("   1. Login admin → Panel Admin → App Config");
  console.log("   2. Isi: pakasir_api_key  → API Key dari dashboard Pakasir");
  console.log("      Isi: pakasir_project  → Kode Project dari dashboard Pakasir");
  console.log("      Isi: rumahotp_api_key → API Key dari RumahOTP");
  console.log("   3. Untuk USDT, edit instruksi di Panel Admin → Payment Methods");
  console.log("──────────────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
