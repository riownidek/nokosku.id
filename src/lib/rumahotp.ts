/**
 * RumahOTP API Client
 * Base URL: https://www.rumahotp.io/api
 * Rate limit: 5 requests per 10 seconds → use 2s delay between calls
 *
 * Defensive: All fetches have a 8s timeout to avoid Vercel serverless hanging.
 * API_KEY falls back gracefully if env var missing.
 */

const BASE_URL = "https://www.rumahotp.io/api";
const API_KEY = process.env.RUMAHOTP_API_KEY ?? "";
const FETCH_TIMEOUT_MS = 8000; // 8 detik — aman di bawah Vercel 10s limit

const TAG = "[RumahOTP]";

/** Build headers — crash-safe jika API_KEY kosong */
function buildHeaders() {
  return {
    "x-apikey": API_KEY,
    accept: "application/json",
    "Content-Type": "application/json",
  };
}

/** Fetch with AbortController timeout */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`RumahOTP API timeout setelah ${timeoutMs}ms — endpoint: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Safe delay to respect rate limiting (2 seconds) */
export const rateLimitDelay = () =>
  new Promise((resolve) => setTimeout(resolve, 2000));

/** Generic fetch wrapper with timeout + error handling */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // ── Mock mode untuk development tanpa API key ─────────────────────────────
  if (!API_KEY || API_KEY === "MOCK" || API_KEY === "undefined") {
    console.warn(`${TAG} No API key — using mock response for ${endpoint}`);
    if (endpoint.includes("/services")) return [{ name: "WhatsApp", code: "wa", price: 1000 }] as any;
    if (endpoint.includes("/countries")) return [{ id: 1, name: "Indonesia", code: "id" }] as any;
    if (endpoint.includes("/operators")) return [{ id: 1, name: "Telkomsel", code: "tsel" }] as any;
    if (endpoint.includes("/get_status")) return { id: "123", number: "081234567890", status: "success", sms: "Your OTP is 998877" } as any;
    if (endpoint.includes("/set_status")) return { success: true } as any;
    if (endpoint === "/v2/orders") return { id: "123-" + Date.now(), number: "081234" + Math.floor(Math.random() * 100000), status: "active", price: 1000 } as any;
    if (endpoint.includes("/h2h/product")) return [{ product_code: "PULSA10", product_name: "Pulsa 10k", category: "PULSA", price: 10500 }] as any;
    if (endpoint.includes("/h2h/transaksi/create")) return { trx_id: "trx-" + Date.now(), status: "success", sn: "SN-123456", price: 10500 } as any;
    if (endpoint.includes("/balance")) return { balance: 999999 } as any;
    return {} as any;
  }

  const url = `${BASE_URL}${endpoint}`;
  console.log(`${TAG} Request: ${options?.method ?? "GET"} ${endpoint}`);

  const res = await fetchWithTimeout(url, {
    ...options,
    headers: { ...buildHeaders(), ...(options?.headers ?? {}) },
  });

  if (!res.ok) {
    let errBody = "(no body)";
    try { errBody = await res.text(); } catch {}
    const errMsg = `RumahOTP API Error [${res.status}] ${endpoint}: ${errBody}`;
    console.error(`${TAG} ${errMsg}`);
    throw new Error(errMsg);
  }

  const data = await res.json();
  console.log(`${TAG} Response OK: ${endpoint}`, JSON.stringify(data).substring(0, 200));
  return data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface OTPService { name: string; code: string; price: number; }
export interface OTPCountry { id: number; name: string; code: string; }
export interface OTPOperator { id: number; name: string; code: string; }
export interface OTPOrder {
  id: string;
  number: string;
  status: string;
  price?: number;
  sms?: string;
  expires_at?: string;
}

export async function getOTPServices(): Promise<OTPService[]> {
  return apiFetch<OTPService[]>("/v2/services");
}

export async function getOTPCountries(): Promise<OTPCountry[]> {
  return apiFetch<OTPCountry[]>("/v2/countries");
}

export async function getOTPOperators(country: string): Promise<OTPOperator[]> {
  return apiFetch<OTPOperator[]>(`/v2/operators?country=${country}`);
}

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

export async function getOTPStatus(orderId: string): Promise<OTPOrder> {
  return apiFetch<OTPOrder>(`/v1/orders/get_status?id=${orderId}`);
}

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

export async function getH2HProducts(category?: string): Promise<H2HProduct[]> {
  const query = category ? `?category=${category}` : "";
  return apiFetch<H2HProduct[]>(`/v1/h2h/product${query}`);
}

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

export async function checkH2HStatus(trxId: string): Promise<H2HOrderResponse> {
  return apiFetch<H2HOrderResponse>(`/v1/h2h/transaksi/status?trx_id=${trxId}`);
}

export async function getRumahOTPBalance(): Promise<{ balance: number }> {
  return apiFetch<{ balance: number }>("/v1/balance");
}
