import { NextRequest, NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/clear-session
 *
 * Hard session clear — menghapus semua cookie sesi NextAuth v4 + v5
 * dengan meng-set setiap cookie ke maxAge=0 (expired).
 */
export async function GET(req: NextRequest) {
  const isSecure = req.url.startsWith("https://");
  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl, { status: 302 });

  // Semua kemungkinan nama cookie NextAuth v4 + v5
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

  for (const name of cookieNames) {
    const isHostPrefixed   = name.startsWith("__Host-");
    const isSecurePrefixed = name.startsWith("__Secure-");
    const needsSecure      = isSecure || isSecurePrefixed || isHostPrefixed;

    const opts: Partial<ResponseCookie> = {
      value: "",
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: needsSecure,
    };

    try {
      response.cookies.set(name, "", opts);
    } catch {
      // Skip cookie yang memerlukan HTTPS di lingkungan non-HTTPS
    }
  }

  console.log("[ClearSession] Cookie sesi dihapus → redirect /login");
  return response;
}
