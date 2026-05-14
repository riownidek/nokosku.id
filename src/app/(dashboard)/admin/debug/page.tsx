"use client";

import { useState, useEffect } from "react";
import { checkEnvironment, fetchRawPakasir } from "./actions";
import { Copy, Code2, Server, Key, Webhook, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DebugPage() {
  const [envData, setEnvData] = useState<any>(null);
  const [orderId, setOrderId] = useState("");
  const [rawResult, setRawResult] = useState("");
  const [loadingPakasir, setLoadingPakasir] = useState(false);
  const [loadingSim, setLoadingSim] = useState(false);
  const [simLog, setSimLog] = useState("");

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/pakasir` : "Memuat...";

  useEffect(() => {
    checkEnvironment()
      .then(setEnvData)
      .catch((err) => toast.error("Gagal memuat status environment: " + err.message));
  }, []);

  const handleCopyWebhook = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL disalin!");
    }
  };

  const handleFetchPakasir = async () => {
    if (!orderId) {
      toast.error("Masukkan Order ID");
      return;
    }
    setLoadingPakasir(true);
    setRawResult("Loading...");
    try {
      const res = await fetchRawPakasir(orderId);
      if (res.success) {
        setRawResult(JSON.stringify(res.data, null, 2));
      } else {
        setRawResult(`ERROR:\n${res.error}`);
      }
    } catch (e: any) {
      setRawResult(`FATAL ERROR:\n${e.message}`);
    }
    setLoadingPakasir(false);
  };

  const handleSimulateWebhook = async () => {
    setLoadingSim(true);
    setSimLog("Mengirim payload tiruan ke /api/webhooks/pakasir...\n");
    try {
      const payload = {
        order_id: "TEST-SIM-001",
        status: "completed",
        amount: 5000,
      };
      const response = await fetch("/api/webhooks/pakasir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      setSimLog(
        (prev) =>
          prev +
          `Status HTTP: ${response.status}\n\nRespons JSON:\n${JSON.stringify(
            data,
            null,
            2
          )}`
      );
    } catch (err: any) {
      setSimLog((prev) => prev + `\nFATAL ERROR: ${err.message}`);
    }
    setLoadingSim(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Debug & Sinkronisasi Sistem</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Halaman khusus admin untuk memantau status webhook dan API eksternal.
        </p>
      </div>

      {/* MODAL 1: ENVIRONMENT CHECKER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border bg-muted/30 px-5 py-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">1. Status Variabel Lingkungan</h2>
        </div>
        <div className="p-5">
          {!envData ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa environment...
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(envData).map(([key, value]: any) => {
                const isSuccess = value.includes("Tersedia");
                return (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-background border border-border">
                    <div className="flex items-center gap-2 mb-2 sm:mb-0">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono font-bold">{key}</span>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        isSuccess ? "bg-green-100 text-green-700" : value.includes("Not Set") ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* MODAL 2: WEBHOOK GUIDE */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border bg-muted/30 px-5 py-4 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-indigo-500" />
          <h2 className="font-bold text-foreground">2. Panduan Webhook Pakasir</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Salin URL berikut dan tempel di Dasbor Pakasir (Menu Webhook / IPN) agar sistem dapat menerima notifikasi deposit otomatis:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-xl bg-background border border-border p-3 font-mono text-sm text-primary overflow-x-auto">
              {webhookUrl}
            </div>
            <button
              onClick={handleCopyWebhook}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shrink-0"
            >
              <Copy className="h-4 w-4" /> Copy URL
            </button>
          </div>
        </div>
      </motion.div>

      {/* MODAL 3: PAKASIR PAYLOAD INSPECTOR */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border bg-muted/30 px-5 py-4 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-emerald-500" />
          <h2 className="font-bold text-foreground">3. Inspektur Payload Pakasir</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Gunakan fitur ini untuk menembak API Pakasir secara langsung dan melihat data mentahnya (Raw JSON). Ini berguna untuk memastikan parameter status apa yang sebenarnya dikirim oleh Pakasir.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Masukkan Order ID / Reference ID Pakasir"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleFetchPakasir}
              disabled={loadingPakasir}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
            >
              {loadingPakasir ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Ambil Data Mentah
            </button>
          </div>

          {rawResult && (
            <div className="mt-4 rounded-xl bg-[#1e1e1e] border border-border p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                {rawResult}
              </pre>
            </div>
          )}
        </div>
      </motion.div>

      {/* MODAL 4: WEBHOOK SIMULATOR */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border bg-muted/30 px-5 py-4 flex items-center gap-2">
          <Play className="h-5 w-5 text-orange-500" />
          <h2 className="font-bold text-foreground">4. Simulator Webhook Lokal</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Kirimkan payload dummy (tiruan) ke rute <code>/api/webhooks/pakasir</code> untuk menguji apakah fungsi pembaruan saldo bekerja tanpa error.
          </p>
          <button
            onClick={handleSimulateWebhook}
            disabled={loadingSim}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loadingSim ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
            Simulasikan Webhook Pakasir (TEST-SIM-001)
          </button>

          {simLog && (
            <div className="mt-4 rounded-xl bg-[#1e1e1e] border border-border p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-orange-300 whitespace-pre-wrap break-all">
                {simLog}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
