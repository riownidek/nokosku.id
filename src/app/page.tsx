"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Smartphone, Zap, ShieldCheck, Globe, Clock, Headphones,
  ArrowRight, CheckCircle2, ChevronDown, Star, Wifi
} from "lucide-react";

// ─── Static Data ──────────────────────────────────────────────────────────────
const features = [
  { icon: Globe, title: "1.700+ Layanan", desc: "WhatsApp, Telegram, Facebook, Shopee, dan ribuan platform lainnya tersedia.", span: "lg:col-span-2" },
  { icon: Zap, title: "Respons Instan", desc: "Nomor aktif dalam hitungan detik. Kode OTP tiba kurang dari 60 detik.", span: "" },
  { icon: ShieldCheck, title: "100% Aman", desc: "Enkripsi end-to-end. Saldo dikembalikan otomatis jika pesanan gagal.", span: "" },
  { icon: Smartphone, title: "PPOB Lengkap", desc: "Pulsa, paket data, token listrik, top-up game — satu platform semua ada.", span: "" },
  { icon: Clock, title: "24/7 Aktif", desc: "Layanan berjalan sepanjang waktu tanpa maintenance terjadwal.", span: "lg:col-span-2" },
  { icon: Headphones, title: "Dukungan Prima", desc: "Tim support siap membantu via Telegram dan live chat kapan saja.", span: "" },
];

const steps = [
  { n: "01", title: "Pilih Layanan", desc: "Pilih aplikasi yang ingin Anda verifikasi dan negara asal nomor." },
  { n: "02", title: "Pilih Negara", desc: "Tersedia lebih dari 100 negara dengan ratusan operator lokal." },
  { n: "03", title: "Gunakan Nomor", desc: "Salin nomor virtual ke aplikasi target untuk verifikasi." },
  { n: "04", title: "Terima Kode", desc: "Kode OTP dikirim langsung ke dashboard Anda secara real-time." },
];

const faqs = [
  { q: "Apa itu NOKOSMU?", a: "NOKOSMU adalah platform layanan nomor virtual OTP dan produk digital (PPOB) yang memungkinkan Anda memverifikasi akun di berbagai platform tanpa menggunakan nomor pribadi." },
  { q: "Berapa lama kode OTP tiba?", a: "Umumnya kurang dari 60 detik. Jika dalam 15 menit belum diterima, saldo Anda akan dikembalikan secara otomatis." },
  { q: "Bagaimana cara mengisi saldo?", a: "Anda dapat mengisi saldo melalui QRIS atau Virtual Account dari berbagai bank. Konfirmasi deposit real-time setelah pembayaran berhasil." },
  { q: "Apakah ada sistem referral?", a: "Ya! Setiap pengguna mendapat kode referral unik. Anda mendapat komisi setiap kali referral Anda melakukan deposit." },
  { q: "Apakah layanan tersedia 24/7?", a: "Ya, platform kami beroperasi penuh sepanjang waktu tanpa downtime terjadwal." },
  { q: "Apa yang terjadi jika pesanan gagal?", a: "Sistem kami secara otomatis mengembalikan saldo ke akun Anda dalam hitungan detik jika pesanan tidak berhasil." },
];

const testimonials = [
  { name: "Reza P.", role: "Developer", text: "NOKOSMU jauh lebih mudah dari kompetitor. Tidak perlu API key untuk mulai, langsung bisa pakai." },
  { name: "Sarah M.", role: "Digital Marketer", text: "Kode OTP datang cepat sekali. Pekerjaan saya yang butuh banyak akun jadi sangat terbantu." },
  { name: "Budi K.", role: "Entrepreneur", text: "Harga bersaing dan saldo balik otomatis kalau gagal. Sudah pakai berbulan-bulan tanpa masalah." },
];

// ─── Animation Variants ───────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.0 } },
};

// ─── Hook: Magnetic/Glow cursor for cards ─────────────────────────────────────
function useCardGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: "50%", y: "50%" });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setGlowPos({
      x: `${((e.clientX - rect.left) / rect.width) * 100}%`,
      y: `${((e.clientY - rect.top) / rect.height) * 100}%`,
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    setGlowPos({ x: "50%", y: "50%" });
  }, []);

  return { ref, glowPos, onMouseMove, onMouseLeave };
}

// ─── Scroll-reveal wrapper ────────────────────────────────────────────────────
function InView({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Sticky Navbar ─────────────────────────────────────────────────────────────
function Navbar() {
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const py = useTransform(scrollY, [0, 80], [20, 12]);

  return (
    <motion.header
      className="fixed top-0 z-50 w-full"
      style={{ paddingTop: py, paddingBottom: py }}
    >
      {/* Animated backdrop */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-background/80 backdrop-blur-xl"
        style={{ opacity: bgOpacity }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
        style={{ opacity: borderOpacity }}
      />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <span className="text-sm font-black text-primary-foreground">N</span>
          </motion.div>
          <span className="text-xl font-black tracking-tight text-foreground">NOKOSMU</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {["Fitur", "Cara Kerja", "FAQ"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group"
            >
              {item}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
            </Link>
          ))}
          <Link href="/terms" className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group">
            Syarat & Ketentuan
            <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            Masuk
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
            <Link href="/register" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors">
              Daftar
            </Link>
          </motion.div>
        </div>
      </nav>
    </motion.header>
  );
}

// ─── Floating OTP Card (decorative) ───────────────────────────────────────────
function FloatingOTPCard({ delay, x, y, code }: { delay: number; x: string; y: string; code: string }) {
  return (
    <motion.div
      className="absolute hidden lg:flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-4 py-2.5 shadow-xl backdrop-blur-md text-sm font-bold text-foreground"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.8],
        y: [0, -12, -12, 0],
      }}
      transition={{ delay, duration: 4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
    >
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="font-mono tracking-widest text-primary">{code}</span>
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 30);
    mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * 30);
  };

  const words = ["Virtual", "Number", "Instan,", "Tanpa", "Ribet."];

  const heroWords = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
  };
  const wordVariant = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } as any },
  };

  return (
    <section className="relative min-h-screen overflow-hidden flex items-center" onMouseMove={handleMouseMove}>
      {/* Soft gradient background — non-interactive */}
      <div className="pointer-events-none absolute inset-0 gradient-hero" />
      {/* Dot grid — SaaS style — non-interactive */}
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-60" />

      {/* Parallax floating orbs */}
      <motion.div
        className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)", x: springX, y: springY }}
      />
      <motion.div
        className="pointer-events-none absolute -right-40 bottom-20 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", x: useTransform(springX, v => -v * 0.6), y: useTransform(springY, v => -v * 0.6) }}
      />

      {/* Floating OTP indicators */}
      <FloatingOTPCard delay={1.5} x="8%" y="25%" code="847291" />
      <FloatingOTPCard delay={4} x="76%" y="20%" code="193847" />
      <FloatingOTPCard delay={7} x="82%" y="65%" code="562104" />

      <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-20 text-center w-full">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary"
        >
          <motion.div
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          Platform OTP & PPOB #1 di Indonesia
        </motion.div>

        {/* Staggered hero title */}
        <motion.h1
          className="text-5xl font-black leading-[1.08] tracking-tight text-foreground md:text-7xl lg:text-8xl perspective-1000"
          variants={heroWords}
          initial="hidden"
          animate="visible"
        >
          {words.map((word, i) => (
            <motion.span key={i} variants={wordVariant} className="inline-block mr-[0.25em]">
              {word === "Instan," ? (
                <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
                  {word}
                </span>
              ) : word === "Tanpa" || word === "Ribet." ? (
                <span className="block">{word}</span>
              ) : word}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground"
        >
          Akses lebih dari <strong className="text-foreground">1.700 layanan</strong> verifikasi OTP dan produk digital PPOB dengan harga terbaik.{" "}
          <span className="text-primary font-semibold">Saldo kembali otomatis</span> jika gagal.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          {/* Primary CTA with glow pulse */}
          <div className="relative">
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-xl bg-primary blur-lg"
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
              <Link
                href="/register"
                className="relative inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/30"
              >
                Mulai Gratis Sekarang
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
            <Link
              href="#cara-kerja"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-8 py-4 text-base font-semibold text-foreground backdrop-blur-sm hover:bg-muted transition-colors"
            >
              Pelajari Cara Kerja
            </Link>
          </motion.div>
        </motion.div>

        {/* Trust pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm"
        >
          {["Tanpa kontrak", "Deposit mulai Rp 10.000", "Refund otomatis", "Aktif 24/7"].map((t, i) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 0.08 }}
              className="flex items-center gap-1.5 text-foreground/70 font-medium"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t}
            </motion.span>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mx-auto mt-20 grid max-w-2xl grid-cols-3 gap-8 border-t border-border/50 pt-12"
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ transitionDelay: "1.6s" }}
        >
          {[
            { value: "1.700+", label: "Layanan" },
            { value: "99.9%", label: "Uptime" },
            { value: "<60s", label: "OTP Tiba" },
          ].map((s, i) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="text-3xl font-black text-primary md:text-4xl">{s.value}</div>
              <div className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Bento Features ────────────────────────────────────────────────────────────
function GlowCard({ f, delay }: { f: typeof features[0]; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [glowPos, setGlowPos] = useState({ x: "50%", y: "50%" });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setGlowPos({
      x: `${((e.clientX - rect.left) / rect.width) * 100}%`,
      y: `${((e.clientY - rect.top) / rect.height) * 100}%`,
    });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setGlowPos({ x: "50%", y: "50%" })}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-7 cursor-default ${f.span}`}
      style={{ transition: "box-shadow 0.3s" }}
    >
      {/* Cursor-tracked internal glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
        style={{
          background: `radial-gradient(300px circle at ${glowPos.x} ${glowPos.y}, rgba(79,70,229,0.08) 0%, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
          <f.icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">{f.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
      </div>
    </motion.div>
  );
}

function Features() {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="fitur" className="py-28 md:py-36" style={{ background: "hsl(var(--background))" }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <motion.p ref={ref} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Keunggulan Platform
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
            Mengapa Pilih NOKOSMU?
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.2 }} className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Dirancang untuk kecepatan, keandalan, dan kemudahan penggunaan.
          </motion.p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <GlowCard key={f.title} f={f} delay={i * 0.07} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="cara-kerja" className="py-28 md:py-36" style={{ background: "hsl(220 15% 95%)" }}>
      <div className="mx-auto max-w-6xl px-6">
        <div ref={ref} className="mb-14 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Panduan Cepat
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
            Cara Kerjanya?
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.2 }} className="mt-4 text-muted-foreground">
            Empat langkah sederhana, selesai dalam menit.
          </motion.p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const stepRef = useRef<HTMLDivElement>(null);
            const stepInView = useInView(stepRef, { once: true, margin: "-60px" });
            return (
              <motion.div
                key={step.n}
                ref={stepRef}
                initial={{ opacity: 0, y: 30 }}
                animate={stepInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-3xl border border-border bg-card p-6 text-center"
              >
                <motion.div
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  {step.n}
                </motion.div>
                <h3 className="mb-2 font-bold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 md:py-36" style={{ background: "hsl(var(--background))" }}>
      <div className="mx-auto max-w-6xl px-6">
        <div ref={ref} className="mb-14 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Testimoni
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl font-black tracking-tight md:text-5xl">
            Kata Mereka
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.2 }} className="mt-4 text-muted-foreground">
            Dipercaya oleh ribuan pengguna aktif setiap harinya.
          </motion.p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => {
            const cardRef = useRef<HTMLDivElement>(null);
            const cardInView = useInView(cardRef, { once: true, margin: "-60px" });
            return (
              <motion.div
                key={t.name}
                ref={cardRef}
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={cardInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ delay: i * 0.07, duration: 0.55, ease: "easeOut" }}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <motion.div key={j} initial={{ opacity: 0, scale: 0 }} animate={cardInView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: i * 0.1 + j * 0.05 + 0.3 }}>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </motion.div>
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQItem({ faq, i }: { faq: { q: string; a: string }; i: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-border/60 last:border-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left font-semibold text-foreground hover:text-primary transition-colors"
      >
        {faq.q}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="faq" className="py-28 md:py-36" style={{ background: "hsl(220 15% 95%)" }}>
      <div className="mx-auto max-w-3xl px-6">
        <div ref={ref} className="mb-14 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            FAQ
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }} className="text-4xl font-black tracking-tight md:text-5xl">
            Pertanyaan Umum
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="mt-4 text-muted-foreground">
            Tidak menemukan jawaban? Hubungi tim kami.
          </motion.p>
        </div>

        <div className="rounded-3xl border border-border bg-card px-6">
          {faqs.map((faq, i) => <FAQItem key={i} faq={faq} i={i} />)}
        </div>
      </div>
    </section>
  );
}

// ─── Fast Response Section ────────────────────────────────────────────────────
const FAST_SERVICES = [
  { emoji: "💬", name: "WhatsApp",  code: "wa" },
  { emoji: "✈️", name: "Telegram",  code: "tg" },
  { emoji: "📸", name: "Instagram", code: "ig" },
];

const FAST_COUNTRIES = [
  { flag: "🇮🇩", name: "Indonesia" },
  { flag: "🇲🇾", name: "Malaysia"  },
  { flag: "🇵🇭", name: "Filipina"  },
];

// Harga statis (hardcoded) — tampil instan tanpa API
const FAST_PRICES: Record<string, Record<string, string>> = {
  wa: { Indonesia: "Rp 3.500", Malaysia: "Rp 5.000", Filipina: "Rp 4.200" },
  tg: { Indonesia: "Rp 2.800", Malaysia: "Rp 4.500", Filipina: "Rp 3.900" },
  ig: { Indonesia: "Rp 4.000", Malaysia: "Rp 6.000", Filipina: "Rp 5.200" },
};

function FastResponse() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 md:py-28 border-y border-border/50" style={{ background: "hsl(var(--background))" }}>
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div ref={ref} className="mb-12 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45 }}
              className="text-xs font-bold uppercase tracking-widest text-primary mb-2"
            >
              Populer Hari Ini
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.07 }}
              className="text-3xl font-black tracking-tight text-foreground md:text-4xl"
            >
              Layanan Terlaris
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="text-sm text-muted-foreground md:text-right max-w-xs"
          >
            Nomor aktif dalam hitungan detik.<br className="hidden md:block" />
            Mulai dari harga yang tertera.
          </motion.p>
        </div>

        {/* Table — Swiss-style grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-2xl border border-border"
        >
          {/* Header row */}
          <div className="grid border-b border-border bg-muted/50" style={{ gridTemplateColumns: "1fr repeat(3, 1fr)" }}>
            <div className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground" />
            {FAST_COUNTRIES.map((c) => (
              <div key={c.name} className="px-4 py-3.5 text-center">
                <span className="text-base">{c.flag}</span>
                <p className="mt-0.5 text-xs font-bold text-foreground">{c.name}</p>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {FAST_SERVICES.map((svc, si) => (
            <motion.div
              key={svc.code}
              initial={{ opacity: 0, x: -12 }} animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.25 + si * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
              style={{ gridTemplateColumns: "1fr repeat(3, 1fr)" }}
            >
              {/* Service name */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="text-xl">{svc.emoji}</span>
                <span className="text-sm font-bold text-foreground">{svc.name}</span>
              </div>

              {/* Prices */}
              {FAST_COUNTRIES.map((c) => (
                <div key={c.name} className="flex items-center justify-center px-4 py-4">
                  <span className="text-sm font-semibold text-primary tabular-nums">
                    {FAST_PRICES[svc.code]?.[c.name] ?? "—"}
                  </span>
                </div>
              ))}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-6 flex items-center justify-between"
        >
          <p className="text-xs text-muted-foreground">* Harga bersifat estimasi. Harga final ditampilkan setelah login.</p>
          <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4">
            Lihat semua layanan <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-center text-white"
          style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #6D28D9 100%)" }}
        >
          {/* Animated bg orbs */}
          <motion.div
            className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-20 -bottom-10 h-48 w-48 rounded-full bg-white/5 blur-2xl"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />

          <div className="relative">
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">Siap Memulai?</h2>
            <p className="mt-3 text-white/70 text-lg">Daftar gratis sekarang. Tidak perlu kartu kredit.</p>

            {/* Pulsing CTA */}
            <div className="relative inline-block mt-10">
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl bg-white blur-md"
                animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.06, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
                <Link href="/register" className="relative inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-primary hover:bg-white/90 transition-colors">
                  Mulai Gratis <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function AnimatedLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group relative inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">
      {children}
      <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}

function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.footer
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="border-t border-border bg-card"
    >
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-black text-primary-foreground">N</span>
              </div>
              <span className="text-xl font-black text-foreground">NOKOSMU</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Platform OTP & PPOB premium. Lebih dari 1.700 layanan dengan harga terbaik dan jaminan refund otomatis.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <motion.div className="h-2 w-2 rounded-full bg-emerald-500" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="font-medium">Aktif dan beroperasi normal</span>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Layanan</h4>
            <ul className="space-y-2.5">
              {[{ label: "Jasa OTP", href: "/dashboard" }, { label: "Layanan PPOB", href: "/dashboard" }, { label: "Isi Saldo", href: "/deposit" }, { label: "Riwayat", href: "/history" }].map(l => (
                <li key={l.label}><AnimatedLink href={l.href}>{l.label}</AnimatedLink></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal & Info</h4>
            <ul className="space-y-2.5">
              {[{ label: "Syarat & Ketentuan", href: "/terms" }, { label: "FAQ", href: "#faq" }, { label: "Kontak Admin", href: "#" }].map(l => (
                <li key={l.label}><AnimatedLink href={l.href}>{l.label}</AnimatedLink></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} NOKOSMU. Hak cipta dilindungi.</span>
          <span className="hidden md:block">Made with ❤️ in Indonesia</span>
        </div>
      </div>
    </motion.footer>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="bg-background">
      <Navbar />
      <Hero />
      <FastResponse />
      <Features />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTABanner />
      <Footer />
    </main>
  );
}
