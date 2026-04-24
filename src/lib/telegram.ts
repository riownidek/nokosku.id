/**
 * Telegram Notification Utility
 * Mengirim pesan notifikasi ke Telegram Bot secara asinkron
 */

import { prisma } from "@/lib/prisma";

/**
 * Kirim pesan teks ke Telegram (async, tidak blokir).
 * Konfigurasi diambil dari AppConfig.
 */
export async function sendTelegramMessage(
  text: string,
  chatIdOverride?: string
): Promise<void> {
  try {
    const config = await prisma.appConfig.findMany({
      where: { key: { in: ["telegram_bot_token", "telegram_chat_id"] } },
    });

    const token = config.find((c) => c.key === "telegram_bot_token")?.value?.trim();
    const chatIdDb = config.find((c) => c.key === "telegram_chat_id")?.value?.trim();

    const targetChat = chatIdOverride ?? chatIdDb;

    if (!token || !targetChat) {
      console.warn("[Telegram] Token atau Chat ID belum dikonfigurasi di AppConfig.");
      return;
    }

    const tgApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(tgApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChat,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    // Jangan sampai notifikasi gagal ikut blokir flow utama
    console.error("[Telegram] Failed to send message:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Pesan
// ─────────────────────────────────────────────────────────────────────────────

export function depositSuccessMessage(params: {
  userName: string;
  email: string;
  amount: number;
  method: string;
  orderId: string;
  newBalance: number;
}): string {
  return [
    `✅ *Deposit Berhasil*`,
    ``,
    `👤 User: ${params.userName} (${params.email})`,
    `💳 Metode: ${params.method.toUpperCase()}`,
    `💰 Jumlah: *Rp ${params.amount.toLocaleString("id-ID")}*`,
    `🏦 Saldo Baru: Rp ${params.newBalance.toLocaleString("id-ID")}`,
    `🔖 Order ID: \`${params.orderId}\``,
    `📅 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
  ].join("\n");
}

export function orderCompletedMessage(params: {
  userName: string;
  email: string;
  productName: string;
  category: string;
  targetData: string;
  resultData: string;
  cost: number;
  orderId: string;
}): string {
  const emoji = params.category === "OTP" ? "📱" : "🛒";
  return [
    `${emoji} *Pesanan Selesai — ${params.category}*`,
    ``,
    `👤 User: ${params.userName} (${params.email})`,
    `📦 Produk: ${params.productName}`,
    `🎯 Target: \`${params.targetData}\``,
    `🔑 Hasil: \`${params.resultData}\``,
    `💰 Biaya: Rp ${params.cost.toLocaleString("id-ID")}`,
    `🔖 Order ID: \`${params.orderId}\``,
    `📅 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
  ].join("\n");
}

export function newUserRegisteredMessage(params: {
  name: string;
  email: string;
}): string {
  return [
    `🆕 *Pengguna Baru Terdaftar*`,
    ``,
    `👤 Nama: ${params.name}`,
    `📧 Email: ${params.email}`,
    `📅 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
  ].join("\n");
}
