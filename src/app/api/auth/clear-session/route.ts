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
  
  // Menggunakan relative path untuk menghindari isu proksi Render (localhost:10000)
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

  // Pastikan menghapus cookie di domain root maupun wildcard
  // Gunakan header 'x-forwarded-host' atau 'host' agar tidak membaca 'localhost' saat di balik proksi Render
  const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const realHostname = hostHeader ? hostHeader.split(":")[0] : url.hostname;
  
  const domains = realHostname === "localhost" 
    ? [undefined, "localhost"] 
    : [undefined, realHostname, `.${realHostname}`, `www.${realHostname.replace('www.', '')}`];

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
