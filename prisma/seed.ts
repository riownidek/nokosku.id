import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NOKOSKU database...");

  // ─── Default Settings ─────────────────────────────────────────────────────
  const defaultSettings = [
    { key: "site_name",                   value: "NOKOSKU",  description: "Nama situs platform" },
    { key: "markup_percent",              value: "10",       description: "Persentase markup harga OTP dan PPOB (%)" },
    { key: "referral_commission_percent", value: "5",        description: "Persentase komisi referral dari deposit (%)" },
    { key: "min_deposit",                 value: "10000",    description: "Minimum deposit (Rupiah)" },
    { key: "max_deposit",                 value: "10000000", description: "Maksimum deposit (Rupiah)" },
    { key: "otp_timeout_minutes",         value: "15",       description: "Timeout maksimal OTP (menit)" },
    { key: "maintenance_mode",            value: "false",    description: "Mode pemeliharaan (true/false)" },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { description: s.description },
      create: s,
    });
  }
  console.log("✅ Settings seeded");

  // ─── AppConfig (API Keys & Konfigurasi Aplikasi) ─────────────────────────
  // PENTING: Ganti value placeholder di bawah dengan kunci API asli Anda
  // melalui Panel Admin → App Config setelah login sebagai admin.
  const defaultConfigs = [
    { key: "rumahotp_api_key",  value: "",    label: "API Key RumahOTP",            group: "api" },
    { key: "pakasir_api_key",   value: "",    label: "API Key Pakasir",              group: "api" },
    { key: "pakasir_project",   value: "",    label: "Kode Project Pakasir",         group: "api" },
    { key: "banding_price",     value: "500", label: "Harga Layanan Banding (Rp)",  group: "general" },
    { key: "site_logo_url",     value: "",    label: "URL Logo Situs",               group: "general" },
    { key: "banner_image_url",  value: "",    label: "URL Banner Dashboard",         group: "general" },
  ];

  for (const c of defaultConfigs) {
    await prisma.appConfig.upsert({
      where: { key: c.key },
      update: { label: c.label },
      create: { key: c.key, value: c.value, label: c.label, group: c.group },
    });
  }
  console.log("✅ AppConfig seeded (rumahotp_api_key, pakasir_api_key, pakasir_project, banding_price)");

  // ─── Admin Account ─────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nokosku.com" },
    update: { password: hashedPassword, name: "Administrator", role: "ADMIN" },
    create: {
      email: "admin@nokosku.com",
      password: hashedPassword,
      name: "Administrator",
      role: "ADMIN",
      referralCode: "NOKOSKU01",
      balance: 500000,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ─── Demo User ─────────────────────────────────────────────────────────────
  const demoPass = await bcrypt.hash("demo1234", 12);
  const demo = await prisma.user.upsert({
    where: { email: "demo@nokosku.com" },
    update: {},
    create: {
      email: "demo@nokosku.com",
      password: demoPass,
      name: "Demo User",
      role: "USER",
      referralCode: "DEMO001",
      balance: 100000,
    },
  });
  console.log(`✅ Demo user created: ${demo.email}`);

  console.log("\n🎉 Seeding NOKOSKU selesai!");
  console.log("══════════════════════════════════════════");
  console.log("🔑 KREDENSIAL LOGIN:");
  console.log("   Admin  : admin@nokosku.com  / Admin123!");
  console.log("   Demo   : demo@nokosku.com   / demo1234");
  console.log("══════════════════════════════════════════");
  console.log("⚠️  SELANJUTNYA:");
  console.log("   1. Login sebagai admin di /login");
  console.log("   2. Buka Panel Admin → App Config");
  console.log("   3. Isi: pakasir_api_key, pakasir_project, rumahotp_api_key");
  console.log("══════════════════════════════════════════");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
