"use server";

import { prisma } from "@/lib/prisma";
import { verifyPakasirTransaction } from "@/lib/pakasir";
import { auth } from "@/lib/auth";

export async function checkEnvironment() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  const dbKeys = await prisma.appConfig.findMany({
    where: { key: { in: ["pakasir_api_key", "pakasir_project", "jagoanpedia_api_key"] } }
  });

  const hasDbKey = (k: string) => !!dbKeys.find(x => x.key === k && x.value && x.value.trim() !== "");

  return {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "Not Set (Sistem akan menggunakan Origin otomatis)",
    PAKASIR_API_KEY: hasDbKey("pakasir_api_key") || !!process.env.PAKASIR_API_KEY ? "Tersedia (Aman)" : "Tidak Tersedia ❌",
    JAGOANPEDIA_API_KEY: hasDbKey("jagoanpedia_api_key") || !!process.env.JAGOANPEDIA_API_KEY ? "Tersedia (Aman)" : "Tidak Tersedia ❌",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Tersedia (Aman)" : "Tidak Tersedia ❌",
  };
}

export async function fetchRawPakasir(orderId: string) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");
  
  if (!orderId || orderId.trim() === "") {
    return { success: false, error: "Order ID tidak boleh kosong" };
  }

  try {
    // Memanggil API Pakasir langsung tanpa melalui catch-all Next.js route
    const data = await verifyPakasirTransaction(orderId.trim());
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memanggil API Pakasir" };
  }
}
