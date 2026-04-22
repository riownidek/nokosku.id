"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Check, Copy, CreditCard, Loader2, QrCode, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { staggerContainer, staggerItem } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then(r => r.json());
const QUICK_AMOUNTS = [20000, 50000, 100000, 250000, 500000, 1000000];

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("qris");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const { data: methodsData } = useSWR("/api/deposit", fetcher);
  const methods = methodsData?.methods ?? [];

  const numAmount = parseInt(amount.replace(/[^0-9]/g, "")) || 0;

  const handleDeposit = async () => {
    if (numAmount < 10000) { toast.error("Minimal deposit adalah Rp 10.000"); return; }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentResult(data);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat invoice deposit");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6 max-w-2xl">
      <motion.div variants={staggerItem}>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Top Up Saldo</h1>
        <p className="mt-1.5 text-muted-foreground">Isi saldo secara instan via QRIS atau Virtual Account. Konfirmasi otomatis.</p>
      </motion.div>

      <motion.div variants={staggerItem} className="rounded-2xl border border-border bg-card p-6 space-y-6">
        {/* Quick amounts */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground">Pilih Nominal</p>
          <div className="grid grid-cols-3 gap-2.5">
            {QUICK_AMOUNTS.map((val, i) => {
              const isSelected = numAmount === val;
              return (
                <motion.button
                  key={val}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => setAmount(String(val))}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {formatRupiah(val)}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom amount */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Atau masukkan nominal lain</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">Rp</span>
            <input
              type="text"
              placeholder="10000"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              className="block w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-lg font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Payment methods */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground">Metode Pembayaran</p>
          <div className="grid gap-2.5">
            {methods.map((m: any, i: number) => (
              <motion.button
                key={m.value}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setMethod(m.value)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 + i * 0.05 }}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  method === m.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  {m.value === "qris"
                    ? <QrCode className="h-5 w-5 text-primary" />
                    : <CreditCard className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm font-semibold text-foreground">{m.label}</span>
                </div>
                {method === m.value && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
                    <Check className="h-5 w-5 text-primary" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.button
          onClick={handleDeposit}
          disabled={numAmount < 10000 || isProcessing}
          whileHover={numAmount >= 10000 ? { scale: 1.02 } : {}}
          whileTap={numAmount >= 10000 ? { scale: 0.96 } : {}}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
            : <><Wallet className="h-4 w-4" /> Lanjutkan Pembayaran{numAmount >= 10000 ? ` — ${formatRupiah(numAmount)}` : ""}</>
          }
        </motion.button>
      </motion.div>

      {/* Payment Dialog */}
      <Dialog open={!!paymentResult} onOpenChange={open => !open && setPaymentResult(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black">Instruksi Pembayaran</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Segera selesaikan sebelum batas waktu habis.
            </DialogDescription>
          </DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center space-y-5 py-2"
          >
            <div className="w-full rounded-xl bg-primary/5 border border-primary/15 p-5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Bayar</p>
              <p className="text-4xl font-black text-primary">{formatRupiah(numAmount)}</p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">{paymentResult?.orderId}</p>
            </div>

            {paymentResult?.vaNumber && (
              <motion.div
                className="w-full cursor-pointer space-y-2"
                onClick={() => { navigator.clipboard.writeText(paymentResult.vaNumber); toast.success("VA Number disalin"); }}
              >
                <p className="text-xs font-semibold text-muted-foreground">Nomor Virtual Account</p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="flex items-center justify-between rounded-xl border-2 border-primary/20 bg-primary/5 px-5 py-3.5"
                >
                  <span className="font-mono text-2xl font-black tracking-widest">{paymentResult.vaNumber}</span>
                  <Copy className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </motion.div>
            )}

            {paymentResult?.paymentUrl && (
              <motion.a
                href={paymentResult.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                Buka Halaman Pembayaran →
              </motion.a>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Saldo masuk otomatis setelah pembayaran terverifikasi.
            </p>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
