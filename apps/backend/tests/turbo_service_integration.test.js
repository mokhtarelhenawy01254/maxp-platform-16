const assert = require('assert');
const axios = require('axios');
const TurboService = require('../services/turboService');

console.log('🧪 Starting TurboService Class Integration Test...\n');

let capturedPayload = null;

// Mock axios.post globally for the test
axios.post = async (url, payload) => {
  capturedPayload = payload;
  return {
    data: {
      success: 1,
      result: {
        code: '37409999',
        bar_code: 'TRB-37409999'
      }
    }
  };
};

const mockApiClient = {
  baseUrl: 'https://mock.turbo.local',
  timeout: 5000,
  getApiKey: async () => 'test_api_key',
  getMainClientCode: async () => '37321',
  getSenderNumber: async () => '01000000000',
  getHeaders: async () => ({ Accept: 'application/json' }),
  get: async (url) => {
    if (url.includes('/get-government')) {
      return {
        data: {
          success: true,
          feed: [
            { id: '1', name: 'القاهرة' },
            { id: '2', name: 'الجيزة' },
            { id: '3', name: 'الإسكندرية' }
          ]
        }
      };
    }
    if (url.includes('/get-area/3')) {
      return {
        data: {
          success: true,
          feed: [
            { id: '101', name: 'سموحة' },
            { id: '102', name: 'سيدي جابر' },
            { id: '103', name: 'ميامي' }
          ]
        }
      };
    }
    return { data: { success: true, feed: [] } };
  }
};

async function run() {
  const service = new TurboService('test_api_key', 'company_123');
  service._shipment._client = mockApiClient;
  service._location._client = mockApiClient;

  // Test Scenario 1: User's exact prompt
  // Input: governorate = "سيدي جابر", address = "سموحه شارع مصطفي النجار"
  capturedPayload = null;
  const res1 = await service.createShipment({
    orderNumber: 'ORD-1001',
    customerName: 'محمود عبد الرازق',
    customerPhone: '01011112222',
    governorate: 'سيدي جابر',
    shippingAddress: 'سموحه شارع مصطفي النجار',
    items: [{ productName: 'حذاء كاجوال', quantity: 1, price: 500, total: 500 }],
    totalValue: 500,
    shipping: 50
  });

  assert.strictEqual(res1.success, true);
  assert.strictEqual(capturedPayload.government, 'الإسكندرية');
  assert.strictEqual(capturedPayload.area, 'سموحة');
  assert.strictEqual(capturedPayload.address, 'شارع مصطفي النجار');

  console.log('✅ createShipment with "سيدي جابر" + "سموحه شارع مصطفي النجار":');
  console.log('   Payload sent to Turbo API:');
  console.log('   - government:', capturedPayload.government);
  console.log('   - area:      ', capturedPayload.area);
  console.log('   - address:   ', capturedPayload.address);

  // Test Scenario 2: updateShipment
  capturedPayload = null;
  const res2 = await service.updateShipment('37409999', {
    orderNumber: 'ORD-1001',
    customerName: 'محمود عبد الرازق',
    customerPhone: '01011112222',
    governorate: 'سيدي جابر',
    shippingAddress: 'سموحه شارع مصطفي النجار',
    items: [{ productName: 'حذاء كاجوال', quantity: 1, price: 500, total: 500 }],
    totalValue: 500
  });

  assert.strictEqual(res2.success, true);
  assert.strictEqual(capturedPayload.government, 'الإسكندرية');
  assert.strictEqual(capturedPayload.area, 'سموحة');
  assert.strictEqual(capturedPayload.address, 'شارع مصطفي النجار');

  console.log('\n✅ updateShipment with "سيدي جابر" + "سموحه شارع مصطفي النجار":');
  console.log('   Payload sent to Turbo API:');
  console.log('   - government:', capturedPayload.government);
  console.log('   - area:      ', capturedPayload.area);
  console.log('   - address:   ', capturedPayload.address);

  console.log('\n🎉 ALL CLASS INTEGRATION TESTS PASSED 100%!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
