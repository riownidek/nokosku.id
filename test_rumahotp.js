const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const cfg = await prisma.appConfig.findFirst({ where: { key: 'rumahotp_api_key' } });
  const res = await fetch('https://www.rumahotp.io/api/v2/services', { headers: { 'x-apikey': cfg.value } });
  const data = await res.json();
  console.log(JSON.stringify(data.data[0] || data.services?.[0] || data, null, 2));
}

run();
