"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import { toast } from "sonner";
import Link from "next/link";
import {
  User, Shield, KeyRound, Mail, Gift, MessageCircle,
  ChevronRight, Loader2, LogOut, Copy, CheckCircle2, Send,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">{title}</p>;
}

// ─── Menu item ───────────────────────────────────────────────────────────────
function MenuItem({ href, Icon, label, desc, danger }: {
  href?: string; Icon: React.ElementType; label: string; desc?: string; danger?: boolean;
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border hover:bg-muted/40 transition-colors ${danger ? "text-red-500" : ""}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-red-100" : "bg-primary/10"}`}>
        <Icon className={`h-4.5 w-4.5 ${danger ? "text-red-500" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${danger ? "text-red-500" : "text-foreground"}`}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <>{inner}</>;
}

// ─── Banding Dialog ───────────────────────────────────────────────────────────
function BandingSection({ bandingPrice }: { bandingPrice: number }) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!number.trim()) { toast.error("Masukkan nomor WhatsApp"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/banding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetNumber: number.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setOpen(false);
      setNumber("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border hover:bg-muted/40 transition-colors">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
          <MessageCircle className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-foreground">Banding WhatsApp</p>
          <p className="text-xs text-muted-foreground">Kirim banding ke WhatsApp Support · {formatRupiah(bandingPrice)}</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground/50 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Nomor WhatsApp yang ingin dibanding</p>
          <p className="text-xs text-muted-foreground">
            Sistem akan mengirim pesan ke <span className="font-mono text-primary">support@support.whatsapp.com</span> atas nama nomor yang Anda masukkan.
          </p>
          <input
            type="text" placeholder="628xxx..." value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Biaya: <span className="font-bold text-foreground">{formatRupiah(bandingPrice)}</span></span>
          </div>
          <button onClick={submit} disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</> : <><Send className="h-4 w-4" /> Kirim Banding</>}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { data: session } = useSession();
  const { data: profile } = useSWR("/api/profile", fetcher);
  const { data: config } = useSWR("/api/appconfig/public", fetcher);
  const [copied, setCopied] = useState(false);

  const bandingPrice = parseFloat(config?.banding_price ?? "500");
  const referralCode = profile?.referralCode ?? session?.user?.name ?? "—";

  const copyReferral = useCallback(() => {
    navigator.clipboard?.writeText(referralCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  }, [referralCode]);

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-5 max-w-lg">

      {/* Profile Card */}
      <motion.div variants={staggerItem}
        className="rounded-2xl bg-gradient-to-br from-primary to-violet-600 p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black">
            {(session?.user?.name?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-black text-lg leading-tight truncate">{session?.user?.name ?? "Pengguna"}</p>
            <p className="text-white/70 text-xs truncate">{session?.user?.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                {(session?.user as any)?.role ?? "USER"}
              </span>
              <span className="text-white/60 text-xs">·</span>
              <span className="text-xs font-semibold">{formatRupiah(profile?.balance ?? 0)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Referral chip */}
      {referralCode !== "—" && (
        <motion.div variants={staggerItem}
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">Kode Referral</p>
            <p className="font-black text-foreground font-mono tracking-wider">{referralCode}</p>
          </div>
          <button onClick={copyReferral}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${copied ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            {copied ? <CheckCircle2 className="h-4 w-4 inline" /> : <Copy className="h-3.5 w-3.5 inline mr-1" />}
            {copied ? "Disalin!" : "Salin"}
          </button>
        </motion.div>
      )}

      {/* Menu Groups */}
      <motion.div variants={staggerItem} className="space-y-4">
        <div className="space-y-2">
          <SectionHeader title="Akun" />
          <MenuItem href="/profile/edit" Icon={User} label="Profil Pengguna" desc="Nama, foto, informasi akun" />
          <MenuItem href="/profile/security" Icon={Shield} label="Keamanan" desc="Sesi aktif & perangkat" />
          <MenuItem href="/profile/reset-password" Icon={KeyRound} label="Reset Password" desc="Ubah kata sandi Anda" />
          <MenuItem href="/profile/change-email" Icon={Mail} label="Ubah Email" desc="Ganti alamat email aktif" />
        </div>

        <div className="space-y-2">
          <SectionHeader title="Referral" />
          <MenuItem href="/profile/referral" Icon={Gift} label="Rincian Referral" desc="Komisi & daftar referral Anda" />
        </div>

        <div className="space-y-2">
          <SectionHeader title="Fitur Premium" />
          <BandingSection bandingPrice={bandingPrice} />
        </div>

        <div className="space-y-2">
          <SectionHeader title="Sesi" />
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <LogOut className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-sm font-bold text-red-500">Keluar</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
