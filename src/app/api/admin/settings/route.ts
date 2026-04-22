import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/settings — ambil semua settings
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil settings" }, { status: 500 });
  }
}

// PATCH /api/admin/settings — update satu setting
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { key, value } = await req.json();
    if (!key || value === undefined)
      return NextResponse.json({ error: "key dan value wajib diisi" }, { status: 400 });

    const updated = await prisma.setting.update({
      where: { key },
      data: { value: String(value) },
    });

    return NextResponse.json({ success: true, setting: updated });
  } catch (error) {
    console.error("[Admin Settings PATCH]", error);
    return NextResponse.json({ error: "Gagal memperbarui setting" }, { status: 500 });
  }
}
