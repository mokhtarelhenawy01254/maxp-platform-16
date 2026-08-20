const axios = require('./node_modules/axios');
const { PrismaClient } = require('./node_modules/@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { turboShipmentId: '38088117' },
        { turboTrackingNumber: '38088117' }
      ]
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      turboShipmentId: true,
      turboShipmentStatus: true,
      companyId: true,
      company: { select: { name: true, turboApiKey: true, turboEnabled: true } }
    }
  });

  if (!order) { console.log('Not found'); await prisma.$disconnect(); return; }

  console.log('Order:', order.orderNumber, '| Status:', order.status, '| TurboStatus:', order.turboShipmentStatus);
  console.log('TurboApiKey:', order.company?.turboApiKey ? order.company.turboApiKey.slice(0,12)+'...' : 'MISSING');

  const apiKey = order.company?.turboApiKey;
  if (!apiKey) { await prisma.$disconnect(); return; }

  const today = new Date().toISOString().split('T')[0];
  const from60 = new Date(Date.now() - 60*24*60*60*1000).toISOString().split('T')[0];

  console.log(`\nCalling Turbo: ${from60} -> ${today}`);
  const res = await axios.default.post('https://api.turbodelivery.net/get-status', {
    authentication_key: apiKey,
    from: from60,
    to: today
  }, { headers: {'Content-Type':'application/json'}, timeout: 30000 });

  const shipments = res.data?.data || [];
  console.log('Turbo total shipments:', shipments.length);

  const target = shipments.find(s =>
    String(s.code) === '38088117' ||
    String(s.bar_code) === '38088117'
  );

  if (target) {
    console.log('\n=== RAW TURBO DATA for 38088117 ===');
    console.log(JSON.stringify(target, null, 2));
  } else {
    const codes = shipments.map(s => parseInt(s.code)).filter(Boolean).sort((a,b)=>a-b);
    console.log('NOT FOUND. Code range:', codes[0], 'to', codes[codes.length-1]);
    console.log('38088117 is', parseInt('38088117') < codes[0] ? 'OLDER (before range)' : 'NEWER (after range)');
    // Show all returned statuses
    const statusCounts = {};
    shipments.forEach(s => { statusCounts[s.status] = (statusCounts[s.status]||0)+1; });
    console.log('Status distribution:', JSON.stringify(statusCounts, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
