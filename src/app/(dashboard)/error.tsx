"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md text-center"
      >
        <div
          className="rounded-3xl p-8 space-y-5"
          style={{
            background: "hsl(var(--card))",
            boxShadow: "0 2px 4px rgba(14,30,62,0.04), 0 8px 24px rgba(14,30,62,0.07)",
            border: "1px solid rgba(14,30,62,0.06)",
          }}
        >
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Ups, Ada Masalah</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Terjadi kesalahan yang tidak terduga. Tim kami sudah diberitahu.
            </p>
            {error?.digest && (
              <p className="mt-1 text-[11px] font-mono text-muted-foreground/60">
                ID: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
          <div>
            <a href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
              ← Kembali ke Dashboard
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
