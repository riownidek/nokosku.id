/**
 * Jagoanpedia PPOB API Client
 * Docs: https://jagoanpedia.com
 *
 * Env Var: JAGOANPEDIA_API_KEY
 * All requests use POST with Content-Type: application/json
 */

const JAGOANPEDIA_BASE = "https://jagoanpedia.com/api/ppob";
const TAG = "[Jagoanpedia]";

function getApiKey(): string {
  const key = process.env.JAGOANPEDIA_API_KEY;
  if (!key) {
    throw new Error(
      "JAGOANPEDIA_API_KEY belum dikonfigurasi. Tambahkan ke environment variables."
    );
  }
  return key;
}

export interface JagoanpediaService {
  service: string;
  name: string;
  category: string;
  price: number; // harga asli dari provider
  displayPrice?: number; // harga setelah markup
  description?: string;
  status?: string;
}

export interface JagoanpediaServicesResponse {
  success: boolean;
  data: JagoanpediaService[];
  message?: string;
}

export interface JagoanpediaOrderResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string; // provider_id untuk disimpan ke DB
    service: string;
    target: string;
    status: string;
    price: number;
    sn?: string; // Serial Number / kode hasil
  };
}

export interface JagoanpediaStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    service: string;
    target: string;
    status: string; // "pending" | "processing" | "success" | "failed" | "cancelled"
    sn?: string;
  };
}

/**
 * Ambil daftar layanan PPOB dari Jagoanpedia.
 * @param marginAmount - Jumlah markup (IDR) yang ditambahkan ke harga asli (dari setting admin).
 */
export async function getJagoanpediaServices(
  marginAmount: number = 0
): Promise<JagoanpediaService[]> {
  const key = getApiKey();
  console.log(`${TAG} Fetching services list...`);

  let res: Response;
  try {
    res = await fetch(JAGOANPEDIA_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ key, action: "services" }),
      cache: "no-store",
    });
  } catch (err: any) {
    console.error(`${TAG} Network error fetching services:`, err?.message);
    throw new Error(`Jagoanpedia tidak dapat dihubungi: ${err?.message ?? "Network error"}`);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(no body)");
    throw new Error(`Jagoanpedia API Error [${res.status}]: ${errBody}`);
  }

  const json: JagoanpediaServicesResponse = await res.json();
  console.log(`${TAG} Got ${json.data?.length ?? 0} services.`);

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.message ?? "Respons layanan Jagoanpedia tidak valid");
  }

  // Tambahkan margin ke setiap harga
  return json.data.map((svc) => ({
    ...svc,
    displayPrice: svc.price + marginAmount,
  }));
}

/**
 * Buat pesanan PPOB di Jagoanpedia.
 * Validasi saldo wajib dilakukan SEBELUM memanggil fungsi ini.
 * @param serviceId - ID layanan dari Jagoanpedia (misal "PLN50000")
 * @param target - Nomor HP / ID Pelanggan target
 */
export async function createJagoanpediaOrder(
  serviceId: string,
  target: string
): Promise<JagoanpediaOrderResponse> {
  const key = getApiKey();
  console.log(`${TAG} Creating order: service=${serviceId} target=${target}`);

  let res: Response;
  try {
    res = await fetch(JAGOANPEDIA_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ key, action: "order", service: serviceId, target }),
    });
  } catch (err: any) {
    console.error(`${TAG} Network error creating order:`, err?.message);
    throw new Error(`Jagoanpedia tidak dapat dihubungi: ${err?.message ?? "Network error"}`);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(no body)");
    throw new Error(`Jagoanpedia API Error [${res.status}]: ${errBody}`);
  }

  const json: JagoanpediaOrderResponse = await res.json();
  console.log(
    `${TAG} Order response: success=${json.success} id=${json.data?.id} msg=${json.message}`
  );
  return json;
}

/**
 * Cek status pesanan PPOB di Jagoanpedia.
 * Gunakan untuk Cron Job / polling dari halaman riwayat.
 * @param orderId - provider_id yang disimpan saat createJagoanpediaOrder berhasil
 */
export async function checkJagoanpediaStatus(
  orderId: string
): Promise<JagoanpediaStatusResponse> {
  const key = getApiKey();
  console.log(`${TAG} Checking status: orderId=${orderId}`);

  let res: Response;
  try {
    res = await fetch(JAGOANPEDIA_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ key, action: "status", order_id: orderId }),
    });
  } catch (err: any) {
    console.error(`${TAG} Network error checking status:`, err?.message);
    throw new Error(`Jagoanpedia tidak dapat dihubungi: ${err?.message ?? "Network error"}`);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(no body)");
    throw new Error(`Jagoanpedia status error [${res.status}]: ${errBody}`);
  }

  const json: JagoanpediaStatusResponse = await res.json();
  console.log(`${TAG} Status response: status=${json.data?.status} msg=${json.message}`);
  return json;
}
