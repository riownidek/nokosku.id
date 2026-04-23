"use client";

import { motion } from "framer-motion";
import { Shield, Monitor, Smartphone } from "lucide-react";
import { useSession } from "next-auth/react";

export default function SecurityPage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Keamanan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola keamanan akun Anda</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-5">

        {/* Status akun */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Status Akun</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-700">Sesi Aktif</span>
              </div>
              <span className="text-xs text-emerald-600 font-mono">{session?.user?.email}</span>
            </div>
          </div>
        </div>

        {/* Perangkat */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Perangkat Terdeteksi</p>
          <div className="space-y-2">
            {[
              { Icon: Monitor, label: "Browser Web", desc: "Sesi saat ini", active: true },
              { Icon: Smartphone, label: "Mobile App", desc: "Tidak ada sesi aktif", active: false },
            ].map(({ Icon, label, desc, active }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                {active && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground border-t border-border pt-4">
          Jika Anda curiga ada aktivitas mencurigakan, segera ubah password Anda dan hubungi admin.
        </p>
      </motion.div>
    </div>
  );
}
