/**
 * Hero-SMS API Library
 * Protocol: SMS-Activate compatible
 * Base URL: https://hero-sms.com/stubs/handler_api.php
 */
import { prisma } from "@/lib/prisma";
export { getUsdToIdrRate, usdToIdr } from "@/lib/exchange";

const BASE_URL = "https://hero-sms.com/stubs/handler_api.php";
const TAG = "[HeroSMS]";

let _cachedKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (_cachedKey) return _cachedKey;
  try {
    const config = await prisma.appConfig.findFirst({
      where: { key: "herosms_api_key" },
    });
    _cachedKey = config?.value?.trim() ?? "";
  } catch (err) {
    console.error(`${TAG} Gagal membaca herosms_api_key dari DB:`, err);
    throw new Error("Gagal membaca API key Hero-SMS dari database.");
  }
  if (!_cachedKey) {
    throw new Error(
      "API Key Hero-SMS belum dikonfigurasi. Masuk Panel Admin → App Config → isi nilai untuk 'herosms_api_key'."
    );
  }
  console.log(`${TAG} API key berhasil dimuat dari AppConfig.`);
  return _cachedKey;
}

/** Clear key cache (e.g. after admin config update) */
export function clearApiKeyCache() {
  _cachedKey = null;
}

async function apiFetch(params: Record<string, string>): Promise<string> {
  const apiKey = await getApiKey();
  const query = new URLSearchParams({ api_key: apiKey, ...params });
  const url = `${BASE_URL}?${query.toString()}`;

  console.log(`${TAG} Request: action=${params.action}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`${TAG} Response [${params.action}]: ${text.substring(0, 300)}`);
    return text;
  } catch (err: any) {
    if (err?.name === "AbortError")
      throw new Error("Hero-SMS API timeout setelah 15 detik");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── GET BALANCE ──────────────────────────────────────────────────────────────

export async function getBalance(): Promise<number> {
  const res = await apiFetch({ action: "getBalance" });
  // Response: "ACCESS_BALANCE:XX.XX"
  const match = res.match(/ACCESS_BALANCE:([0-9.]+)/);
  if (!match) throw new Error(`Respons saldo tidak dikenali: ${res}`);
  return parseFloat(match[1]);
}

// ─── GET PRICES ───────────────────────────────────────────────────────────────

export interface HeroSMSCountryPrice {
  count: number;
  cost: number;          // harga dalam USD (field aktual dari API)
  physicalCount?: number;
}

/**
 * Struktur aktual respons getPrices dari Hero-SMS:
 * { [countryId]: { [serviceCode]: { cost, count, physicalCount } } }
 * Contoh: {"2":{"wa":{"cost":3,"count":1854}}}
 */
export type HeroSMSPricesResponse = Record<string, Record<string, HeroSMSCountryPrice>>;

export async function getPrices(service?: string): Promise<HeroSMSPricesResponse> {
  const params: Record<string, string> = { action: "getPrices" };
  if (service) params.service = service;
  const res = await apiFetch(params);
  try {
    return JSON.parse(res) as HeroSMSPricesResponse;
  } catch {
    throw new Error(`Respons getPrices bukan JSON: ${res.substring(0, 300)}`);
  }
}

// ─── GET NUMBER (Buy OTP) ─────────────────────────────────────────────────────

export interface HeroSMSOrder {
  activationId: string;
  phoneNumber: string;
}

const BUY_ERRORS: Record<string, string> = {
  NO_NUMBERS:    "Tidak ada nomor tersedia untuk layanan ini. Coba negara lain.",
  NO_BALANCE:    "Saldo Hero-SMS habis. Hubungi admin.",
  WRONG_SERVICE: "Kode layanan tidak valid.",
  BAD_SERVICE:   "Layanan tidak didukung.",
  BANNED:        "Akun Hero-SMS diblokir.",
  NO_MONEY:      "Saldo Hero-SMS tidak mencukupi.",
  WRONG_COUNTRY: "Kode negara tidak valid.",
};

export async function getNumber(service: string, country: number): Promise<HeroSMSOrder> {
  const res = await apiFetch({
    action:  "getNumber",
    service,
    country: String(country),
  });

  // Success: "ACCESS_NUMBER:ACTIVATION_ID:PHONE_NUMBER"
  if (res.startsWith("ACCESS_NUMBER:")) {
    const parts = res.split(":");
    return { activationId: parts[1], phoneNumber: parts[2] };
  }

  throw new Error(BUY_ERRORS[res.trim()] ?? `Hero-SMS error: ${res}`);
}

// ─── GET STATUS ───────────────────────────────────────────────────────────────

export type HeroSMSStatusType = "WAIT" | "OK" | "CANCEL" | "TIMEOUT";

export interface HeroSMSStatus {
  status: HeroSMSStatusType;
  code?: string;
}

export async function getStatus(activationId: string): Promise<HeroSMSStatus> {
  const res = await apiFetch({ action: "getStatus", id: activationId });

  if (res.startsWith("STATUS_OK:"))       return { status: "OK", code: res.split(":")[1] };
  if (res === "STATUS_WAIT_CODE")         return { status: "WAIT" };
  if (res === "STATUS_WAIT_RESEND")       return { status: "WAIT" };
  if (res === "STATUS_CANCEL")            return { status: "CANCEL" };
  if (res === "STATUS_WAIT_CODE_AND_FORWARD") return { status: "WAIT" };

  return { status: "TIMEOUT" };
}

// ─── CANCEL NUMBER ────────────────────────────────────────────────────────────

export async function cancelNumber(activationId: string): Promise<boolean> {
  const res = await apiFetch({
    action: "setStatus",
    id:     activationId,
    status: "8",
  });
  return res.includes("ACCESS_CANCEL");
}

// ─── USD → IDR CONVERSION ─────────────────────────────────────────────────────
// Didelegasikan ke src/lib/exchange.ts (re-exported di atas)

// ─── SERVICE NAME MAP ─────────────────────────────────────────────────────────

export const SERVICE_NAMES: Record<string, string> = {
  wa:  "WhatsApp",
  tg:  "Telegram",
  ig:  "Instagram",
  lf:  "TikTok",
  go:  "Gmail",
  fb:  "Facebook",
  vk:  "VKontakte",
  mm:  "Mail.ru",
  vi:  "Viber",
  ub:  "Uber",
  oi:  "OLX",
  ok:  "Odnoklassniki",
  tw:  "Twitter / X",
  yt:  "YouTube",
  am:  "Amazon",
  ms:  "Microsoft",
  az:  "Avito",
  ay:  "AliExpress",
  tm:  "Tokopedia",
  sh:  "Shopee",
  lz:  "Lazada",
  gr:  "Grab",
  go2: "Gojek",
  nf:  "Netflix",
  sp:  "Spotify",
  dc:  "Discord",
  li:  "LinkedIn",
  ln:  "Line",
  kk:  "KakaoTalk",
};

// ─── COUNTRY NAME MAP ─────────────────────────────────────────────────────────

export const COUNTRY_NAMES: Record<number, string> = {
  2:  "Indonesia",
  73: "Filipina",
  46: "Malaysia",
  0:  "Rusia",
  1:  "Ukraina",
  6:  "Amerika Serikat",
  7:  "Inggris",
  16: "India",
  22: "Cina",
  36: "Vietnam",
  44: "Thailand",
  83: "Brasil",
};
