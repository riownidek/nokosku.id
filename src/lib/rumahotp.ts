/**
 * RumahOTP API Client
 * Base URL: https://www.rumahotp.io/api
 * Rate limit: 5 requests per 10 seconds → use 2s delay between calls
 */

const BASE_URL = "https://www.rumahotp.io/api";
const API_KEY = process.env.RUMAHOTP_API_KEY!;

const headers = {
  "x-apikey": API_KEY,
  accept: "application/json",
  "Content-Type": "application/json",
};

/** Safe delay to respect rate limiting (2 seconds) */
export const rateLimitDelay = () =>
  new Promise((resolve) => setTimeout(resolve, 2000));

/** Generic fetch wrapper with error handling */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  if (API_KEY === "MOCK") {
    if (endpoint.includes("/services")) return [{ name: "WhatsApp", code: "wa", price: 1000 }] as any;
    if (endpoint.includes("/countries")) return [{ id: 1, name: "Indonesia", code: "id" }] as any;
    if (endpoint.includes("/operators")) return [{ id: 1, name: "Telkomsel", code: "tsel" }] as any;
    if (endpoint.includes("/get_status")) return { id: "123", number: "081234567890", status: "success", sms: "Your OTP is 998877" } as any;
    if (endpoint.includes("/set_status")) return { success: true } as any;
    if (endpoint === "/v2/orders") return { id: "123-" + Date.now(), number: "081234"+Math.floor(Math.random()*100000), status: "active", price: 1000 } as any;
    if (endpoint.includes("/h2h/product")) return [{ product_code: "PULSA10", product_name: "Pulsa 10k", category: "PULSA", price: 10500 }] as any;
    if (endpoint.includes("/h2h/transaksi/create")) return { trx_id: "trx-" + Date.now(), status: "success", sn: "SN-123456", price: 10500 } as any;
    if (endpoint.includes("/balance")) return { balance: 999999 } as any;
    return {} as any;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options?.headers ?? {}) },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RumahOTP API Error [${res.status}]: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface OTPService {
  name: string;
  code: string;
  price: number;
}

export interface OTPCountry {
  id: number;
  name: string;
  code: string;
}

export interface OTPOperator {
  id: number;
  name: string;
  code: string;
}

export interface OTPOrder {
  id: string;
  number: string;
  status: string;
  sms?: string;
  expires_at?: string;
}

/** GET /v2/services — Daftar layanan OTP beserta harga */
export async function getOTPServices(): Promise<OTPService[]> {
  return apiFetch<OTPService[]>("/v2/services");
}

/** GET /v2/countries — Daftar negara yang tersedia */
export async function getOTPCountries(): Promise<OTPCountry[]> {
  return apiFetch<OTPCountry[]>("/v2/countries");
}

/** GET /v2/operators?country={country} — Daftar operator berdasarkan negara */
export async function getOTPOperators(country: string): Promise<OTPOperator[]> {
  return apiFetch<OTPOperator[]>(`/v2/operators?country=${country}`);
}

/** POST /v2/orders — Beli nomor OTP */
export async function buyOTPNumber(params: {
  service: string;
  country: string;
  operator?: string;
}): Promise<OTPOrder> {
  return apiFetch<OTPOrder>("/v2/orders", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** GET /v1/orders/get_status?id={orderId} — Polling status SMS */
export async function getOTPStatus(orderId: string): Promise<OTPOrder> {
  return apiFetch<OTPOrder>(`/v1/orders/get_status?id=${orderId}`);
}

/** POST /v1/orders/set_status — Batalkan pesanan OTP */
export async function cancelOTPOrder(
  orderId: string,
  status: "cancel" | "finish"
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/v1/orders/set_status", {
    method: "POST",
    body: JSON.stringify({ id: orderId, status }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PPOB / H2H ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface H2HProduct {
  product_code: string;
  product_name: string;
  category: string;
  price: number;
  description?: string;
}

export interface H2HOrderResponse {
  trx_id: string;
  product_code: string;
  target: string;
  status: string;
  sn?: string;
  price: number;
  message?: string;
}

/** GET /v1/h2h/product?category={cat} — Daftar produk PPOB */
export async function getH2HProducts(category?: string): Promise<H2HProduct[]> {
  const query = category ? `?category=${category}` : "";
  return apiFetch<H2HProduct[]>(`/v1/h2h/product${query}`);
}

/** POST /v1/h2h/transaksi/create — Eksekusi pesanan PPOB */
export async function createH2HOrder(params: {
  product_code: string;
  target: string;
  ref_id: string;
}): Promise<H2HOrderResponse> {
  return apiFetch<H2HOrderResponse>("/v1/h2h/transaksi/create", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** GET /v1/h2h/transaksi/status?trx_id={id} — Cek status pesanan PPOB */
export async function checkH2HStatus(trxId: string): Promise<H2HOrderResponse> {
  return apiFetch<H2HOrderResponse>(
    `/v1/h2h/transaksi/status?trx_id=${trxId}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BALANCE CHECK
// ─────────────────────────────────────────────────────────────────────────────

/** GET /v1/balance — Cek saldo RumahOTP */
export async function getRumahOTPBalance(): Promise<{ balance: number }> {
  return apiFetch<{ balance: number }>("/v1/balance");
}
