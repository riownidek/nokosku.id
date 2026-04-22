import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardAnimations } from "./dashboard-animations";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, balance: true, referralCode: true },
  });

  const recentOrders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      productName: true,
      targetData: true,
      status: true,
      cost: true,
      serviceCategory: true,
      createdAt: true,
    },
  });

  const statsGroups = await prisma.order.groupBy({
    by: ["status"],
    where: { userId: session.user.id },
    _count: { id: true },
  });

  const totalOrders = statsGroups.reduce((s, g) => s + g._count.id, 0);
  const successOrders = statsGroups
    .filter((g) => g.status === "SUCCESS" || g.status === "COMPLETED")
    .reduce((s, g) => s + g._count.id, 0);

  const jakartaHour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  ).getHours();
  const greet =
    jakartaHour < 12
      ? "Selamat Pagi"
      : jakartaHour < 17
      ? "Selamat Siang"
      : "Selamat Malam";

  // Serialize cost to number (Prisma Decimal → number)
  const serializedOrders = recentOrders.map((o) => ({
    ...o,
    cost: Number(o.cost),
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <DashboardAnimations
      greet={greet}
      userName={user?.name ?? session.user?.email ?? ""}
      balance={Number(user?.balance ?? 0)}
      totalOrders={totalOrders}
      successOrders={successOrders}
      referralCode={user?.referralCode ?? "—"}
      recentOrders={serializedOrders}
    />
  );
}
