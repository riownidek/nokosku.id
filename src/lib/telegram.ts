/**
 * Telegram Notification Utility
 * Mengirim pesan notifikasi ke Telegram Bot secara asinkron
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Kirim pesan teks ke Telegram (async, tidak blokir)
 */
export async function sendTelegramMessage(
  text: string,
  chatId?: string
): Promise<void> {
  try {
    const targetChat = chatId ?? CHAT_ID;
    if (!BOT_TOKEN || !targetChat) return;

    await fetch(`${TG_API}/sendMessage`, {
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
