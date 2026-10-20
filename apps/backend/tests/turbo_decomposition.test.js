const assert = require('assert');
const { stripMatchedAreaFromAddress, extractCleanStreetAddress, getBestShippingAddressFields } = require('../utils/turbo/addressParser');
const { getTurboGovernorateName, normalizeArabic } = require('../utils/turbo/governorateMapper');
const { formatOrderForTurbo } = require('../utils/turbo/orderFormatter');

console.log('🧪 Starting Turbo Address Decomposition Tests...\n');

// 1. Test stripMatchedAreaFromAddress
console.log('Test 1: stripMatchedAreaFromAddress');
{
  const res1 = stripMatchedAreaFromAddress('سموحه شارع مصطفي النجار', 'سموحة');
  assert.strictEqual(res1, 'شارع مصطفي النجار', `Expected 'شارع مصطفي النجار', got '${res1}'`);
  console.log('  ✅ "سموحه شارع مصطفي النجار" -> "شارع مصطفي النجار"');

  const res2 = stripMatchedAreaFromAddress('شارع مصطفى النجار - سموحة', 'سموحة');
  assert.strictEqual(res2, 'شارع مصطفى النجار', `Expected 'شارع مصطفى النجار', got '${res2}'`);
  console.log('  ✅ "شارع مصطفى النجار - سموحة" -> "شارع مصطفى النجار"');

  const res3 = stripMatchedAreaFromAddress('منطقة سموحة شارع مصطفى النجار', 'سموحة');
  assert.strictEqual(res3, 'شارع مصطفى النجار', `Expected 'شارع مصطفى النجار', got '${res3}'`);
  console.log('  ✅ "منطقة سموحة شارع مصطفى النجار" -> "شارع مصطفى النجار"');

  const res4 = stripMatchedAreaFromAddress('سموحه', 'سموحة');
  // Safety guard: should not become empty string
  assert.ok(res4.length >= 3, `Expected non-empty safety fallback, got '${res4}'`);
  console.log('  ✅ Safety guard on area-only address: preserves text ->', res4);

  const res5 = stripMatchedAreaFromAddress('15 شارع مصطفى النجار', 'سيدي جابر');
  assert.strictEqual(res5, '15 شارع مصطفى النجار', `Expected unchanged address, got '${res5}'`);
  console.log('  ✅ Unmatched area leaves street untouched ->', res5);

  const res6 = stripMatchedAreaFromAddress('مدينة نصر الحي السابع شارع الطيران عمارة 12', 'مدينة نصر');
  assert.strictEqual(res6, 'الحي السابع شارع الطيران عمارة 12', `Expected 'الحي السابع شارع الطيران عمارة 12', got '${res6}'`);
  console.log('  ✅ "مدينة نصر الحي السابع شارع الطيران عمارة 12" -> "الحي السابع شارع الطيران عمارة 12"');
}

// 2. Test Governorate Disambiguation
console.log('\nTest 2: Governorate Disambiguation');
{
  const govAlex1 = getTurboGovernorateName('سيدي جابر', '', '');
  assert.strictEqual(govAlex1, 'الإسكندرية', `Expected 'الإسكندرية', got '${govAlex1}'`);
  console.log('  ✅ "سيدي جابر" -> "الإسكندرية"');

  const govAlex2 = getTurboGovernorateName('سموحة', '', '');
  assert.strictEqual(govAlex2, 'الإسكندرية', `Expected 'الإسكندرية', got '${govAlex2}'`);
  console.log('  ✅ "سموحة" -> "الإسكندرية"');

  const govGiza = getTurboGovernorateName('الدقي', '', '');
  assert.strictEqual(govGiza, 'الجيزة', `Expected 'الجيزة', got '${govGiza}'`);
  console.log('  ✅ "الدقي" -> "الجيزة"');
}

// 3. Test Full Flow with Mocked Turbo API Logic
console.log('\nTest 3: Full End-to-End Simulation of createShipment');
{
  // Simulated Turbo Alexandria areas list
  const alexAreas = [
    { id: '101', name: 'سموحة' },
    { id: '102', name: 'سيدي جابر' },
    { id: '103', name: 'ميامي' },
    { id: '104', name: 'لوران' },
    { id: '105', name: 'العجمي' },
    { id: '106', name: 'محرم بك' },
    { id: '107', name: 'المركز الرئيسي' }
  ];

  // User Scenario A:
  // governorate = "سيدي جابر", address = "سموحه شارع مصطفي النجار"
  const orderA = {
    orderNumber: 'ORD-TEST-1',
    customerName: 'أحمد محمود',
    customerPhone: '01012345678',
    governorate: 'سيدي جابر',
    shippingAddress: 'سموحه شارع مصطفي النجار',
  };

  const addressFieldsA = getBestShippingAddressFields(orderA.shippingAddress);
  const cleanAddressA = extractCleanStreetAddress(addressFieldsA, orderA.shippingAddress, { customerName: orderA.customerName });

  const rawGovA = orderA.governorate || '';
  const cleanGovA = getTurboGovernorateName(rawGovA, '', cleanAddressA);
  assert.strictEqual(cleanGovA, 'الإسكندرية');

  const potentialDistrictA = (rawGovA && normalizeArabic(rawGovA) !== normalizeArabic(cleanGovA))
    ? rawGovA
    : null;
  assert.strictEqual(potentialDistrictA, 'سيدي جابر');

  // Load shipmentService match logic
  const sortedAreas = [...alexAreas].sort((a, b) => (b.name || '').length - (a.name || '').length);
  let matchedAreaA = null;

  // Address scan
  const nAddressA = normalizeArabic(cleanAddressA);
  for (const area of sortedAreas) {
    const na = normalizeArabic(area.name);
    if (na.length >= 3 && nAddressA.includes(na)) {
      matchedAreaA = area.name;
      break;
    }
  }

  assert.strictEqual(matchedAreaA, 'سموحة', `Expected 'سموحة', got '${matchedAreaA}'`);

  const strippedAddressA = stripMatchedAreaFromAddress(cleanAddressA, matchedAreaA, {
    additionalDistrict: potentialDistrictA,
    governorate: cleanGovA
  });

  assert.strictEqual(strippedAddressA, 'شارع مصطفي النجار', `Expected 'شارع مصطفي النجار', got '${strippedAddressA}'`);

  console.log('  🎯 Scenario A Result:');
  console.log('     government:', cleanGovA);
  console.log('     area:      ', matchedAreaA);
  console.log('     address:   ', strippedAddressA);

  // User Scenario B:
  // governorate = "سيدي جابر", address = "15 شارع مصطفى النجار" (no area in address)
  const orderB = {
    orderNumber: 'ORD-TEST-2',
    customerName: 'محمد علي',
    customerPhone: '01112345678',
    governorate: 'سيدي جابر',
    shippingAddress: '15 شارع مصطفى النجار',
  };

  const addressFieldsB = getBestShippingAddressFields(orderB.shippingAddress);
  const cleanAddressB = extractCleanStreetAddress(addressFieldsB, orderB.shippingAddress, { customerName: orderB.customerName });

  const rawGovB = orderB.governorate || '';
  const cleanGovB = getTurboGovernorateName(rawGovB, '', cleanAddressB);
  assert.strictEqual(cleanGovB, 'الإسكندرية');

  const potentialDistrictB = (rawGovB && normalizeArabic(rawGovB) !== normalizeArabic(cleanGovB))
    ? rawGovB
    : null;

  // Address scan
  let matchedAreaB = null;
  const nAddressB = normalizeArabic(cleanAddressB);
  for (const area of sortedAreas) {
    const na = normalizeArabic(area.name);
    if (na.length >= 3 && nAddressB.includes(na)) {
      matchedAreaB = area.name;
      break;
    }
  }

  // Not in address -> fallback to potentialDistrictB ("سيدي جابر")
  if (!matchedAreaB && potentialDistrictB) {
    const candidateMatch = alexAreas.find(a => normalizeArabic(a.name) === normalizeArabic(potentialDistrictB));
    if (candidateMatch) matchedAreaB = candidateMatch.name;
  }

  assert.strictEqual(matchedAreaB, 'سيدي جابر', `Expected 'سيدي جابر', got '${matchedAreaB}'`);

  const strippedAddressB = stripMatchedAreaFromAddress(cleanAddressB, matchedAreaB, {
    additionalDistrict: potentialDistrictB,
    governorate: cleanGovB
  });

  assert.strictEqual(strippedAddressB, '15 شارع مصطفى النجار');

  console.log('\n  🎯 Scenario B Result:');
  console.log('     government:', cleanGovB);
  console.log('     area:      ', matchedAreaB);
  console.log('     address:   ', strippedAddressB);
}

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED!');
