import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { Toaster } from "sonner";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #1E1B4B 100%)",
        }}
      >
        {/* Dot grid decoration */}
        <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Soft ambient glow blobs */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #4F46E5 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)" }} />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              <span className="text-sm font-black text-white">N</span>
            </div>
            <span className="text-xl font-black tracking-tight text-white">NOKOSMU</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-3xl font-black text-white leading-tight">
              OTP & PPOB<br />
              <span className="text-indigo-400">Premium.</span><br />
              Instan. Terpercaya.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/50 max-w-xs">
              Lebih dari 1.700 layanan verifikasi virtual number dan produk digital tersedia dalam satu platform. Refund otomatis jika gagal.
            </p>
          </div>

          {/* Stats card — glassmorphism */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { value: "1.700+", label: "Layanan" },
                { value: "99.9%", label: "Uptime" },
                { value: "<60s",  label: "OTP Tiba" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/20">© {new Date().getFullYear()} NOKOSMU. Hak cipta dilindungi.</p>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12"
        style={{ background: "hsl(var(--background))" }}
      >
        {children}
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(14,30,62,0.12)",
          },
        }}
      />
    </div>
  );
}
