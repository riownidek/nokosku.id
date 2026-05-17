import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function adminOnly(session: any) {
  return (session?.user as any)?.role === "ADMIN";
}

// PATCH — update layanan
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!adminOnly(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, code, emoji, isHot, sortOrder, isActive } = body;

  try {
    const svc = await prisma.otpService.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code.toLowerCase().trim() }),
        ...(emoji !== undefined && { emoji }),
        ...(isHot !== undefined && { isHot }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json(svc);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// DELETE — hapus layanan
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!adminOnly(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.otpService.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
