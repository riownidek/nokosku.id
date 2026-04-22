/**
 * Pakasir Payment Gateway Client
 * Docs: https://app.pakasir.com
 */

const PAKASIR_BASE = "https://app.pakasir.com/api";
const PROJECT = process.env.PAKASIR_PROJECT!;
const API_KEY = process.env.PAKASIR_API_KEY!;

export type PakasirMethod =
  | "qris"
  | "bca_va"
  | "bni_va"
  | "bri_va"
  | "mandiri_va"
  | "permata_va"
  | "cimb_va"
  | "danamon_va"
  | "ovo"
  | "dana"
  | "gopay"
  | "shopeepay";

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

/** Daftar VA bank yang didukung Pakasir dengan label */
export const PAKASIR_PAYMENT_METHODS = [
  { value: "qris", label: "QRIS", icon: "qris" },
  { value: "bca_va", label: "BCA Virtual Account", icon: "bca" },
  { value: "bni_va", label: "BNI Virtual Account", icon: "bni" },
  { value: "bri_va", label: "BRI Virtual Account", icon: "bri" },
  { value: "mandiri_va", label: "Mandiri Virtual Account", icon: "mandiri" },
  { value: "permata_va", label: "Permata Virtual Account", icon: "permata" },
  { value: "cimb_va", label: "CIMB Virtual Account", icon: "cimb" },
] as const;

/**
 * Buat transaksi deposit di Pakasir
 */
export async function createPakasirDeposit(
  method: PakasirMethod,
  orderId: string,
  amount: number,
  extra?: { customerName?: string; customerEmail?: string }
): Promise<PakasirCreateResponse> {
  if (API_KEY === "MOCK") {
    console.log("[MOCK PAKASIR] Create:", method, orderId, amount);
    return {
      status: true,
      message: "Success (MOCK)",
      data: {
        order_id: orderId,
        payment_url: "https://mock.pakasir.com/pay",
        va_number: method.includes("va") ? "88" + Math.floor(Math.random() * 100000) : undefined,
        qr_string: method === "qris" ? "00020101021226590014ID.CO.QRIS.WWW..." : undefined,
      }
    } as any;
  }

  const payload: PakasirCreatePayload = {
    project: PROJECT,
    order_id: orderId,
    amount,
    api_key: API_KEY,
    customer_name: extra?.customerName,
    customer_email: extra?.customerEmail,
    return_url: process.env.PAKASIR_RETURN_URL,
    callback_url: process.env.PAKASIR_CALLBACK_URL,
  };

  const res = await fetch(`${PAKASIR_BASE}/transactioncreate/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Pakasir API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Verifikasi status transaksi di Pakasir (cross-check sebelum update saldo)
 */
export async function verifyPakasirTransaction(
  orderId: string
): Promise<PakasirCheckResponse> {
  if (API_KEY === "MOCK") {
    return {
      status: true,
      data: {
        order_id: orderId,
        amount: 10000,
        status: "success",
      }
    };
  }

  const res = await fetch(`${PAKASIR_BASE}/transactioncheck`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: PROJECT,
      order_id: orderId,
      api_key: API_KEY,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pakasir verify error: ${res.status}`);
  }

  return res.json();
}
