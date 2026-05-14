"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Wallet,
  Loader2, QrCode, CreditCard, RefreshCw, Download,
  Building2, Info, Clock,
} from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate as globalMutate } from "swr";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const QUICK = [20000, 50000, 100000, 250000, 500000, 1000000];

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = ["Jumlah", "Metode", "Konfirmasi"];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black transition-all
                ${done ? "bg-primary text-white" : active ? "bg-primary text-white ring-4 ring-primary/20" : "bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : idx}
              </div>
              <span className={`mt-1 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`h-0.5 w-10 mx-1 mb-4 transition-all ${step > idx ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STEP 1: Pilih Nominal ──────────────────────────────────────────────────────────────
function Step1Amount({ amount, setAmount, onNext, minDeposit }: {
  amount: number; setAmount: (v: number) => void; onNext: () => void; minDeposit: number;
}) {
  const [raw, setRaw] = useState(amount > 0 ? String(amount) : "");

  const handleInput = (val: string) => {
    const num = parseInt(val.replace(/\D/g, "")) || 0;
    setRaw(val.replace(/\D/g, ""));
    setAmount(num);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-foreground">Pilih Nominal Deposit</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Minimal {formatRupiah(minDeposit)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {QUICK.map((val) => (
          <button key={val} onClick={() => { setAmount(val); setRaw(String(val)); }}
            className={`rounded-xl border py-2.5 text-xs font-bold transition-all
              ${amount === val ? "border-primary bg-primary text-white shadow-md" : "border-border bg-card hover:border-primary/40"}`}>
            {formatRupiah(val)}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Atau masukkan nominal lain</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">Rp</span>
          <input type="text" placeholder={String(minDeposit)} value={raw}
            onChange={(e) => handleInput(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-3 text-lg font-black focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>
      </div>

      <button onClick={onNext} disabled={amount < minDeposit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors">
        Lanjutkan <ChevronRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// ─── STEP 2: Pilih Metode ─────────────────────────────────────────────────────
function Step2Method({ amount, selectedCode, onSelect, onNext, onBack }: {
  amount: number; selectedCode: string;
  onSelect: (m: any) => void; onNext: () => void; onBack: () => void;
}) {
  const { data, isLoading } = useSWR("/api/payment-methods", fetcher);
  const methods: any[] = data?.methods ?? [];

  const indonesia = methods.filter((m) => m.category === "indonesia");
  const crypto = methods.filter((m) => m.category === "crypto");

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-foreground">Pilih Metode Pembayaran</h2>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">Nominal: <span className="font-bold text-foreground">{formatRupiah(amount)}</span></p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {/* Pembayaran Indonesia */}
          {indonesia.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Pembayaran Indonesia</p>
              <div className="space-y-2">
                {indonesia.map((m) => (
                  <button key={m.code} onClick={() => onSelect(m)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all
                      ${selectedCode === m.code ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/30"}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <QrCode className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{m.name}</p>
                      <p className="text-xs text-primary">Biaya admin {m.adminFeePercent}%</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground">~{m.estimasiMenit} menit</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Crypto */}
          {crypto.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Pembayaran Crypto Currency</p>
              <div className="space-y-2">
                {crypto.map((m) => (
                  <button key={m.code} onClick={() => onSelect(m)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all
                      ${selectedCode === m.code ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200" : "border-border bg-card hover:border-emerald-300"}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">Biaya admin {m.adminFeePercent}%</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground">~{m.estimasiMenit} menit</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {methods.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">Tidak ada metode tersedia</div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>
        <button onClick={onNext} disabled={!selectedCode}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors">
          Lanjutkan <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── STEP 3: Konfirmasi ──────────────────────────────────────────────────────
function Step3Confirm({ amount, method, onConfirm, onBack, isProcessing }: {
  amount: number; method: any; onConfirm: () => void; onBack: () => void; isProcessing: boolean;
}) {
  const adminFee = Math.ceil(amount * (method?.adminFeePercent ?? 0) / 100);
  const total = amount + adminFee;
  const now = new Date();

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-black text-foreground">Konfirmasi Pembayaran</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Periksa kembali informasi pembayaran deposit</p>
      </div>

      {/* Detail Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-center text-base font-black">Detail Pembayaran</h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Metode</span>
            <span className="font-bold">{method?.name ?? "—"}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tanggal Transaksi</p>
            <p className="font-semibold text-sm">
              {now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })},{" "}
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-semibold">IDR</p>
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nominal</span>
            <span className="font-semibold">{formatRupiah(amount)} IDR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Biaya Admin</span>
            <span className="font-semibold">{formatRupiah(adminFee)} IDR</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="font-bold">Total Pembayaran</span>
            <span className="font-black text-primary">{formatRupiah(total)} IDR</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">Gateway pembayaran oleh NOKOSKU</p>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>
        <button onClick={onConfirm} disabled={isProcessing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-60 hover:bg-primary/90 transition-colors">
          {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : <><CheckCircle2 className="h-4 w-4" /> Konfirmasi</>}
        </button>
      </div>
    </motion.div>
  );
}

// ─── STEP 4: Payment QR / Instructions ──────────────────────────────────────
function Step4Payment({ result, amount, method, onReset }: {
  result: any; amount: number; method: any; onReset: () => void;
}) {
  const router = useRouter();
  const [checkStatus, setCheckStatus] = useState<"idle"|"pending"|"success"|"failed">("idle");
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const adminFee = Math.ceil(amount * (method?.adminFeePercent ?? 0) / 100);
  const total = amount + adminFee;

  const doCheck = useCallback(async (isManual = false) => {
    if (!result?.orderId) return;
    if (isManual) setChecking(true);
    try {
      const res = await fetch(`/api/deposit/check?orderId=${result.orderId}`);
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setCheckStatus("success");
        // Hentikan polling
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Refresh saldo di header
        await globalMutate("/api/profile");
        toast.success("💰 Pembayaran dikonfirmasi! Saldo Anda telah diperbarui.");
        // Redirect ke riwayat setelah 2 detik
        setTimeout(() => router.push("/history"), 2000);
      } else if (data.status === "FAILED") {
        setCheckStatus("failed");
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (isManual) toast.error("Pembayaran gagal atau expired.");
      } else {
        if (isManual) {
          setCheckStatus("idle");
          toast.info("Pembayaran belum terkonfirmasi. Sistem akan terus memeriksa otomatis.");
        }
      }
    } catch {
      if (isManual) toast.error("Gagal menghubungi server.");
    } finally {
      if (isManual) setChecking(false);
    }
  }, [result?.orderId, router]);

  // Auto-polling setiap 5 detik
  useEffect(() => {
    if (!result?.orderId || checkStatus === "success" || checkStatus === "failed") return;
    // Cek pertama kali langsung
    doCheck(false);
    intervalRef.current = setInterval(() => doCheck(false), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [result?.orderId, checkStatus, doCheck]);

  const handleCheck = () => doCheck(true);

  // ── Tentukan tipe konten yang ditampilkan ─────────────────────────────────
  const isValidUrl = (s?: string) => !!s && (s.startsWith("http://") || s.startsWith("https://"));
  const showQR       = !!result?.qrUrl;
  const showGateway  = isValidUrl(result?.paymentUrl);
  const showInstruction = !!result?.instruction;
  const showVA       = !!result?.vaNumber;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">Harap membayar sebelum waktu kadaluarsa yang ditentukan agar saldo dapat di proses</p>
      </div>

      {/* QR Code — hanya tampil jika qrUrl berisi URL gambar QR */}
      {showQR && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#1565C0,#1976D2)" }}>
          <div className="p-5 text-center">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <QrCode className="h-5 w-5 text-white" />
                <span className="text-white font-black text-sm">QRIS</span>
              </div>
              <span className="text-white/70 text-xs">GPN</span>
            </div>
            <p className="text-white font-bold text-sm mb-4">{result?.nmid ?? "NOKOSKU"}</p>
            <div className="bg-white rounded-2xl p-4 mx-auto inline-block">
              <QRCode value={result.qrUrl} size={192} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 192 192`} />
            </div>
            <p className="text-white/70 text-xs mt-3">{result?.nmid && `NMID: ${result.nmid}`}</p>
          </div>
        </div>
      )}

      {/* Gateway URL — hanya jika benar-benar URL HTTP */}
      {showGateway && (
        <a href={result.paymentUrl} target="_blank" rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
          <Wallet className="h-4 w-4" /> Buka Halaman Pembayaran →
        </a>
      )}

      {/* Instruksi teks (crypto/transfer manual) — tampil sebagai TEKS, bukan link */}
      {showInstruction && (
        <div className="rounded-2xl border border-border bg-muted p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-bold text-foreground">Instruksi Pembayaran</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{result.instruction}</p>
        </div>
      )}

      {/* VA Number */}
      {showVA && (
        <div className="rounded-2xl bg-muted p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Nomor Virtual Account</p>
          <p className="text-2xl font-black font-mono tracking-widest text-primary">{result.vaNumber}</p>
        </div>
      )}

      {/* Fallback: tidak ada data sama sekali */}
      {!showQR && !showGateway && !showInstruction && !showVA && (
        <div className="rounded-2xl bg-muted p-6 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Menunggu konfirmasi dari penyedia pembayaran</p>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-border px-4 py-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="font-black text-foreground">{formatRupiah(total)} IDR</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onReset}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
          Batalkan
        </button>
        {showQR && result?.qrUrl && (
          <a href={result.qrUrl} download
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
            <Download className="h-4 w-4" /> Download
          </a>
        )}
      </div>

      {/* Auto-polling status + Manual check */}
      <div className="space-y-2">
        {checkStatus !== "success" && checkStatus !== "failed" && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700 font-semibold">Memeriksa pembayaran otomatis setiap 5 detik...</p>
          </div>
        )}
        <button onClick={handleCheck} disabled={checking || checkStatus === "success"}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors disabled:opacity-60
            ${checkStatus === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : checkStatus === "failed" ? "border-red-300 bg-red-50 text-red-600" : "border-border text-muted-foreground hover:bg-muted"}`}>
          {checking
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengecek...</>
            : checkStatus === "success" ? <><CheckCircle2 className="h-4 w-4" /> Pembayaran Dikonfirmasi! Mengalihkan...</>
            : checkStatus === "failed" ? <>❌ Pembayaran Gagal/Expired</>
            : <><RefreshCw className="h-4 w-4" /> Cek Sekarang (Manual)</>}
        </button>
        <p className="text-center text-[10px] text-muted-foreground">
          Jangan batalkan apabila sudah membayar. Saldo otomatis masuk dalam 5–60 detik.
        </p>
      </div>

      {/* Detail */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-2 text-sm">
        <h4 className="font-bold text-foreground">Detail Pembayaran</h4>
        <div className="flex justify-between"><span className="text-muted-foreground">Nominal</span><span className="font-semibold">{formatRupiah(amount)} IDR</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Biaya Admin</span><span className="font-semibold">{formatRupiah(adminFee)} IDR</span></div>
        <div className="flex justify-between border-t border-border pt-2"><span className="font-bold">Total</span><span className="font-black text-primary">{formatRupiah(total)} IDR</span></div>
      </div>
    </motion.div>
  );
}

// ─── MAIN Wizard Component ────────────────────────────────────────────────────
export default function DepositPage() {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Ambil minDeposit dinamis dari AppConfig
  const { data: pubConfig } = useSWR("/api/appconfig/public", fetcher, { revalidateOnFocus: false });
  const minDeposit = parseInt(pubConfig?.min_deposit_amount ?? "0") || 10_000;

  const handleConfirm = async () => {
    if (!method || amount < minDeposit) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: method.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat invoice");
      setResult(data);
      setStep(4);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => { setStep(1); setAmount(0); setMethod(null); setResult(null); };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" /> Top Up Saldo
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Isi saldo dengan cepat & aman</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Step indicator (hanya di step 2 & 3) */}
        {(step === 2 || step === 3) && <StepIndicator step={step} />}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1Amount key="s1" amount={amount} setAmount={setAmount}
              minDeposit={minDeposit}
              onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2Method key="s2" amount={amount} selectedCode={method?.code ?? ""}
              onSelect={setMethod} onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <Step3Confirm key="s3" amount={amount} method={method}
              onConfirm={handleConfirm} onBack={() => setStep(2)} isProcessing={isProcessing} />
          )}
          {step === 4 && result && (
            <Step4Payment key="s4" result={result} amount={amount} method={method} onReset={reset} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
