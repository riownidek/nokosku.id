/**
 * Utility functions — CLIENT SAFE (no server-only imports)
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Shadcn cn() helper */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format Rupiah */
export function formatRupiah(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/** Hitung markup langsung (saat markup sudah diketahui) */
export function applyMarkupSync(basePrice: number, markupPercent: number): number {
  return Math.ceil(basePrice * (1 + markupPercent / 100));
}

/** Generate random referral code */
export function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Truncate string */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

/** Delay helper */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
