import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { newEmail, password } = await req.json();

    if (!newEmail || !password)
      return NextResponse.json({ error: "Semua kolom wajib diisi" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });

    // Cek apakah email sudah dipakai
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing)
      return NextResponse.json({ error: "Email sudah digunakan akun lain" }, { status: 409 });

    // Verifikasi password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password)
      return NextResponse.json({ error: "Akun ini menggunakan login Google. Tidak bisa ubah email di sini." }, { status: 400 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return NextResponse.json({ error: "Password salah" }, { status: 400 });

    await prisma.user.update({ where: { id: session.user.id }, data: { email: newEmail.trim() } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah email" }, { status: 500 });
  }
}
