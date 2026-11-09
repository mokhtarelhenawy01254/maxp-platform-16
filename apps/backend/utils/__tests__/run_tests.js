const assert = require('assert');

// 1. Test Arabic Search Utils
console.log('--- Testing Arabic Search Utils ---');
const {
  normalizeArabicText,
  generateArabicSpellingVariants,
  getSynonymsAndVariants,
  buildProductSearchFilter,
} = require('../arabicSearchUtils');

assert.strictEqual(normalizeArabicText('أبيض'), 'ابيض');
assert.strictEqual(normalizeArabicText('إسكوتش'), 'اسكوتش');
assert.strictEqual(normalizeArabicText('آخر'), 'اخر');
assert.strictEqual(normalizeArabicText('لمسة'), 'لمسه');
assert.strictEqual(normalizeArabicText('كوتشى'), 'كوتشي');
assert.strictEqual(normalizeArabicText('حِذَاءٌ'), 'حذاء');
assert.strictEqual(normalizeArabicText('كـوتـشـي'), 'كوتشي');
assert.strictEqual(normalizeArabicText('   SNEAKER  أبيض   '), 'sneaker ابيض');
console.log('✓ normalizeArabicText passed all assertions');

const variantsShoe = getSynonymsAndVariants('حذاء');
assert(variantsShoe.includes('حذاء'), 'Should include حذاء');
assert(variantsShoe.includes('كوتشي'), 'Should include كوتشي');
assert(variantsShoe.includes('سنيكرز'), 'Should include سنيكرز');
assert(variantsShoe.includes('شوز'), 'Should include شوز');
assert(variantsShoe.includes('sneaker'), 'Should include sneaker');
console.log('✓ getSynonymsAndVariants (shoe) passed all assertions');

const variantsWhiteUnaccented = getSynonymsAndVariants('ابيض');
assert(variantsWhiteUnaccented.includes('أبيض'), 'ابيض should expand to أبيض');
assert(variantsWhiteUnaccented.includes('ابيض'), 'ابيض should expand to ابيض');

const variantsWhiteAccented = getSynonymsAndVariants('أبيض');
assert(variantsWhiteAccented.includes('ابيض'), 'أبيض should expand to ابيض');
assert(variantsWhiteAccented.includes('أبيض'), 'أبيض should expand to أبيض');
console.log('✓ getSynonymsAndVariants (colors: ابيض == أبيض) passed');

const filter = buildProductSearchFilter('حذاء');
assert(filter && filter.OR && Array.isArray(filter.OR), 'Filter should have OR array');
const fields = new Set(filter.OR.flatMap(c => Object.keys(c)));
assert(fields.has('name'), 'Should search name');
assert(fields.has('description'), 'Should search description');
assert(fields.has('sku'), 'Should search sku');
assert(fields.has('category'), 'Should search category');
assert(fields.has('productVariants'), 'Should search productVariants');
console.log('✓ buildProductSearchFilter single word passed');

const filterMulti = buildProductSearchFilter('كوتشي ابيض');
assert(filterMulti && filterMulti.AND && filterMulti.AND.length === 2, 'Multi-word should have AND array of 2');
console.log('✓ buildProductSearchFilter multi-word passed');

// 2. Test Volume Discount Utils
console.log('\n--- Testing Volume Discount Utils ---');
const {
  applyVolumeDiscount,
  getVolumeDiscountsFromMetadata,
  buildMetadataWithVolumeDiscounts,
} = require('../volumeDiscountUtils');

const discounts = [
  { id: 'tier-2', minQuantity: 2, maxQuantity: 2, discountType: 'fixed', discountValue: 24, isActive: true },
  { id: 'tier-3', minQuantity: 3, maxQuantity: null, discountType: 'fixed', discountValue: 36, isActive: true },
];

const r2 = applyVolumeDiscount({ unitPrice: 300, quantity: 2, discounts });
assert.strictEqual(r2.effectiveUnitPrice, 276, '2 pieces should be 276 each');
assert.strictEqual(r2.lineSubtotal, 552, '2 pieces subtotal should be 552');
assert.strictEqual(r2.totalDiscount, 48, '2 pieces total discount should be 48');
console.log('✓ 2-piece volume discount (552 total, 276 each) passed');

const r3 = applyVolumeDiscount({ unitPrice: 300, quantity: 3, discounts });
assert.strictEqual(r3.effectiveUnitPrice, 264, '3 pieces should be 264 each');
assert.strictEqual(r3.lineSubtotal, 792, '3 pieces subtotal should be 792');
assert.strictEqual(r3.totalDiscount, 108, '3 pieces total discount should be 108');
console.log('✓ 3-piece volume discount (792 total, 264 each) passed');

const r1 = applyVolumeDiscount({ unitPrice: 300, quantity: 1, discounts });
assert.strictEqual(r1.effectiveUnitPrice, 300, '1 piece should be 300 (zero regression)');
assert.strictEqual(r1.lineSubtotal, 300, '1 piece subtotal should be 300');
assert.strictEqual(r1.totalDiscount, 0, '1 piece discount should be 0');
console.log('✓ 1-piece zero regression passed');

const rEmpty = applyVolumeDiscount({ unitPrice: 300, quantity: 5, discounts: [] });
assert.strictEqual(rEmpty.effectiveUnitPrice, 300, 'Product without discount should be 300');
assert.strictEqual(rEmpty.lineSubtotal, 1500, 'Product without discount subtotal should be 1500');
console.log('✓ Product without volume discounts zero regression passed');

// Single Source of Truth
const conflictingMeta = {
  quantityOffers: [{ id: 'qo-2', quantity: 2, unitPrice: 276, isActive: true }],
  volumeDiscounts: [{ id: 'vd-2', minQuantity: 2, discountType: 'fixed', discountValue: 10, isActive: true }],
};
const resolvedDiscounts = getVolumeDiscountsFromMetadata(conflictingMeta, { activeOnly: true, basePrice: 300 });
assert.strictEqual(resolvedDiscounts.length, 1);
assert.strictEqual(resolvedDiscounts[0].discountValue, 24, 'Single source of truth must pick quantityOffers (24 off)');
console.log('✓ Single source of truth (quantityOffers prioritized over volumeDiscounts) passed');

const updatedJson = buildMetadataWithVolumeDiscounts(conflictingMeta, [
  { minQuantity: 2, discountType: 'fixed', discountValue: 50 },
]);
const parsed = JSON.parse(updatedJson);
assert.strictEqual(parsed.quantityOffers, undefined, 'quantityOffers must be purged when volumeDiscounts are written');
console.log('✓ Single source of truth (purging conflicting quantityOffers on write) passed');

console.log('\n=========================================');
console.log('ALL UNIT TESTS PASSED SUCCESSFULLY! (100%)');
console.log('=========================================');
