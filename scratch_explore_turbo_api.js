const axios = require('axios');
const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const trackingCode = '38125791';
  const guest = await prisma.guestOrder.findFirst({
    where: { turboTrackingNumber: trackingCode },
    include: { company: true }
  });

  const apiKey = guest.company.turboApiKey;
  const mainClientCode = 34425;
  const baseUrl = 'https://backoffice.turbo-eg.com/external-api';

  console.log(`🔍 Exploring Turbo API for tracking code ${trackingCode}...\n`);

  const testEndpoints = [
    { name: 'get-order POST', url: `${baseUrl}/get-order`, method: 'POST', body: { authentication_key: apiKey, main_client_code: mainClientCode, search_Key: trackingCode } },
    { name: 'get-order-status POST', url: `${baseUrl}/get-order-status`, method: 'POST', body: { authentication_key: apiKey, main_client_code: mainClientCode, search_Key: trackingCode } },
    { name: 'order-status POST', url: `${baseUrl}/order-status`, method: 'POST', body: { authentication_key: apiKey, main_client_code: mainClientCode, search_Key: trackingCode } },
    { name: 'track POST', url: `${baseUrl}/track`, method: 'POST', body: { authentication_key: apiKey, main_client_code: mainClientCode, search_Key: trackingCode } },
    { name: 'get-government POST', url: `${baseUrl}/get-government`, method: 'POST', body: { authentication_key: apiKey, main_client_code: mainClientCode } },
    { name: 'get-area POST', url: `${baseUrl}/get-area`, method: 'POST', body: { authentication_key: apiKey, main_client_code: mainClientCode, government: 'القاهرة' } },
  ];

  for (const t of testEndpoints) {
    console.log(`\n---------------------------------------`);
    console.log(`🚀 Testing ${t.name}: ${t.url}`);
    try {
      const res = await axios({
        method: t.method,
        url: t.url,
        data: t.body,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 10000
      });
      console.log('✅ Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log('❌ Error:', err.response?.status, err.response?.data || err.message);
    }
  }
}

main().finally(() => process.exit(0));
