import { prisma } from "./prisma";

/** Ambil setting dari DB (dengan fallback) */
export async function getSetting(key: string, fallback: string): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? fallback;
  } catch {
    return fallback;
  }
}

/** Hitung harga dengan markup dari DB */
export async function applyMarkup(basePrice: number): Promise<number> {
  const markupStr = await getSetting("markup_percent", "0");
  const markupPercent = parseFloat(markupStr) || 0;
  return Math.ceil(basePrice * (1 + markupPercent / 100));
}
