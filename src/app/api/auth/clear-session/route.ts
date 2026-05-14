import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

/**
 * Hard session clear — menghapus semua cookie sesi NextAuth secara eksplisit.
 * Digunakan sebagai fallback ketika signOut() NextAuth terjebak redirect loop.
 *
 * NextAuth v5 menggunakan nama cookie berbeda dari v4:
 *   - authjs.session-token          (HTTP)
 *   - __Secure-authjs.session-token (HTTPS/production)
 *   - next-auth.session-token       (legacy v4)
 *   - __Secure-next-auth.session-token (legacy v4 HTTPS)
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();

  // Daftar semua kemungkinan nama cookie sesi NextAuth v4 + v5
  const sessionCookies = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    // Legacy NextAuth v4
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];

  // Hapus setiap cookie
  for (const name of sessionCookies) {
    cookieStore.delete(name);
  }

  console.log("[ClearSession] Semua cookie sesi telah dihapus.");

  // Redirect ke /login setelah cookie dihapus
  const loginUrl = new URL("/login", NEXTAUTH_URL);
  return NextResponse.redirect(loginUrl, { status: 302 });
}
