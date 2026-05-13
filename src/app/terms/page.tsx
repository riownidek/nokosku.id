import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md">
        <div className="grid-container py-12 lg:py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-black tracking-tight md:text-5xl">
            Syarat & Ketentuan Layanan
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Pembaruan Terakhir: {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid-container py-12 lg:py-24">
        <div className="mx-auto max-w-4xl lg:grid lg:grid-cols-[240px_1fr] lg:gap-16">
          {/* Sticky Sidebar Navigation */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-2">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Daftar Isi
              </p>
              {[
                { id: "definisi", label: "1. Definisi" },
                { id: "penggunaan", label: "2. Penggunaan Layanan" },
                { id: "saldo", label: "3. Saldo & Pembayaran" },
                { id: "refund", label: "4. Pengembalian Dana" },
                { id: "privasi", label: "5. Privasi Data" },
                { id: "larangan", label: "6. Larangan Penggunaan" },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  {item.label}
                </a>
              ))}
              
              <div className="mt-8 pt-8 border-t">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
                </Link>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <article className="prose prose-zinc max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:first:mt-0 prose-h2:tracking-tight prose-a:text-primary">
            
            <p className="lead text-lg text-muted-foreground">
              Selamat datang di NOKOSKU. Dengan mendaftar dan menggunakan layanan dari NOKOSKU, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh Syarat dan Ketentuan di bawah ini. Jika Anda tidak menyetujui syarat-syarat ini, harap tidak menggunakan layanan kami.
            </p>

            <h2 id="definisi">1. Definisi</h2>
            <ul>
              <li><strong>NOKOSKU</strong> adalah platform penyedia layanan nomor virtual OTP dan produk digital (PPOB).</li>
              <li><strong>Pengguna</strong> adalah pihak yang telah terdaftar dan memiliki akun aktif di platform NOKOSKU.</li>
              <li><strong>API</strong> adalah antarmuka pemrograman aplikasi yang disediakan untuk integrasi layanan B2B.</li>
            </ul>

            <h2 id="penggunaan">2. Penggunaan Layanan</h2>
            <p>
              Layanan kami ditujukan untuk mempermudah proses verifikasi OTP secara sah. Kami tidak bertanggung jawab atas akun dari platform ketiga (WhatsApp, Telegram, dll.) yang diblokir, ditangguhkan, atau dihapus setelah menggunakan layanan nomor dari kami.
            </p>
            <ul>
              <li>Satu nomor telepon OTP hanya berlaku untuk satu kali verifikasi penerimaan SMS pada aplikasi yang dipilih.</li>
              <li>Masa aktif penerimaan SMS adalah 15 menit.</li>
              <li>Nomor tidak dapat diperpanjang atau digunakan kembali di kemudian hari untuk platform yang sama.</li>
            </ul>

            <h2 id="saldo">3. Saldo, Deposit & Pembayaran</h2>
            <p>
              Seluruh transaksi di NOKOSKU menggunakan sistem saldo prabayar (deposit).
            </p>
            <ul>
              <li>Minimum deposit adalah <strong>Rp 10.000</strong>.</li>
              <li>Pembayaran dilakukan melalui gateway yang tersedia (QRIS, Virtual Account).</li>
              <li>Saldo yang telah disetorkan ke akun NOKOSKU <strong>tidak dapat ditarik kembali (non-refundable)</strong> ke rekening bank Anda dengan alasan apapun.</li>
            </ul>

            <h2 id="refund">4. Kebijakan Pengembalian Dana (Refund) Layanan</h2>
            <p>
              Kami menggunakan sistem pemotongan saldo otomatis yang transparan. Pengembalian dana akun hanya berlaku untuk kondisi berikut:
            </p>
            <ul>
              <li>SMS verifikasi tidak masuk dalam waktu batas maksimal (15 menit).</li>
              <li>Pesanan PPOB (Pulsa, Token, dll) gagal diproses oleh penyedia layanan/server pusat.</li>
              <li>Pengguna menekan tombol "Batalkan Pesanan" saat status OTP masih menunggu SMS (tombol tersedia sebelum 10 detik terakhir).</li>
            </ul>

            <h2 id="privasi">5. Privasi dan Keamanan Data</h2>
            <p>
              Kami sangat menghargai privasi Anda. NOKOSKU menggunakan enkripsi <em>end-to-end</em> untuk kata sandi dan seluruh transaksi. Kami tidak akan pernah menyimpan, membagikan, atau menjual data pribadi Anda (termasuk email dan riwayat pesanan) kepada pihak ketiga untuk tujuan pemasaran.
            </p>

            <h2 id="larangan">6. Larangan Penggunaan</h2>
            <p>
              Pengguna sangat dilarang keras menggunakan layanan NOKOSKU untuk tindakan ilegal, termasuk namun tidak terbatas pada:
            </p>
            <ul>
              <li>Penipuan, spam, atau <em>phishing</em>.</li>
              <li>Kejahatan peretasan (<em>hacking</em>) atau pencurian akun orang lain.</li>
              <li>Aktivitas pencucian uang atau terorisme.</li>
            </ul>
            <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
              <strong>Pelanggaran:</strong> Jika pengguna terbukti melanggar kebijakan ini, NOKOSKU berhak memblokir akun secara permanen, membekukan/menghanguskan saldo yang tersisa, dan melaporkan aktivitas tersebut kepada pihak yang berwenang.
            </p>

          </article>
        </div>
      </div>
    </div>
  );
}
