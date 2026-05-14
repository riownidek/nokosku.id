import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Baca status maintenance langsung dari Supabase REST (tanpa Prisma agar edge-safe)
async function isMaintenanceMode(): Promise<boolean> {
  try {
    const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!dbUrl || !dbKey) return false;
    const res = await fetch(
      `${dbUrl}/rest/v1/app_configs?key=eq.maintenance_mode&select=value`,
      { headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}` }, cache: "no-store" }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data?.[0]?.value === "true";
  } catch {
    return false;
  }
}

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
  const publicPages = ["/", "/login", "/register", "/terms", "/maintenance"];

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

  // ── Maintenance mode — hanya Admin yang boleh masuk ──────────────────────
  const isMaintenance = await isMaintenanceMode();
  if (isMaintenance && !isAdmin && pathname !== "/maintenance" && !isPublic) {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }
  // Jika maintenance aktif dan Admin mencoba akses /maintenance, arahkan ke dashboard
  if (isMaintenance && isAdmin && pathname === "/maintenance") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Matcher: jalankan middleware di semua path KECUALI:
  // - /api/auth/clear-session (agar NextAuth tidak mengintervensi dan memperbarui cookie)
  // - _next/static (aset JS/CSS)
  // - _next/image (image optimizer)
  // - favicon & file statis
  matcher: [
    "/((?!api/auth/clear-session|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.jpg$|.*\\.webp$|.*\\.woff2?$).*)",
  ],
};
