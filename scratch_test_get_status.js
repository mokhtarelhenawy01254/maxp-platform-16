const axios = require('axios');

async function testGetStatus(payload) {
  const url = 'https://backoffice.turbo-eg.com/external-api/get-status';
  console.log(`\n🧪 Testing POST ${url} with payload:`, payload);
  try {
    const res = await axios.post(url, payload);
    console.log('✅ Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('❌ Error:', err.response?.status, err.response?.data || err.message);
  }
}

async function main() {
  const apiKey = '684d316d7fd8ed37d0ae46e4abf60f146cda7b081dd8e9398d4321626541c619';
  const mainClientCode = 34425;
  const code = '38125791';

  await testGetStatus({ authentication_key: apiKey, main_client_code: mainClientCode, code });
  await testGetStatus({ authentication_key: apiKey, main_client_code: mainClientCode, search_Key: code });
  await testGetStatus({ authentication_key: apiKey, main_client_code: mainClientCode, shipment_id: code });
  await testGetStatus({ authentication_key: apiKey, main_client_code: mainClientCode, tracking_number: code });
}

main();
