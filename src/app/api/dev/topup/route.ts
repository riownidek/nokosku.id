import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DEV-ONLY endpoint untuk simulasi deposit berhasil
// HAPUS SEBELUM DEPLOY ke production!
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount = 100000 } = await req.json().catch(() => ({}));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount,
        type: "DEPOSIT",
        status: "SUCCESS",
        note: "⚡ Test deposit (DEV ONLY)",
        paymentMethod: "dev_topup",
      },
    }),
  ]);

  return NextResponse.json({ success: true, added: amount });
}
