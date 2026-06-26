import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAIN_DOMAIN  = "https://nokosku.id";
const ADMIN_DOMAIN = "https://admin.nokosku.id";

export default auth(async (req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn   = !!req.auth;
  const isAdmin      = req.auth?.user?.role === "ADMIN";

  // ── Deteksi admin subdomain ────────────────────────────────────────────────
  const hostHeader   = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const isAdminSubdomain = hostHeader.startsWith("admin.");

  if (isAdminSubdomain) {
    // ── 1. Akses ke admin.nokosku.id/login → selalu redirect ke domain utama ─
    //    (rute /login tidak ada di dalam path admin → harus diarahkan ke nokosku.id/login)
    if (pathname === "/login" || pathname.startsWith("/login")) {
      const loginUrl = new URL(`${MAIN_DOMAIN}/login`);
      // Sertakan callbackUrl agar setelah login user kembali ke admin dashboard
      loginUrl.searchParams.set("callbackUrl", `${ADMIN_DOMAIN}/`);
      return NextResponse.redirect(loginUrl);
    }

    // ── 2. Unauthenticated → redirect mutlak ke nokosku.id/login ─────────────
    //    (TIDAK boleh redirect ke admin.nokosku.id/login karena rute itu tidak ada)
    if (!isLoggedIn) {
      const loginUrl = new URL(`${MAIN_DOMAIN}/login`);
      // callbackUrl menunjuk kembali ke halaman admin yang ingin diakses
      loginUrl.searchParams.set(
        "callbackUrl",
        `${ADMIN_DOMAIN}${pathname === "/" ? "/" : pathname}`
      );
      return NextResponse.redirect(loginUrl);
    }

    // ── 3. Sudah login tapi bukan admin → redirect ke dashboard utama ─────────
    if (!isAdmin) {
      return NextResponse.redirect(new URL(`${MAIN_DOMAIN}/dashboard`));
    }

    // ── 4. Admin yang sudah login → rewrite ke /admin/* internal path ─────────
    const adminPath      = pathname === "/" ? "/admin" : `/admin${pathname}`;
    req.nextUrl.pathname = adminPath;
    return NextResponse.rewrite(req.nextUrl);
  }

  // ── Public routes (domain utama) ──────────────────────────────────────────
  const publicPrefixes = [
    "/api/auth",
    "/api/register",
    "/api/webhooks",
    "/api/appconfig/public",
    "/api/payment-methods",
    "/api/system",
    "/api/otp/quick-services",
  ];
  const publicPages = ["/", "/login", "/register", "/terms", "/maintenance"];

  const isPublicAPI  = publicPrefixes.some((p) => pathname.startsWith(p));
  const isPublicPage = publicPages.includes(pathname);
  const isPublic     = isPublicAPI || isPublicPage;

  // ── Unauthenticated → redirect ke /login ──────────────────────────────────
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Sudah login → jangan izinkan akses ke /login atau /register ───────────
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ── Non-admin → tidak boleh akses /admin internal path ───────────────────
  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth/clear-session|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.jpg$|.*\\.webp$|.*\\.woff2?$).*)",
  ],
};
