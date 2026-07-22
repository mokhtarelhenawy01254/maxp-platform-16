const axios = require('axios');

async function testParam(key, val) {
  const url = 'https://backoffice.turbo-eg.com/external-api/get-status';
  const apiKey = '684d316d7fd8ed37d0ae46e4abf60f146cda7b081dd8e9398d4321626541c619';
  const mainClientCode = 34425;

  const payload = {
    authentication_key: apiKey,
    main_client_code: mainClientCode,
    [key]: val
  };

  try {
    const res = await axios.post(url, payload);
    console.log(`✅ SUCCESS key "${key}" (${val}):`, JSON.stringify(res.data, null, 2));
    return true;
  } catch (err) {
    if (err.response?.data?.message !== 'Shipment not found') {
      console.log(`⚠️ INTERESTING response for "${key}":`, err.response?.data);
    }
  }
  return false;
}

async function main() {
  const code = '38125791';
  const orderNumber = 'ORD-638014-156';
  const invoiceNumber = '638014156';

  const keys = [
    'order_code', 'order_id', 'remote_order_id', 'shipment_code', 'shipment_number',
    'bar_code', 'barcode', 'invoice_number', 'search_key', 'searchKey', 'Search_Key',
    'search', 'id', 'reference', 'number', 'waybill', 'waybill_number', 'airway_bill'
  ];

  for (const k of keys) {
    await testParam(k, code);
    await testParam(k, orderNumber);
    await testParam(k, invoiceNumber);
  }
}

main();
