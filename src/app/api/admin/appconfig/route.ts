import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/appconfig
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const configs = await prisma.appConfig.findMany({ orderBy: { group: "asc" } });
    return NextResponse.json(configs);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil konfigurasi" }, { status: 500 });
  }
}

// PATCH /api/admin/appconfig — upsert single config
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { key, value, label, group } = await req.json();
    if (!key || value === undefined)
      return NextResponse.json({ error: "key dan value wajib diisi" }, { status: 400 });

    const config = await prisma.appConfig.upsert({
      where: { key },
      update: { value: String(value), label, group },
      create: { key, value: String(value), label: label ?? key, group: group ?? "general" },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("[AppConfig PATCH]", error);
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi" }, { status: 500 });
  }
}
