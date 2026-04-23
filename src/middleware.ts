import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";

  // ── Public routes — tidak memerlukan sesi aktif ───────────────────────────
  // API: semua /api/auth/*, /api/register, /api/webhooks/*, /api/appconfig/public
  // Pages: /, /login, /register, /terms
  const publicPrefixes = [
    "/api/auth",             // NextAuth internals
    "/api/register",         // Registrasi akun baru
    "/api/webhooks",         // Webhook Pakasir
    "/api/appconfig/public", // Banner & config publik
    "/api/payment-methods",  // Metode deposit (diperlukan di Step 2 wizard)
  ];
  const publicPages = ["/", "/login", "/register", "/terms"];

  const isPublicAPI = publicPrefixes.some((p) => pathname.startsWith(p));
  const isPublicPage = publicPages.includes(pathname);
  const isPublic = isPublicAPI || isPublicPage;

  // ── Unauthenticated → redirect ke login (kecuali halaman/API publik) ──────
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
  // Matcher: jalankan middleware di semua path KECUALI:
  // - _next/static (aset JS/CSS)
  // - _next/image (image optimizer)
  // - favicon & file statis (.png, .svg, .ico, .jpg, .webp, .woff, .woff2)
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.jpg$|.*\\.webp$|.*\\.woff2?$).*)",
  ],
};
