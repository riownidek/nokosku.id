import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function adminOnly(session: any) {
  return (session?.user as any)?.role === "ADMIN";
}

// GET — ambil semua layanan
export async function GET(req: Request) {
  const session = await auth();
  if (!adminOnly(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const services = await prisma.otpService.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(services);
}

// POST — tambah layanan baru
export async function POST(req: Request) {
  const session = await auth();
  if (!adminOnly(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, code, emoji, isHot, sortOrder } = body;

  if (!name || !code) return NextResponse.json({ error: "name dan code wajib diisi" }, { status: 400 });

  try {
    const svc = await prisma.otpService.create({
      data: { name, code: code.toLowerCase().trim(), emoji: emoji || "📱", isHot: !!isHot, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json(svc, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Kode layanan sudah ada" }, { status: 409 });
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
