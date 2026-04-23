"use client";

import { motion } from "framer-motion";
import { Gift, Copy, CheckCircle2, Users } from "lucide-react";
import { useState, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReferralPage() {
  const { data: profile } = useSWR("/api/profile", fetcher);
  const [copied, setCopied] = useState(false);

  const referralCode = profile?.referralCode ?? "—";
  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${referralCode}` : "";

  const copyCode = useCallback(() => {
    navigator.clipboard?.writeText(referralCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
    toast.success("Kode referral disalin!");
  }, [referralCode]);

  const copyLink = useCallback(() => {
    navigator.clipboard?.writeText(referralLink).then(() => {
      toast.success("Link referral disalin!");
    });
  }, [referralLink]);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" /> Rincian Referral
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ajak teman dan dapatkan bonus saldo</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

        {/* Kode Referral */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Kode Referral Anda</p>
            <p className="text-4xl font-black text-primary tracking-widest font-mono">{referralCode}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyCode}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all
                ${copied ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Disalin!" : "Salin Kode"}
            </button>
            <button onClick={copyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-bold hover:bg-muted transition-colors">
              <Copy className="h-4 w-4" /> Salin Link
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Referral", value: profile?.referralCount ?? "0", Icon: Users, color: "text-primary" },
            { label: "Bonus Didapat", value: formatRupiah(profile?.referralBonus ?? 0), Icon: Gift, color: "text-emerald-500" },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <Icon className={`h-5 w-5 ${color}`} />
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4">
          <p className="text-sm font-bold text-primary mb-1">Cara Kerja Referral</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bagikan kode unik Anda kepada teman. Setiap teman yang mendaftar menggunakan kode Anda, Anda akan mendapatkan bonus saldo secara otomatis.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
