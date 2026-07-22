const axios = require('axios');

async function probe(url, method = 'GET', data = null, params = {}) {
  try {
    const res = await axios({
      url,
      method,
      data,
      params,
      timeout: 5000
    });
    console.log(`✅ [${method}] ${url} -> STATUS ${res.status}:`, res.data);
    return res.data;
  } catch (err) {
    if (err.response) {
      if (err.response.status !== 404) {
        console.log(`⚠️ [${method}] ${url} -> STATUS ${err.response.status}:`, err.response.data);
      }
    } else {
      console.log(`❌ [${method}] ${url} -> ${err.message}`);
    }
  }
}

async function main() {
  const baseUrl = 'https://backoffice.turbo-eg.com/external-api';
  const apiKey = '684d316d7fd8ed37d0ae46e4abf60f146cda7b081dd8e9398d4321626541c619';
  const mainClientCode = '34425';
  const code = '38125791';

  const routes = [
    'get-orders',
    'orders',
    'order',
    'get-shipment',
    'shipment',
    'track-order',
    'tracking',
    'status',
    'get-status',
    'get-shipping-cost',
    'calculate-shipping',
    'shipping-cost',
    'get-price',
    'price',
    'get-delivery-cost',
    'get-delivery-fees',
    'get-rates',
    'rates'
  ];

  for (const r of routes) {
    await probe(`${baseUrl}/${r}`, 'GET', null, { authentication_key: apiKey, main_client_code: mainClientCode, code, search_Key: code });
    await probe(`${baseUrl}/${r}`, 'POST', { authentication_key: apiKey, main_client_code: mainClientCode, code, search_Key: code });
  }
}

main();
