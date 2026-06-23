import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Penting: jangan jalankan dalam Edge runtime — pastikan Node.js runtime
// agar cookie deletion bekerja penuh tanpa batasan Edge
export const runtime = "nodejs";

/**
 * GET /api/auth/clear-session
 *
 * Hard session clear — menghapus semua cookie sesi NextAuth v4 + v5.
 * FIX 502 Bad Gateway: Sebelumnya response bisa terjeda karena terlalu banyak
 * Set-Cookie headers yang dikirim, menyebabkan buffer overflow di Nginx.
 * Solusi: kurangi domain permutasi, gunakan redirect langsung ke /login.
 */
export async function GET(req: NextRequest) {
  const response = new NextResponse(null, {
    status: 302,
    headers: { Location: "/login" },
  });

  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];

  // Hanya hapus di domain root — menghindari terlalu banyak header Set-Cookie
  // yang dapat menyebabkan buffer overflow di Nginx (502 Bad Gateway)
  const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname   = hostHeader.split(":")[0];
  const isLocal    = hostname === "localhost" || hostname === "127.0.0.1";

  for (const name of cookieNames) {
    const isSecureCookie  = name.startsWith("__Secure-") || name.startsWith("__Host-");
    const isHostPrefixed  = name.startsWith("__Host-");

    // Base delete — path=/ tanpa domain (berlaku di semua subdomain)
    let base = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    if (isSecureCookie && !isLocal) base += "; Secure";
    response.headers.append("Set-Cookie", base);

    // Tambahan: hapus dengan domain root (misal: nokosku.id) — hanya non-__Host- prefix
    if (!isHostPrefixed && !isLocal && hostname) {
      const withDomain = `${name}=; Path=/; Domain=${hostname}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecureCookie ? "; Secure" : ""}`;
      response.headers.append("Set-Cookie", withDomain);
    }
  }

  console.log("[ClearSession] Session cookies cleared, redirecting to /login");
  return response;
}
