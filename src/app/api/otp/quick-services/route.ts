import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public API — digunakan oleh halaman OTP user untuk mengambil layanan pilihan cepat
export async function GET() {
  try {
    const services = await prisma.otpService.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, code: true, emoji: true, isHot: true },
    });
    return NextResponse.json(services, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Fallback: jika tabel belum ada, kembalikan default
    return NextResponse.json([
      { id: "1", code: "wa",  name: "WhatsApp",  emoji: "💬", isHot: false },
      { id: "2", code: "tg",  name: "Telegram",  emoji: "✈️", isHot: false },
      { id: "3", code: "ig",  name: "Instagram", emoji: "📸", isHot: false },
      { id: "4", code: "lf",  name: "TikTok",    emoji: "🎵", isHot: false },
      { id: "5", code: "go",  name: "Gmail",     emoji: "📧", isHot: false },
      { id: "6", code: "fb",  name: "Facebook",  emoji: "👍", isHot: false },
      { id: "7", code: "mnt", name: "Kopi Kenangan", emoji: "☕", isHot: true },
      { id: "8", code: "tp",  name: "Tokopedia", emoji: "🛍️", isHot: false },
    ]);
  }
}
