const assert = require('assert');
const axios = require('axios');
const { stripTechnicalCodesFromAddress, stripMatchedAreaFromAddress, extractCleanStreetAddress, getBestShippingAddressFields } = require('../utils/turbo/addressParser');
const { getTurboGovernorateName, normalizeArabic } = require('../utils/turbo/governorateMapper');
const { FALLBACK_GOVERNMENTS } = require('../utils/turbo/constants');
const ShipmentService = require('../services/turbo/shipmentService');

console.log('🧪 Starting Turbo Enhanced Address & Fallback Tests...\n');

let interceptedPayload = null;

// Mock axios.post globally for the test
axios.post = async (url, data) => {
  interceptedPayload = data;
  return {
    data: {
      success: 1,
      result: {
        code: '999999',
        bar_code: 'TRB-999999'
      }
    }
  };
};

// Mock apiClient for ShipmentService
const mockApiClient = {
  baseUrl: 'https://backoffice.turbo-eg.com/external-api',
  getHeaders: async () => ({ 'Content-Type': 'application/json' }),
  getApiKey: async () => 'mock_api_key',
  getMainClientCode: async () => 37321,
  getSenderNumber: async () => '01000000000',
  post: async (url, data) => {
    interceptedPayload = data;
    return { data: { success: 1, shipment_id: '999999', data } };
  },
  get: async (url) => {
    // Mock get-government
    if (url.includes('/get-government')) {
      return {
        data: {
          success: 1,
          feed: [
            { id: 1, name: 'القاهرة' },
            { id: 2, name: 'الجيزة' },
            { id: 3, name: 'الإسكندرية' },
            { id: 28, name: 'أطراف القاهرة والجيزة' }
          ]
        }
      };
    }
    // Mock get-area/1 (Cairo - includes stadium and central areas)
    if (url.includes('/get-area/1')) {
      return {
        data: {
          success: 1,
          feed: [
            { id: 101, name: 'مدينة نصر' },
            { id: 102, name: 'مصر الجديدة' },
            { id: 103, name: 'وسط البلد' },
            { id: 104, name: 'المعادي' },
            { id: 1105, name: 'ستاد القاهرة' },
            { id: 1106, name: 'مطار القاهرة' }
          ]
        }
      };
    }
    // Mock get-area/28 (Compound zones - check before 2!)
    if (url.match(/\/get-area\/28(?:\?|$)/)) {
      return {
        data: {
          success: 1,
          feed: [
            { id: 1334, name: 'حدائق الاهرام' },
            { id: 1238, name: 'حدائق أكتوبر' },
            { id: 1259, name: 'حدائق المهندسين' },
            { id: 4633, name: 'حدائق العاصمة' }
          ]
        }
      };
    }
    // Mock get-area/2 (Giza - includes Zaghloul and Raslan)
    if (url.match(/\/get-area\/2(?:\?|$)/)) {
      return {
        data: {
          success: 1,
          feed: [
            { id: 201, name: 'ميدان الجيزة' },
            { id: 202, name: 'الدقي' },
            { id: 203, name: 'المهندسين' },
            { id: 204, name: 'الهرم' },
            { id: 205, name: 'فيصل' },
            { id: 1320, name: 'شارع زغلول' },
            { id: 1400, name: 'رسلان' }
          ]
        }
      };
    }
    // Mock get-area/3 (Alexandria)
    if (url.match(/\/get-area\/3(?:\?|$)/)) {
      return {
        data: {
          success: 1,
          feed: [
            { id: 301, name: 'محطة الرمل' },
            { id: 302, name: 'سموحة' },
            { id: 303, name: 'سيدي جابر' },
            { id: 304, name: 'ميامي' }
          ]
        }
      };
    }
    return { data: { success: 0, feed: [] } };
  }
};

const shipmentService = new ShipmentService(mockApiClient);

async function runTests() {
  let passed = 0;

  // Test 1: stripTechnicalCodesFromAddress
  console.log('Test 1: stripTechnicalCodesFromAddress');
  const t1 = stripTechnicalCodesFromAddress('الجيزه رسلان كشرى العشرين, 4219:رسلان, 2');
  assert.strictEqual(t1, 'الجيزه رسلان كشرى العشرين', 'Should strip , 4219:رسلان, 2');
  console.log('  ✅ "الجيزه رسلان كشرى العشرين, 4219:رسلان, 2" ->', t1);
  passed++;

  const t2 = stripTechnicalCodesFromAddress('الجيزه هرم زغلول أمام دودو الموان, 3958:ترسا هرم, 2');
  assert.strictEqual(t2, 'الجيزه هرم زغلول أمام دودو الموان', 'Should strip , 3958:ترسا هرم, 2');
  console.log('  ✅ "الجيزه هرم زغلول أمام دودو الموان, 3958:ترسا هرم, 2" ->', t2);
  passed++;

  // Test 2: Governorate resolution for Hadayek Al-Ahram
  console.log('\nTest 2: Governorate resolution for Hadayek Al-Ahram');
  const govAhram = getTurboGovernorateName('الجيزة', '', 'حدائق الاهرام ف شارع 15 زغلول');
  assert.strictEqual(govAhram, 'أطراف القاهرة والجيزة', 'Hadayek Al-Ahram in address should resolve to أطراف القاهرة والجيزة in Turbo');
  console.log('  ✅ "حدائق الاهرام ف شارع 15 زغلول" governorate ->', govAhram);
  passed++;

  // Test 3: End-to-end createShipment for Hadayek Al-Ahram (The stadium bug fix!)
  console.log('\nTest 3: createShipment with "حدائق الاهرام ف شارع 15 زغلول" (Must NEVER match استاد القاهرة!)');
  interceptedPayload = null;

  const oldGet = mockApiClient.get;
  mockApiClient.get = async (url) => {
    console.log('DEBUG mockApiClient.get:', url);
    return oldGet(url);
  };
  await shipmentService.createShipment({
    orderId: 'ORD-TEST-1',
    orderNumber: 'ORD-TEST-1',
    customerName: 'أحمد علي',
    customerPhone: '01012345678',
    shippingAddress: {
      governorate: 'الجيزة',
      city: 'حدائق الاهرام',
      address: 'حدائق الاهرام ف شارع 15 زغلول'
    },
    customerAddress: 'حدائق الاهرام ف شارع 15 زغلول'
  });

  console.log('DEBUG interceptedPayload in Test 3:', JSON.stringify(interceptedPayload, null, 2));
  assert.strictEqual(interceptedPayload.government, 'أطراف القاهرة والجيزة', 'Should route to أطراف القاهرة والجيزة');
  assert.strictEqual(interceptedPayload.area, 'حدائق الاهرام', 'Should match area حدائق الاهرام');
  assert.strictEqual(interceptedPayload.address, 'شارع 15 زغلول', 'Should strip حدائق الاهرام from address leaving pure street');
  assert.ok(!interceptedPayload.area.includes('ستاد'), 'Must NOT match ستاد القاهرة!');
  console.log('  ✅ Scenario 1 (Hadayek Al-Ahram):');
  console.log('     government:', interceptedPayload.government);
  console.log('     area:      ', interceptedPayload.area);
  console.log('     address:   ', interceptedPayload.address);
  passed++;

  // Test 4: End-to-end createShipment for Order ORD-409047-799 (Raslan koshari)
  console.log('\nTest 4: createShipment with ORD-409047-799 (Technical code stripping & Raslan area)');
  interceptedPayload = null;
  await shipmentService.createShipment({
    orderId: 'ORD-409047-799',
    orderNumber: 'ORD-409047-799',
    customerName: 'دنيا',
    customerPhone: '01142711122',
    governorate: 'الجيزة',
    city: 'رسلان',
    shippingAddress: {
      governorate: 'الجيزة',
      city: 'رسلان',
      area: 'رسلان',
      address: 'الجيزه رسلان كشرى العشرين, 4219:رسلان, 2'
    },
    customerAddress: 'الجيزه رسلان كشرى العشرين, 4219:رسلان, 2'
  });

  assert.strictEqual(interceptedPayload.government, 'الجيزة', 'Gov should be الجيزة');
  assert.strictEqual(interceptedPayload.area, 'رسلان', 'Area should be رسلان');
  assert.strictEqual(interceptedPayload.address, 'كشرى العشرين', 'Address should be stripped of الجيزه, رسلان, and 4219:رسلان, 2');
  console.log('  ✅ Scenario 2 (ORD-409047-799):');
  console.log('     government:', interceptedPayload.government);
  console.log('     area:      ', interceptedPayload.area);
  console.log('     address:   ', interceptedPayload.address);
  passed++;

  // Test 5: End-to-end createShipment for "شارع 15 زغلول" (Flexible street matching)
  console.log('\nTest 5: createShipment with "شارع 15 زغلول" (Matches شارع زغلول area)');
  interceptedPayload = null;
  await shipmentService.createShipment({
    orderId: 'ORD-TEST-3',
    orderNumber: 'ORD-TEST-3',
    customerName: 'محمود حسن',
    customerPhone: '01099887766',
    governorate: 'الجيزة',
    city: 'الهرم',
    shippingAddress: {
      governorate: 'الجيزة',
      city: 'الهرم',
      address: 'شارع 15 زغلول الهرم'
    },
    customerAddress: 'شارع 15 زغلول الهرم'
  });

  assert.strictEqual(interceptedPayload.government, 'الجيزة');
  assert.ok(interceptedPayload.area === 'شارع زغلول' || interceptedPayload.area === 'الهرم');
  console.log('  ✅ Scenario 3 (شارع 15 زغلول):');
  console.log('     government:', interceptedPayload.government);
  console.log('     area:      ', interceptedPayload.area);
  console.log('     address:   ', interceptedPayload.address);
  passed++;

  // Test 6: Fallback for Cairo when street is unknown (Must pick central area, NEVER stadium!)
  console.log('\nTest 6: Fallback for Cairo with completely unknown address');
  interceptedPayload = null;
  await shipmentService.createShipment({
    orderId: 'ORD-TEST-4',
    orderNumber: 'ORD-TEST-4',
    customerName: 'سارة',
    customerPhone: '01233445566',
    governorate: 'القاهرة',
    city: 'القاهرة',
    shippingAddress: {
      governorate: 'القاهرة',
      city: 'القاهرة',
      address: 'شارع مجهول تماماً رقم 9999'
    },
    customerAddress: 'شارع مجهول تماماً رقم 9999'
  });

  assert.strictEqual(interceptedPayload.government, 'القاهرة');
  assert.ok(!interceptedPayload.area.includes('ستاد') && !interceptedPayload.area.includes('مطار'), 'Must NOT pick stadium or airport');
  assert.ok(interceptedPayload.area === 'وسط البلد' || interceptedPayload.area === 'المركز الرئيسي');
  console.log('  ✅ Scenario 4 (Cairo Fallback):');
  console.log('     government:', interceptedPayload.government);
  console.log('     area:      ', interceptedPayload.area);
  console.log('     address:   ', interceptedPayload.address);
  passed++;

  console.log(`\n🎉 ALL ${passed} ENHANCED ADDRESS TESTS PASSED 100%!`);
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
