/**
 * H2H.id API Library
 * Base URL: https://api.h2h.id/api/trx
 *
 * Semua request menggunakan HTTP GET dengan parameter:
 * memberID, pin, password (wajib di setiap request)
 */

const BASE_URL = "https://api.h2h.id/api/trx";
const TAG = "[H2H]";

function getCredentials() {
  const memberID = process.env.H2H_MEMBER_ID;
  const pin      = process.env.H2H_PIN;
  const password = process.env.H2H_PASSWORD;
  if (!memberID || !pin || !password)
    throw new Error("H2H credentials tidak dikonfigurasi (H2H_MEMBER_ID, H2H_PIN, H2H_PASSWORD)");
  return { memberID, pin, password };
}

/** Kirim GET request ke H2H API */
async function h2hGet(params: Record<string, string>): Promise<any> {
  const creds = getCredentials();
  const query = new URLSearchParams({ ...creds, ...params });
  const url = `${BASE_URL}?${query.toString()}`;
  console.log(`${TAG} GET ${BASE_URL}?cmd=${params.cmd ?? params.type ?? "?"}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await res.json();
    console.log(`${TAG} Response:`, JSON.stringify(json).substring(0, 200));
    return json;
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("H2H API timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICELIST
// ─────────────────────────────────────────────────────────────────────────────

export interface H2HProduct {
  code: string;      // kode produk (product_code)
  name: string;      // nama produk
  category: string;  // kategori
  price: number;     // harga dasar (IDR)
  type: "ppob" | "smm";
  status: string;    // active / nonactive
  isOpenDenom: boolean; // apakah open denomination
}

/** Ambil daftar harga PPOB dari H2H */
export async function getPpobPricelist(): Promise<H2HProduct[]> {
  const data = await h2hGet({ cmd: "pricelist" });
  const raw: any[] = Array.isArray(data?.data) ? data.data : [];
  return raw.map((item) => ({
    code:        item.code        ?? item.product_code ?? "",
    name:        item.name        ?? item.product_name ?? "",
    category:    item.category    ?? item.type_name    ?? "Lainnya",
    price:       Number(item.price ?? item.harga ?? 0),
    type:        "ppob" as const,
    status:      (item.status ?? "active").toLowerCase(),
    isOpenDenom: !!(item.open_denom || item.open === "1"),
  })).filter(p => p.code && p.price > 0);
}

/** Ambil daftar harga SMM dari H2H */
export async function getSmmPricelist(): Promise<H2HProduct[]> {
  const data = await h2hGet({ cmd: "pricelist", type: "smm" });
  const raw: any[] = Array.isArray(data?.data) ? data.data : [];
  return raw.map((item) => ({
    code:        item.code        ?? item.product_code ?? "",
    name:        item.name        ?? item.product_name ?? "",
    category:    item.category    ?? "SMM",
    price:       Number(item.price ?? 0),
    type:        "smm" as const,
    status:      (item.status ?? "active").toLowerCase(),
    isOpenDenom: false,
  })).filter(p => p.code && p.price > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────────────────────────────────────

export interface H2HOrderResult {
  refId: string;
  status: string;
  message: string;
  sn?: string;
  price?: number;
}

/**
 * Buat pesanan PPOB di H2H
 * @param productCode  — kode produk H2H
 * @param target       — nomor/ID tujuan
 * @param refId        — reference ID unik dari sistem kita
 * @param qty          — untuk open denomination / produk qty (opsional)
 */
export async function createPpobOrder(params: {
  productCode: string;
  target: string;
  refId: string;
  qty?: number;
}): Promise<H2HOrderResult> {
  const p: Record<string, string> = {
    cmd:     "order",
    code:    params.productCode,
    hp:      params.target,
    ref_id:  params.refId,
  };
  if (params.qty !== undefined) p.qty = String(params.qty);

  const data = await h2hGet(p);
  return {
    refId:   data?.ref_id   ?? params.refId,
    status:  data?.status   ?? "unknown",
    message: data?.message  ?? data?.msg ?? "",
    sn:      data?.sn       ?? data?.serial_number,
    price:   data?.price    ? Number(data.price) : undefined,
  };
}

/**
 * Buat pesanan SMM di H2H
 * @param productCode — kode produk SMM
 * @param target      — URL/username target (link)
 * @param qty         — jumlah (wajib untuk SMM)
 * @param refId       — reference ID unik dari sistem kita
 */
export async function createSmmOrder(params: {
  productCode: string;
  target: string;
  qty: number;
  refId: string;
}): Promise<H2HOrderResult> {
  const data = await h2hGet({
    cmd:    "order",
    type:   "smm",
    code:   params.productCode,
    link:   params.target,
    qty:    String(params.qty),
    ref_id: params.refId,
  });
  return {
    refId:   data?.ref_id  ?? params.refId,
    status:  data?.status  ?? "unknown",
    message: data?.message ?? data?.msg ?? "",
    sn:      data?.sn,
    price:   data?.price ? Number(data.price) : undefined,
  };
}

/** Cek status pesanan H2H (PPOB) */
export async function checkOrderStatus(refId: string): Promise<H2HOrderResult> {
  const data = await h2hGet({ cmd: "status", ref_id: refId });
  return {
    refId:   data?.ref_id  ?? refId,
    status:  data?.status  ?? "unknown",
    message: data?.message ?? data?.msg ?? "",
    sn:      data?.sn      ?? data?.serial_number,
    price:   data?.price   ? Number(data.price) : undefined,
  };
}
