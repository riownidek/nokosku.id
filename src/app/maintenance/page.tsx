import Link from "next/link";
import { Wrench, Clock, Home } from "lucide-react";

export const metadata = {
  title: "Dalam Pemeliharaan | NOKOSKU",
  description: "Situs sedang dalam pemeliharaan. Kami akan segera kembali.",
  robots: "noindex",
};

export default function MaintenancePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, hsl(230,25%,6%) 0%, hsl(245,30%,10%) 50%, hsl(260,25%,8%) 100%)",
      }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(99,102,241,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))",
              border: "1px solid rgba(99,102,241,0.3)",
              boxShadow: "0 0 40px rgba(99,102,241,0.15)",
            }}
          >
            <Wrench className="h-11 w-11 text-indigo-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Sedang Pemeliharaan
          </h1>
          <p className="text-base leading-relaxed text-white/60">
            Situs sedang dalam pemeliharaan rutin. Kami akan segera kembali.
            Terima kasih atas kesabaran Anda.
          </p>
        </div>

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-sm font-semibold text-amber-400">
            Pemeliharaan Sedang Berlangsung
          </span>
          <Clock className="h-4 w-4 text-amber-400" />
        </div>

        {/* Divider */}
        <div
          className="h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
        />

        {/* Footer */}
        <p className="text-xs text-white/30">
          Butuh bantuan mendesak?{" "}
          <a
            href="https://t.me/infonokoskuid"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 font-semibold hover:underline"
          >
            Hubungi CS via Telegram
          </a>
        </p>
      </div>
    </div>
  );
}
