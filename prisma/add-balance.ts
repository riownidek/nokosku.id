import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { email: "admin@rumahotp.io" },
    data: { balance: 500000 },
  });
  
  const admin = await prisma.user.findUnique({ where: { email: "admin@rumahotp.io" } });
  console.log("✅ Admin balance updated:", admin?.balance);
  console.log("📧 Email:", admin?.email);
  console.log("🔑 Password: admin123!");
  console.log("👤 Role:", admin?.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
