/**
 * RumahOTP API Client
 * Base URL: https://www.rumahotp.io/api
 *
 * API Key dibaca dari tabel AppConfig (key: "rumahotp_api_key") — BUKAN dari env var.
 * Defensive: semua fetch memiliki timeout 8s.
 */

import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.rumahotp.io/api";
const FETCH_TIMEOUT_MS = 8000;
const TAG = "[RumahOTP]";

// ─── Ambil API Key dari DB (cache dalam request lifecycle) ────────────────────
let _cachedKey: string | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 1 menit

async function getApiKey(): Promise<string> {
  const now = Date.now();
  if (_cachedKey !== null && now - _cacheTime < CACHE_TTL) return _cachedKey;

  try {
    const config = await prisma.appConfig.findFirst({
      where: { key: "rumahotp_api_key" },
    });
    _cachedKey = config?.value?.trim() ?? "";
    _cacheTime = now;
  } catch (err) {
    console.error(`${TAG} Gagal membaca rumahotp_api_key dari DB:`, err);
    throw new Error("Gagal membaca API key RumahOTP dari database. Periksa koneksi DB.");
  }

  if (!_cachedKey) {
    throw new Error(
      "API Key RumahOTP belum dikonfigurasi. " +
      "Masuk Panel Admin → App Config → isi nilai untuk 'rumahotp_api_key'."
    );
  }

  console.log(`${TAG} API key berhasil dimuat dari AppConfig.`);
  return _cachedKey;
}

function buildHeaders(apiKey: string) {
  return {
    "x-apikey": apiKey,
    accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err?.name === "AbortError")
      throw new Error(`RumahOTP API timeout setelah ${timeoutMs}ms — endpoint: ${url}`);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const rateLimitDelay = () => new Promise((r) => setTimeout(r, 2000));

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // getApiKey() akan throw jika key kosong atau DB error — tidak ada mock
  const apiKey = await getApiKey();

  const url = `${BASE_URL}${endpoint}`;
  console.log(`${TAG} Request: ${options?.method ?? "GET"} ${endpoint}`);

  const res = await fetchWithTimeout(url, {
    ...options,
    headers: { ...buildHeaders(apiKey), ...(options?.headers ?? {}) },
  });

  if (!res.ok) {
    let errBody = "(no body)";
    try { errBody = await res.text(); } catch {}
    const errMsg = `RumahOTP API Error [${res.status} ${res.statusText}] ${endpoint}: ${errBody}`;
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

function normalizeArray<T>(raw: unknown, context: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.services)) return obj.services as T[];
    if (Array.isArray(obj.countries)) return obj.countries as T[];
    if (Array.isArray(obj.operators)) return obj.operators as T[];
    if (Array.isArray(obj.products)) return obj.products as T[];
    if (obj.message || obj.error) {
      // Serialize error properly — obj.error can be an object like {message: '...'}
      const errDetail =
        typeof obj.error === "string"
          ? obj.error
          : typeof obj.error === "object" && obj.error !== null
          ? (obj.error as any).message ?? JSON.stringify(obj.error)
          : String(obj.error ?? obj.message ?? "Unknown error");
      throw new Error(`RumahOTP ${context} error: ${errDetail}`);
    }
  }
  console.error(`[RumahOTP] ${context}: unexpected response shape:`, raw);
  return [];
}

export async function getOTPServices(): Promise<OTPService[]> {
  const raw = await apiFetch<unknown>("/v2/services");
  return normalizeArray<OTPService>(raw, "getOTPServices");
}

export async function getOTPCountries(serviceId?: string | number): Promise<OTPCountry[]> {
  const query = serviceId ? `?service_id=${serviceId}` : "";
  const raw = await apiFetch<unknown>(`/v2/countries${query}`);
  return normalizeArray<OTPCountry>(raw, "getOTPCountries");
}

export async function getOTPOperators(country: string, providerId?: number): Promise<OTPOperator[]> {
  const query = providerId ? `?country=${country}&provider_id=${providerId}` : `?country=${country}`;
  const raw = await apiFetch<unknown>(`/v2/operators${query}`);
  return normalizeArray<OTPOperator>(raw, "getOTPOperators");
}

export async function buyOTPNumber(params: { service: string; country: string; operator?: string; }): Promise<OTPOrder> {
  return apiFetch<OTPOrder>("/v2/orders", { method: "POST", body: JSON.stringify(params) });
}

export async function getOTPStatus(orderId: string): Promise<OTPOrder> {
  return apiFetch<OTPOrder>(`/v1/orders/get_status?id=${orderId}`);
}

export async function cancelOTPOrder(orderId: string, status: "cancel" | "finish"): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/v1/orders/set_status", { method: "POST", body: JSON.stringify({ id: orderId, status }) });
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

export async function getH2HProducts(): Promise<H2HProduct[]> {
  // Endpoint valid: /v1/h2h/product (sesuai pola endpoint H2H lainnya, tanpa query params)
  const raw = await apiFetch<unknown>(`/v1/h2h/product`);
  return normalizeArray<H2HProduct>(raw, "getH2HProducts");
}

export async function createH2HOrder(params: { product_code: string; target: string; ref_id: string; }): Promise<H2HOrderResponse> {
  return apiFetch<H2HOrderResponse>("/v1/h2h/transaksi/create", { method: "POST", body: JSON.stringify(params) });
}

export async function checkH2HStatus(trxId: string): Promise<H2HOrderResponse> {
  return apiFetch<H2HOrderResponse>(`/v1/h2h/transaksi/status?trx_id=${trxId}`);
}

export async function getRumahOTPBalance(): Promise<{ balance: number }> {
  return apiFetch<{ balance: number }>("/v1/balance");
}
