import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4F46E5",
};

export const metadata: Metadata = {
  title: {
    default: "NOKOSMU — Platform OTP & PPOB Premium",
    template: "%s | NOKOSMU",
  },
  description:
    "Solusi virtual number OTP dan produk PPOB tercepat untuk kebutuhan verifikasi digital Anda. Lebih dari 1.700 layanan tersedia dengan harga terbaik.",
  keywords: ["OTP", "PPOB", "virtual number", "WhatsApp OTP", "pulsa", "token PLN", "NOKOSMU"],
  authors: [{ name: "NOKOSMU Team" }],
  creator: "NOKOSMU",
  openGraph: {
    type: "website",
    locale: "id_ID",
    title: "NOKOSMU — Platform OTP & PPOB Premium",
    description: "Virtual number OTP dan PPOB tercepat. 1700+ layanan, harga bersaing.",
    siteName: "NOKOSMU",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Providers>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "var(--font-geist-sans, ui-sans-serif)",
                borderRadius: "0.5rem",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
