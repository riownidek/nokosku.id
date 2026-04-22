import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NOKOSKU database...");

  // ─── Default Settings ───────────────────────────────────────────────────────
  const defaultSettings = [
    { key: "site_name", value: "NOKOSKU", description: "Nama situs platform" },
    { key: "markup_percent", value: "10", description: "Persentase markup harga OTP dan PPOB (%)" },
    { key: "referral_commission_percent", value: "5", description: "Persentase komisi referral dari deposit (%)" },
    { key: "min_deposit", value: "10000", description: "Minimum deposit (Rupiah)" },
    { key: "max_deposit", value: "10000000", description: "Maksimum deposit (Rupiah)" },
    { key: "otp_timeout_minutes", value: "15", description: "Timeout maksimal OTP (menit)" },
    { key: "maintenance_mode", value: "false", description: "Mode pemeliharaan (true/false)" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { description: setting.description },
      create: setting,
    });
  }
  console.log("✅ Settings seeded");

  // ─── Admin Account ───────────────────────────────────────────────────────────
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
  console.log(`✅ Admin: ${admin.email} (saldo: Rp ${admin.balance.toLocaleString("id-ID")})`);

  // ─── Demo User ───────────────────────────────────────────────────────────────
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
  console.log(`✅ Demo user: ${demo.email}`);

  console.log("\n🎉 Seeding NOKOSKU selesai!");
  console.log("─────────────────────────────────────");
  console.log("Admin  : admin@nokosku.com / Admin123!");
  console.log("Demo   : demo@nokosku.com  / demo1234");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
