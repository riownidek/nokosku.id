/**
 * Pakasir Payment Gateway Client
 * Docs: https://app.pakasir.com
 *
 * CATATAN KEAMANAN:
 * - pakasir_api_key & pakasir_project dibaca eksklusif dari tabel AppConfig (key: 'pakasir_api_key', 'pakasir_project')
 * - Hapus process.env.PAKASIR_* dari Vercel jika sudah pindah ke DB
 * - return_url & callback_url tetap dari env karena bukan rahasia bisnis (URL publik)
 */

import { prisma } from "@/lib/prisma";

const PAKASIR_BASE = "https://app.pakasir.com/api";
const TAG = "[Pakasir]";

// ─── In-memory cache 60s ───────────────────────────────────────────────────
let _cachedApiKey: string | null = null;
let _cachedProject: string | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000;

async function getPakasirCredentials(): Promise<{ apiKey: string; project: string }> {
  const now = Date.now();
  if (_cachedApiKey && _cachedProject && now - _cacheTime < CACHE_TTL) {
    return { apiKey: _cachedApiKey, project: _cachedProject };
  }

  try {
    const [keyConfig, projectConfig] = await Promise.all([
      prisma.appConfig.findFirst({ where: { key: "pakasir_api_key" } }),
      prisma.appConfig.findFirst({ where: { key: "pakasir_project" } }),
    ]);
    _cachedApiKey  = keyConfig?.value?.trim()    ?? "";
    _cachedProject = projectConfig?.value?.trim() ?? "";
    _cacheTime = now;
  } catch (err) {
    console.error(`${TAG} Gagal membaca credentials dari DB:`, err);
    throw new Error("Gagal membaca konfigurasi Pakasir dari database. Periksa koneksi DB.");
  }

  if (!_cachedApiKey) {
    throw new Error(
      "API Key Pakasir belum dikonfigurasi. " +
      "Masuk Panel Admin → App Config → isi nilai untuk 'pakasir_api_key'."
    );
  }
  if (!_cachedProject) {
    throw new Error(
      "Kode Project Pakasir belum dikonfigurasi. " +
      "Masuk Panel Admin → App Config → isi nilai untuk 'pakasir_project'."
    );
  }

  console.log(`${TAG} Credentials berhasil dimuat dari AppConfig.`);
  return { apiKey: _cachedApiKey, project: _cachedProject };
}

export type PakasirMethod =
  | "qris" | "bca_va" | "bni_va" | "bri_va" | "mandiri_va"
  | "permata_va" | "cimb_va" | "danamon_va" | "ovo" | "dana" | "gopay" | "shopeepay";

export interface PakasirCreatePayload {
  project: string;
  order_id: string;
  amount: number;
  api_key: string;
  customer_name?: string;
  customer_email?: string;
  return_url?: string;
  callback_url?: string;
}

export interface PakasirCreateResponse {
  status: boolean;
  message: string;
  data?: {
    order_id: string;
    payment_url: string;
    va_number?: string;
    qr_string?: string;
    expired_at?: string;
  };
}

export interface PakasirCheckResponse {
  status: boolean;
  data?: {
    order_id: string;
    amount: number;
    status: string; // "pending" | "success" | "failed" | "expired"
    paid_at?: string;
  };
}

/** Daftar metode pembayaran yang didukung Pakasir */
export const PAKASIR_PAYMENT_METHODS = [
  { value: "qris",        label: "QRIS",                   icon: "qris" },
  { value: "bca_va",      label: "BCA Virtual Account",    icon: "bca" },
  { value: "bni_va",      label: "BNI Virtual Account",    icon: "bni" },
  { value: "bri_va",      label: "BRI Virtual Account",    icon: "bri" },
  { value: "mandiri_va",  label: "Mandiri Virtual Account", icon: "mandiri" },
  { value: "permata_va",  label: "Permata Virtual Account", icon: "permata" },
  { value: "cimb_va",     label: "CIMB Virtual Account",   icon: "cimb" },
] as const;

/**
 * Buat transaksi deposit di Pakasir.
 * Throws jika API key tidak dikonfigurasi atau Pakasir mengembalikan error.
 */
export async function createPakasirDeposit(
  method: PakasirMethod,
  orderId: string,
  amount: number,
  extra?: { customerName?: string; customerEmail?: string }
): Promise<PakasirCreateResponse> {
  // Akan throw jika key kosong atau DB error
  const { apiKey, project } = await getPakasirCredentials();

  const payload: PakasirCreatePayload = {
    project,
    order_id: orderId,
    amount,
    api_key: apiKey,
    customer_name: extra?.customerName,
    customer_email: extra?.customerEmail,
    return_url: process.env.PAKASIR_RETURN_URL ?? `${process.env.NEXTAUTH_URL ?? ""}/deposit`,
    callback_url: process.env.PAKASIR_CALLBACK_URL ?? `${process.env.NEXTAUTH_URL ?? ""}/api/webhooks/pakasir`,
  };

  console.log(`${TAG} Creating deposit: ${method} | orderId=${orderId} | amount=${amount}`);

  let res: Response;
  try {
    res = await fetch(`${PAKASIR_BASE}/transactioncreate/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (networkErr: any) {
    console.error(`${TAG} Network error:`, networkErr?.message);
    throw new Error(`Pakasir tidak dapat dihubungi: ${networkErr?.message ?? "Network error"}`);
  }

  if (!res.ok) {
    let errBody = "(no body)";
    try { errBody = await res.text(); } catch {}
    const errMsg = `Pakasir API Error [${res.status} ${res.statusText}]: ${errBody}`;
    console.error(`${TAG} ${errMsg}`);
    throw new Error(errMsg);
  }

  const data: PakasirCreateResponse = await res.json();
  console.log(`${TAG} Response: status=${data.status} msg=${data.message}`);
  return data;
}

/**
 * Verifikasi status transaksi di Pakasir (cross-check webhook sebelum update saldo).
 * Throws jika API key tidak dikonfigurasi atau Pakasir mengembalikan error.
 */
export async function verifyPakasirTransaction(orderId: string): Promise<PakasirCheckResponse> {
  const { apiKey, project } = await getPakasirCredentials();

  let res: Response;
  try {
    res = await fetch(`${PAKASIR_BASE}/transactioncheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, order_id: orderId, api_key: apiKey }),
    });
  } catch (networkErr: any) {
    throw new Error(`Pakasir verify tidak dapat dihubungi: ${networkErr?.message ?? "Network error"}`);
  }

  if (!res.ok) {
    let errBody = "(no body)";
    try { errBody = await res.text(); } catch {}
    throw new Error(`Pakasir verify Error [${res.status} ${res.statusText}]: ${errBody}`);
  }

  return res.json();
}
