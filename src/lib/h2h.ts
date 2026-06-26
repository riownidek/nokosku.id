/**
 * H2H.id API Library
 *
 * Dokumentasi: https://h2h.id/docs/api
 * Base URL transaksi: https://api.h2h.id/api/trx
 *
 * Semua request menggunakan HTTP GET.
 * Autentikasi wajib: memberID, pin, password di setiap request.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENDPOINT MAPPING (dari docs):
 *  - Pricelist  : GET /api/trx/pricelist?memberID=&pin=&password=[&type=smm]
 *  - Order      : GET /api/trx?product=&dest=&refID=&memberID=&pin=&password=[&qty=][&inquiry_id=]
 *  - Order SMM  : GET /api/trx?type=smm&service=&target=&quantity=&refID=&memberID=&pin=&password=
 *  - Status     : GET /api/trx/status?refID=&memberID=&pin=&password=
 *  - Balance    : GET /api/trx/balance?memberID=&pin=&password=
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BASE_URL      = "https://api.h2h.id/api/trx";
const PRICELIST_URL = "https://api.h2h.id/api/trx/pricelist";
const STATUS_URL    = "https://api.h2h.id/api/trx/status";
const BALANCE_URL   = "https://api.h2h.id/api/trx/balance";
const TAG           = "[H2H]";

// ─── Credentials ─────────────────────────────────────────────────────────────

function getCredentials() {
  const memberID = process.env.H2H_MEMBER_ID;
  const pin      = process.env.H2H_PIN;
  const password = process.env.H2H_PASSWORD;
  if (!memberID || !pin || !password)
    throw new Error("H2H credentials tidak dikonfigurasi (H2H_MEMBER_ID, H2H_PIN, H2H_PASSWORD)");
  return { memberID, pin, password };
}

/** Helper: kirim GET request ke URL H2H dengan params + credentials */
async function h2hGet(baseUrl: string, params: Record<string, string>): Promise<any> {
  const creds = getCredentials();
  const query = new URLSearchParams({ ...params, ...creds });
  const url   = `${baseUrl}?${query.toString()}`;

  // Log URL tanpa credentials untuk debugging
  const safeLog = `${baseUrl}?${new URLSearchParams(params).toString()}`;
  console.log(`${TAG} GET ${safeLog}`);

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache:  "no-store",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await res.json();
    console.log(`${TAG} Response: status=${json.status} msg=${json.message}`);
    return json;
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("H2H API timeout (25s)");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICELIST
// ─────────────────────────────────────────────────────────────────────────────

export interface H2HProduct {
  /** Kode produk (untuk parameter `product` saat order) */
  code: string;
  name: string;
  category: string;
  /** Harga jual ke pelanggan kita (IDR) */
  price: number;
  type: "ppob" | "smm";
  /** "OPEN" = aktif dijual, "CLOSE" = tidak tersedia */
  status: string;
  /** Apakah produk open denomination (qty) */
  isOpenDenom: boolean;
  description?: string;
}

/**
 * Ambil daftar harga produk reguler (PPOB, pulsa, token, dll) dari H2H
 * Endpoint: GET /api/trx/pricelist?memberID=&pin=&password=
 */
export async function getPpobPricelist(): Promise<H2HProduct[]> {
  const json = await h2hGet(PRICELIST_URL, {});

  if (!json?.status) {
    throw new Error(`H2H pricelist error: ${json?.message ?? "Tidak ada respons"}`);
  }

  const raw: any[] = Array.isArray(json.data) ? json.data : [];
  return raw
    .map((item) => ({
      code:        String(item.code        ?? ""),
      name:        String(item.name        ?? ""),
      category:    String(item.category    ?? item.type ?? "Lainnya"),
      price:       Number(item.price       ?? 0),
      type:        "ppob" as const,
      // Docs: status = "OPEN" jika aktif
      status:      String(item.status      ?? "OPEN").toUpperCase(),
      // Produk open denom biasanya kode mengandung "BBSDN" atau kategori "nominal_bebas"
      isOpenDenom: !!(item.open_denom === true || item.open_denom === "1"
                   || (item.category ?? "").toLowerCase().includes("nominal_bebas")),
      description: item.description ?? "",
    }))
    .filter((p) => p.code && p.price >= 0);
}

/**
 * Ambil daftar harga SMM dari H2H
 * Endpoint: GET /api/trx/pricelist?type=smm&memberID=&pin=&password=
 */
export async function getSmmPricelist(): Promise<H2HProduct[]> {
  const json = await h2hGet(PRICELIST_URL, { type: "smm" });

  if (!json?.status) {
    throw new Error(`H2H SMM pricelist error: ${json?.message ?? "Tidak ada respons"}`);
  }

  const raw: any[] = Array.isArray(json.data) ? json.data : [];
  return raw.map((item) => ({
    // SMM pricelist menggunakan field "id" sebagai kode layanan
    code:        String(item.id           ?? item.code ?? ""),
    name:        String(item.name         ?? ""),
    category:    String(item.category     ?? "SMM"),
    // SMM menggunakan price_per_1k; price per unit = price_per_1k / 1000
    price:       Number(item.price_per_1k ?? item.price ?? 0),
    type:        "smm" as const,
    status:      "OPEN",
    isOpenDenom: false,
    description: item.type ?? "",
  })).filter((p) => p.code && p.price >= 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────────────────────────────────────

export interface H2HOrderResult {
  refId:    string;
  /** transaction_status dari H2H: "pending" | "success" | "failed" | "processing" */
  status:   string;
  message:  string;
  /** Serial number / token PLN (dari field serial_number) */
  sn?:      string;
  /** Harga aktual yang ditagih H2H */
  price?:   number;
  /** Invoice number dari H2H */
  invoice?: string;
}

/**
 * Buat pesanan produk reguler (pulsa, token PLN, paket data, dll) via H2H
 * Endpoint: GET /api/trx?product=&dest=&refID=&memberID=&pin=&password=[&qty=][&inquiry_id=]
 */
export async function createPpobOrder(params: {
  /** Kode produk H2H (dari field `code` pricelist) */
  productCode: string;
  /** Nomor/ID tujuan pelanggan */
  target: string;
  /** Reference ID unik dari sistem kita */
  refId: string;
  /** Jumlah untuk produk open denomination (kelipatan 1000, range 10000–10000000) */
  qty?: number;
  /** inquiry_id wajib untuk produk PPOB tagihan (PLN pascabayar, BPJS, dll) */
  inquiryId?: string;
}): Promise<H2HOrderResult> {
  const p: Record<string, string> = {
    product: params.productCode,
    dest:    params.target,
    refID:   params.refId,
  };
  if (params.qty       !== undefined) p.qty        = String(params.qty);
  if (params.inquiryId !== undefined) p.inquiry_id = params.inquiryId;

  const json = await h2hGet(BASE_URL, p);
  const data = json?.data ?? {};

  return {
    refId:   data.ref_id               ?? params.refId,
    status:  data.transaction_status   ?? (json.status ? "pending" : "failed"),
    message: json.message              ?? "",
    sn:      data.serial_number        ?? data.sn ?? undefined,
    price:   data.price !== undefined  ? Number(data.price) : undefined,
    invoice: data.invoice,
  };
}

/**
 * Buat pesanan SMM (followers, likes, views, dll) via H2H
 * Endpoint: GET /api/trx?type=smm&service=&target=&quantity=&refID=&memberID=&pin=&password=
 */
export async function createSmmOrder(params: {
  /** ID layanan SMM dari pricelist (field `id` di SMM pricelist) */
  serviceId: string;
  /** URL / username target */
  target: string;
  /** Jumlah pesanan (harus dalam range min-max layanan) */
  quantity: number;
  /** Reference ID unik dari sistem kita */
  refId: string;
}): Promise<H2HOrderResult> {
  const json = await h2hGet(BASE_URL, {
    type:     "smm",
    service:  params.serviceId,
    target:   params.target,
    quantity: String(params.quantity),
    refID:    params.refId,
  });
  const data = json?.data ?? {};

  return {
    refId:   data.ref_id             ?? params.refId,
    status:  data.transaction_status ?? (json.status ? "pending" : "failed"),
    message: json.message            ?? "",
    sn:      undefined,
    price:   data.price !== undefined ? Number(data.price) : undefined,
    invoice: data.order_number,
  };
}

/**
 * Cek status pesanan (PPOB maupun SMM) via H2H
 * Endpoint: GET /api/trx/status?refID=&memberID=&pin=&password=
 */
export async function checkOrderStatus(refId: string): Promise<H2HOrderResult> {
  const json = await h2hGet(STATUS_URL, { refID: refId });
  const data = json?.data ?? {};

  return {
    refId:   data.ref_id             ?? refId,
    status:  data.transaction_status ?? "unknown",
    message: json.message            ?? "",
    sn:      data.serial_number      ?? data.sn ?? undefined,
    price:   data.price !== undefined ? Number(data.price) : undefined,
    invoice: data.invoice ?? data.order_number,
  };
}

/**
 * Cek saldo H2H
 * Endpoint: GET /api/trx/balance?memberID=&pin=&password=
 */
export async function checkH2HBalance(): Promise<number> {
  const json = await h2hGet(BALANCE_URL, {});
  return Number(json?.data?.balance ?? 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Konversi transaction_status H2H ke status Order di DB kita
 * H2H status: "pending" | "success" | "failed" | "processing" | "completed" | "partial"
 */
export function mapH2HStatusToOrderStatus(
  h2hStatus: string
): "PENDING" | "COMPLETED" | "FAILED" {
  const s = h2hStatus.toLowerCase();
  if (s === "success" || s === "completed") return "COMPLETED";
  if (s === "failed"  || s === "cancel")    return "FAILED";
  return "PENDING";
}

/**
 * Tentukan apakah pesan callback H2H menandakan sukses atau gagal.
 * Dari docs: H2H mengirim GET callback dengan parameter `refid`, `message`, `key`.
 * Tidak ada parameter `status` yang terpisah — status diinterpretasi dari `message`.
 */
export function interpretCallbackMessage(message: string): "success" | "failed" | "pending" {
  const m = (message ?? "").toLowerCase();
  if (m.includes("sukses") || m.includes("success") || m.includes("berhasil")
   || m.includes("sn=")    || m.includes("token=")) {
    return "success";
  }
  if (m.includes("gagal") || m.includes("failed") || m.includes("fail")
   || m.includes("cancel") || m.includes("error")) {
    return "failed";
  }
  return "pending";
}
