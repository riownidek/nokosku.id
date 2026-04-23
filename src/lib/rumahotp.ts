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
    if (!_cachedKey) {
      console.warn(`${TAG} AppConfig 'rumahotp_api_key' kosong atau belum diisi admin.`);
    } else {
      console.log(`${TAG} API key berhasil dimuat dari AppConfig.`);
    }
  } catch (err) {
    console.error(`${TAG} Gagal membaca API key dari DB:`, err);
    _cachedKey = "";
  }
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
  const apiKey = await getApiKey();

  // ── Mock mode: API key kosong atau belum dikonfigurasi ─────────────────────
  if (!apiKey || apiKey === "MOCK" || apiKey === "undefined") {
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
    headers: { ...buildHeaders(apiKey), ...(options?.headers ?? {}) },
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

export async function getOTPServices(): Promise<OTPService[]> { return apiFetch<OTPService[]>("/v2/services"); }
export async function getOTPCountries(): Promise<OTPCountry[]> { return apiFetch<OTPCountry[]>("/v2/countries"); }
export async function getOTPOperators(country: string): Promise<OTPOperator[]> { return apiFetch<OTPOperator[]>(`/v2/operators?country=${country}`); }

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

export async function getH2HProducts(category?: string): Promise<H2HProduct[]> {
  const query = category ? `?category=${category}` : "";
  return apiFetch<H2HProduct[]>(`/v1/h2h/product${query}`);
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
