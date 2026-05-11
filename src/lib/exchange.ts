/**
 * exchange.ts — Real-time USD to IDR exchange rate utility
 *
 * Strategy:
 * 1. Cek DB: jika ada nilai dan belum > 6 jam → pakai nilai tersebut (cache DB).
 * 2. Jika sudah > 6 jam → fetch dari open.er-api.com → simpan ke DB.
 * 3. Jika fetch gagal → pakai nilai terakhir dari DB.
 * 4. Jika DB benar-benar kosong → pakai DEFAULT_RATE (16000).
 */

import { prisma } from "@/lib/prisma";

const DB_KEY        = "usd_to_idr_rate";
const DB_LABEL      = "Kurs USD → IDR (Auto)";
const DB_GROUP      = "api";
const DEFAULT_RATE  = 16000;
const CACHE_TTL_MS  = 6 * 60 * 60 * 1000; // 6 jam
const ER_API_URL    = "https://open.er-api.com/v6/latest/USD";
const TAG           = "[Exchange]";

// ─── Internal: fetch dari API eksternal ──────────────────────────────────────

async function fetchLiveRate(): Promise<number> {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10_000);
  try {
    const res  = await fetch(ER_API_URL, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rate = json?.rates?.IDR;
    if (typeof rate !== "number" || rate <= 0) throw new Error("Invalid IDR rate in response");
    console.log(`${TAG} Fetched live rate: 1 USD = ${rate} IDR`);
    return rate;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Internal: upsert ke AppConfig ───────────────────────────────────────────

async function saveRateToDB(rate: number): Promise<void> {
  await prisma.appConfig.upsert({
    where:  { key: DB_KEY },
    update: { value: String(rate), label: DB_LABEL, group: DB_GROUP },
    create: { key: DB_KEY, value: String(rate), label: DB_LABEL, group: DB_GROUP },
  });
  console.log(`${TAG} Rate saved to DB: ${rate}`);
}

// ─── Public: getUsdToIdrRate ──────────────────────────────────────────────────
// Dipanggil dari herosms.ts dan api/otp/buy/route.ts

export async function getUsdToIdrRate(): Promise<number> {
  try {
    const record = await prisma.appConfig.findFirst({
      where: { key: DB_KEY },
    });

    const currentRate = parseFloat(record?.value ?? "0");
    const updatedAt   = record?.updatedAt ? new Date(record.updatedAt) : null;
    const ageMs       = updatedAt ? Date.now() - updatedAt.getTime() : Infinity;

    // ── Cache masih segar (< 6 jam) → pakai dari DB ──────────────────────────
    if (currentRate > 0 && ageMs < CACHE_TTL_MS) {
      console.log(`${TAG} Using cached rate: ${currentRate} (age: ${Math.round(ageMs / 60000)}m)`);
      return currentRate;
    }

    // ── Cache kadaluarsa atau belum ada → fetch baru ──────────────────────────
    console.log(`${TAG} Cache stale or empty. Fetching live rate...`);
    try {
      const liveRate = await fetchLiveRate();
      await saveRateToDB(liveRate);
      return liveRate;
    } catch (fetchErr) {
      console.warn(`${TAG} Live fetch failed:`, fetchErr);
      // Fallback: gunakan nilai lama dari DB jika ada
      if (currentRate > 0) {
        console.warn(`${TAG} Using stale DB rate as fallback: ${currentRate}`);
        return currentRate;
      }
      // DB kosong dan fetch gagal → pakai default
      console.warn(`${TAG} DB empty and fetch failed. Using DEFAULT_RATE: ${DEFAULT_RATE}`);
      return DEFAULT_RATE;
    }
  } catch (dbErr) {
    // DB tidak dapat diakses sama sekali → pakai default
    console.error(`${TAG} DB error:`, dbErr);
    return DEFAULT_RATE;
  }
}

// ─── Public: syncRateNow (dipanggil dari admin tombol manual) ─────────────────

export async function syncRateNow(): Promise<{ rate: number; source: "live" | "fallback" }> {
  try {
    const liveRate = await fetchLiveRate();
    await saveRateToDB(liveRate);
    return { rate: liveRate, source: "live" };
  } catch (err) {
    console.error(`${TAG} Manual sync failed:`, err);
    // Coba ambil dari DB sebagai fallback
    const record = await prisma.appConfig.findFirst({ where: { key: DB_KEY } });
    const rate   = parseFloat(record?.value ?? "0") || DEFAULT_RATE;
    return { rate, source: "fallback" };
  }
}

// ─── Public: helper konversi ──────────────────────────────────────────────────

export function usdToIdr(usdPrice: number, rate: number): number {
  return Math.ceil(usdPrice * rate);
}
