import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/clear-session
 *
 * Hard session clear — menghapus semua cookie sesi NextAuth v4 + v5
 * dengan mengirimkan header Set-Cookie maxAge=0 ke semua kombinasi domain.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl, { status: 302 });

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

  // Pastikan menghapus cookie di domain root maupun wildcard
  // Jika URL localhost, hapus domain-nya, karena localhost tidak butuh dot prefix
  const hostname = url.hostname;
  const domains = hostname === "localhost" 
    ? [undefined, "localhost"] 
    : [undefined, hostname, `.${hostname}`, `www.${hostname.replace('www.', '')}`];

  for (const name of cookieNames) {
    for (const domain of domains) {
      let cookieStr = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      
      // Cookie dengan awalan __Host- tidak boleh memiliki atribut Domain
      if (domain && !name.startsWith("__Host-")) {
        cookieStr += `; Domain=${domain}`;
      }
      
      if (name.startsWith("__Secure-") || name.startsWith("__Host-")) {
        cookieStr += `; Secure`;
      }

      response.headers.append("Set-Cookie", cookieStr);
    }
  }

  console.log("[ClearSession] Sent strict Set-Cookie headers to blast session.");
  return response;
}
