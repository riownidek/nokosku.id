"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Copy, Loader2, XCircle, CheckCircle2 } from "lucide-react";
import useSWR from "swr";

interface OTPResultCardProps {
  orderId: string;
  number: string;
  productName: string;
  cost: number;
  expiresAt: string;
  onCancel: () => void;
  onComplete: () => void;
}

export function OTPResultCard({
  orderId,
  number,
  productName,
  expiresAt,
  onCancel,
  onComplete,
}: OTPResultCardProps) {
  const TOTAL_DURATION = 15 * 60; // 15 minutes
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const update = () => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Polling OTP status every 5s
  const { data: statusData } = useSWR(
    timeLeft > 0 ? `/api/otp/status?orderId=${orderId}` : null,
    null,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    if (statusData?.sms || statusData?.order?.status === "COMPLETED") {
      onComplete();
    }
  }, [statusData, onComplete]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch("/api/otp/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pesanan dibatalkan, saldo dikembalikan");
      onCancel();
    } catch {
      toast.error("Gagal membatalkan pesanan");
      setIsCancelling(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin`);
  };

  const progressPercent = (timeLeft / TOTAL_DURATION) * 100;
  const isUrgent = timeLeft < 120; // < 2 minutes
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // OTP received state
  if (statusData?.sms) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-7 text-center space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"
        >
          <CheckCircle2 className="h-7 w-7 text-white" />
        </motion.div>
        <div>
          <h3 className="text-lg font-bold text-emerald-700">Kode OTP Diterima!</h3>
          <p className="text-sm text-muted-foreground mt-1">Untuk nomor <span className="font-mono font-bold">{number}</span></p>
        </div>
        <motion.div
          className="mx-auto flex w-fit cursor-pointer items-center justify-center gap-4 rounded-xl border-2 border-emerald-200 bg-white px-8 py-4 shadow-sm hover:border-emerald-400 transition-colors"
          onClick={() => copyToClipboard(statusData.sms, "Kode OTP")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <span className="text-4xl font-black tracking-widest text-foreground">{statusData.sms}</span>
          <Copy className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </motion.div>
    );
  }

  // Expired state
  if (timeLeft <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-red-500/30 bg-red-50 p-7 text-center"
      >
        <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <h3 className="text-lg font-bold text-destructive">Waktu Habis</h3>
        <p className="mt-2 text-sm text-muted-foreground">Saldo Anda sudah dikembalikan secara otomatis.</p>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={onCancel}
          className="mt-5 rounded-xl border border-border bg-background px-6 py-2.5 text-sm font-semibold hover:bg-muted"
        >
          Tutup
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="rounded-2xl border border-border bg-card p-7 shadow-sm"
    >
      <div className="flex flex-col items-center space-y-6 text-center">
        <div>
          <h3 className="text-lg font-bold text-foreground">{productName}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Menunggu SMS masuk...</p>
        </div>

        {/* Number display */}
        <motion.div
          className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 px-8 py-4 hover:border-primary/40 transition-colors"
          onClick={() => copyToClipboard(number, "Nomor")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <span className="text-3xl font-black tracking-wider text-primary">{number}</span>
          <Copy className="h-4 w-4 text-primary/60" />
        </motion.div>

        {/* Listening pulse */}
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <motion.div
            className="flex h-2 w-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-sm">Sedang mendengarkan pesan...</span>
        </div>

        {/* Countdown progress */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Sisa Waktu</span>
            <motion.span
              className={isUrgent ? "font-bold text-red-500" : "text-muted-foreground"}
              animate={isUrgent ? { opacity: [1, 0.4, 1] } : {}}
              transition={isUrgent ? { duration: 0.8, repeat: Infinity } : {}}
            >
              {minutes}:{seconds.toString().padStart(2, "0")}
            </motion.span>
          </div>
          {/* Smooth progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: isUrgent
                  ? "linear-gradient(90deg, #EF4444, #F97316)"
                  : "linear-gradient(90deg, #4F46E5, #7C3AED)",
              }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        </div>

        {/* Cancel */}
        <motion.button
          onClick={handleCancel}
          disabled={isCancelling || timeLeft < 10}
          whileHover={timeLeft >= 10 ? { scale: 1.02 } : {}}
          whileTap={timeLeft >= 10 ? { scale: 0.97 } : {}}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Batalkan & Refund
        </motion.button>
        <p className="text-[11px] text-muted-foreground -mt-2">Tidak tersedia di 10 detik terakhir</p>
      </div>
    </motion.div>
  );
}
