"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/motion";
import {
  Code2, BookOpen, Zap, ChevronDown, ChevronUp,
  Copy, CheckCheck, Terminal, Globe,
} from "lucide-react";

// ─── Data Dokumentasi ────────────────────────────────────────────────────────

const BASE_URL = "https://www.nokosku.id";

const endpoints = [
  {
    id: "balance",
    method: "GET",
    path: "/api/user/profile",
    title: "Cek Saldo & Profil",
    description:
      "Mengambil data profil pengguna yang sedang login, termasuk saldo aktif (IDR), nama, email, dan role akun.",
    auth: "Required — Cookie Session (NextAuth)",
    requestExample: `GET ${BASE_URL}/api/user/profile
Authorization: Cookie (NextAuth Session)
Content-Type: application/json`,
    responseExample: `{
  "id": "clxxxx1234",
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "balance": 250000,
  "role": "USER",
  "referralCode": "BUD123",
  "createdAt": "2025-01-15T08:30:00.000Z"
}`,
    errorExamples: [
      { code: 401, body: `{ "error": "Unauthorized" }` },
    ],
  },
  {
    id: "otp-buy",
    method: "POST",
    path: "/api/otp/buy",
    title: "Pemesanan Nomor OTP",
    description:
      "Memesan nomor virtual dari Hero-SMS untuk keperluan verifikasi OTP. Saldo pengguna akan terpotong secara otomatis. Nomor aktif selama 5 menit.",
    auth: "Required — Cookie Session (NextAuth)",
    requestExample: `POST ${BASE_URL}/api/otp/buy
Authorization: Cookie (NextAuth Session)
Content-Type: application/json

{
  "service": "wa",       // Kode layanan: wa, tg, ig, lf, go, fb
  "country": 2,          // ID Negara: 2=Indonesia, 73=Filipina, 46=Malaysia
  "serviceName": "WhatsApp (Indonesia)"
}`,
    responseExample: `{
  "success": true,
  "order": {
    "id": "ord_abc123xyz",
    "number": "628123456789",
    "providerOrderId": "123456789",
    "cost": 3500,
    "expiresAt": "2025-06-01T10:35:00.000Z"
  }
}`,
    errorExamples: [
      { code: 400, body: `{ "error": "Parameter 'service' dan 'country' wajib diisi" }` },
      { code: 402, body: `{ "error": "Saldo tidak mencukupi. Estimasi biaya: Rp 3.500, saldo Anda: Rp 1.000" }` },
      { code: 503, body: `{ "error": "Tidak ada nomor tersedia untuk layanan ini. Coba negara lain." }` },
    ],
  },
  {
    id: "otp-status",
    method: "GET",
    path: "/api/otp/status",
    title: "Cek Status OTP",
    description:
      "Mengecek status pesanan OTP yang aktif. Jika SMS sudah diterima, kode OTP akan ada di field `sms`. Jika waktu habis, saldo dikembalikan otomatis.",
    auth: "Required — Cookie Session (NextAuth)",
    requestExample: `GET ${BASE_URL}/api/otp/status?orderId=ord_abc123xyz
Authorization: Cookie (NextAuth Session)`,
    responseExample: `{
  "order": {
    "id": "ord_abc123xyz",
    "status": "COMPLETED",
    "targetData": "628123456789",
    "productName": "WhatsApp (Indonesia)",
    "cost": 3500
  },
  "sms": "123456",
  "providerStatus": "OK"
}`,
    errorExamples: [
      { code: 400, body: `{ "error": "orderId wajib diisi" }` },
      { code: 404, body: `{ "error": "Order tidak ditemukan" }` },
    ],
  },
  {
    id: "otp-cancel",
    method: "POST",
    path: "/api/otp/cancel",
    title: "Batalkan Pesanan OTP",
    description:
      "Membatalkan pesanan OTP yang masih berstatus ACTIVE atau WAITING. Saldo akan dikembalikan (refund) ke akun pengguna secara atomik.",
    auth: "Required — Cookie Session (NextAuth)",
    requestExample: `POST ${BASE_URL}/api/otp/cancel
Authorization: Cookie (NextAuth Session)
Content-Type: application/json

{
  "orderId": "ord_abc123xyz"
}`,
    responseExample: `{
  "success": true,
  "refunded": 3500
}`,
    errorExamples: [
      { code: 400, body: `{ "error": "Pesanan berstatus \\"COMPLETED\\" tidak dapat dibatalkan" }` },
      { code: 404, body: `{ "error": "Order tidak ditemukan" }` },
    ],
  },
];

const SERVICE_CODES = [
  { code: "wa", name: "WhatsApp" },
  { code: "tg", name: "Telegram" },
  { code: "ig", name: "Instagram" },
  { code: "lf", name: "TikTok" },
  { code: "go", name: "Gmail" },
  { code: "fb", name: "Facebook" },
];

const COUNTRY_CODES = [
  { id: 2, name: "Indonesia" },
  { id: 73, name: "Philippines (Filipina)" },
  { id: 46, name: "Malaysia" },
];

// ─── Helper: Copy to Clipboard ───────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
    >
      {copied ? <><CheckCheck className="h-3 w-3 text-emerald-400" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

// ─── Method Badge ─────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700",
    POST: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-black ${colors[method] ?? "bg-zinc-100 text-zinc-600"}`}>
      {method}
    </span>
  );
}

// ─── Endpoint Card ────────────────────────────────────────────────────────────

function EndpointCard({ ep }: { ep: typeof endpoints[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header (always visible) */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <MethodBadge method={ep.method} />
        <code className="flex-1 text-sm font-mono font-semibold text-foreground">{ep.path}</code>
        <span className="text-sm text-muted-foreground hidden sm:block">{ep.title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expandable detail */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {/* Description */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-sm font-bold text-foreground">{ep.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{ep.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-muted-foreground">Auth:</span>
              <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {ep.auth}
              </span>
            </div>
          </div>

          {/* Request */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Request</p>
            <div className="rounded-xl bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-400 font-mono">HTTP</span>
                </div>
                <CopyButton text={ep.requestExample} />
              </div>
              <pre className="px-4 py-3 text-xs text-zinc-200 font-mono overflow-x-auto leading-relaxed whitespace-pre">
                {ep.requestExample}
              </pre>
            </div>
          </div>

          {/* Response */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Response (200 OK)</p>
            <div className="rounded-xl bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs text-zinc-400 font-mono">JSON</span>
                </div>
                <CopyButton text={ep.responseExample} />
              </div>
              <pre className="px-4 py-3 text-xs text-zinc-200 font-mono overflow-x-auto leading-relaxed whitespace-pre">
                {ep.responseExample}
              </pre>
            </div>
          </div>

          {/* Errors */}
          {ep.errorExamples.length > 0 && (
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kemungkinan Error</p>
              <div className="space-y-2">
                {ep.errorExamples.map((err) => (
                  <div key={err.code} className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-3">
                    <span className="rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-xs font-black shrink-0">{err.code}</span>
                    <code className="text-xs text-red-800 font-mono">{err.body}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8 max-w-3xl">

      {/* Header */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Dokumentasi API</h1>
            <p className="text-sm text-muted-foreground">Panduan integrasi layanan NOKOSKU untuk developer</p>
          </div>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div variants={staggerItem}>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            <p className="font-bold text-blue-800 text-sm">Base URL</p>
          </div>
          <div className="rounded-xl bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2">
              <code className="text-sm text-emerald-400 font-mono font-bold">{BASE_URL}</code>
              <CopyButton text={BASE_URL} />
            </div>
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">
            Semua endpoint menggunakan autentikasi berbasis <strong>Cookie Session</strong> dari NextAuth.
            Pengguna harus login terlebih dahulu melalui <code className="bg-blue-100 px-1 rounded">/login</code> sebelum dapat mengakses endpoint di bawah.
          </p>
        </div>
      </motion.div>

      {/* Quick Reference Tables */}
      <motion.div variants={staggerItem} className="grid sm:grid-cols-2 gap-4">
        {/* Service Codes */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Zap className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-bold">Kode Layanan (service)</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground">Code</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground">Layanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {SERVICE_CODES.map((s) => (
                <tr key={s.code} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{s.code}</code>
                  </td>
                  <td className="px-4 py-2 text-sm text-foreground">{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Country Codes */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Globe className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-bold">ID Negara (country)</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground">ID</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground">Negara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {COUNTRY_CODES.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <code className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{c.id}</code>
                  </td>
                  <td className="px-4 py-2 text-sm text-foreground">{c.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Endpoints */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <h2 className="font-bold text-foreground">Endpoint Tersedia</h2>
          <span className="text-xs text-muted-foreground">(klik untuk expand)</span>
        </div>
        {endpoints.map((ep) => (
          <EndpointCard key={ep.id} ep={ep} />
        ))}
      </motion.div>

      {/* Footer note */}
      <motion.div variants={staggerItem}>
        <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Butuh bantuan integrasi? Hubungi tim NOKOSKU melalui halaman kontak atau Telegram admin.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
