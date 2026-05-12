"use client";

import { motion } from "framer-motion";
import { HardHat } from "lucide-react";

export default function PPOBPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6 max-w-sm"
      >
        {/* Icon */}
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30"
          animate={{ rotate: [0, -4, 4, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <HardHat className="h-9 w-9 text-amber-500" />
        </motion.div>

        {/* Label */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
            Under Construction
          </p>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Fitur PPOB
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Layanan PPOB sedang dalam tahap pengembangan.
            <br />
            Silakan nantikan pembaruan kami.
          </p>
        </div>

        {/* Divider */}
        <div className="w-12 border-t border-border" />

        <p className="text-xs text-muted-foreground">
          Sementara itu, Anda tetap dapat menggunakan layanan{" "}
          <span className="font-semibold text-primary">OTP</span> yang sudah tersedia.
        </p>
      </motion.div>
    </div>
  );
}
