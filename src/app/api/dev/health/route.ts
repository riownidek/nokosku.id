import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/herosms";

const TAG = "[Health]";

type ServiceStatus = { status: "OK" | "ERROR"; message: string; latencyMs?: number };

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await prisma.appConfig.findFirst();
    return { status: "OK", message: "Koneksi Supabase berhasil", latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: "ERROR", message: `Supabase error: ${err?.message ?? "Unknown"}` };
  }
}

async function checkHeroSMS(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const balance = await getBalance();
    return {
      status: "OK",
      message: `Hero-SMS OK — Saldo: $${balance.toFixed(4)} USD`,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return { status: "ERROR", message: `Hero-SMS error: ${err?.message ?? "Unknown"}` };
  }
}

async function checkPakasir(): Promise<ServiceStatus> {
  // Pakasir tidak punya public health endpoint — verifikasi keberadaan kredensial di DB
  try {
    const [keyConfig, projectConfig] = await Promise.all([
      prisma.appConfig.findFirst({ where: { key: "pakasir_api_key" } }),
      prisma.appConfig.findFirst({ where: { key: "pakasir_project" } }),
    ]);
    if (!keyConfig?.value) return { status: "ERROR", message: "pakasir_api_key belum dikonfigurasi di App Config" };
    if (!projectConfig?.value) return { status: "ERROR", message: "pakasir_project belum dikonfigurasi di App Config" };
    return { status: "OK", message: `Pakasir project="${projectConfig.value}" — API key tersimpan di DB` };
  } catch (err: any) {
    return { status: "ERROR", message: `Pakasir DB check error: ${err?.message ?? "Unknown"}` };
  }
}

function checkEnvVars(): ServiceStatus {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return { status: "ERROR", message: `Variabel tidak ditemukan: ${missing.join(", ")}` };
  }
  return { status: "OK", message: `Semua ${required.length} variabel environment tersedia` };
}

export async function GET() {
  console.log(`${TAG} Running health check...`);

  const [supabase, heroSms, pakasir] = await Promise.all([
    checkSupabase(),
    checkHeroSMS(),
    checkPakasir(),
  ]);

  const envVars = checkEnvVars();

  const results = { supabase, hero_sms: heroSms, pakasir, env_vars: envVars };

  const allOk = Object.values(results).every((r) => r.status === "OK");

  console.log(`${TAG} Result: ${allOk ? "ALL OK" : "DEGRADED"}`);

  return NextResponse.json(
    {
      status: allOk ? "OK" : "DEGRADED",
      timestamp: new Date().toISOString(),
      services: results,
    },
    { status: allOk ? 200 : 207 }
  );
}
