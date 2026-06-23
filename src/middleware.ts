import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(async (req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin    = req.auth?.user?.role === "ADMIN";

  // ── Admin Subdomain Routing ────────────────────────────────────────────────
  // Jika diakses via admin.nokosku.id, rewrite ke /admin/* paths
  const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const isAdminSubdomain = hostHeader.startsWith("admin.");

  if (isAdminSubdomain) {
    // Bypass maintenance & public check untuk admin subdomain
    const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
    req.nextUrl.pathname = adminPath;
    return NextResponse.rewrite(req.nextUrl);
  }

  // ── Public routes ─────────────────────────────────────────────────────────
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

  // ── Unauthenticated → redirect ke login ──────────────────────────────────
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Sudah login → jangan izinkan akses ke /login atau /register ──────────
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ── Non-admin → tidak boleh akses /admin ─────────────────────────────────
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
