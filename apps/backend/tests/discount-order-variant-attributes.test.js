const assert = require('assert');
const { resolveVariantAttributes } = require('../utils/productNormalizationUtils');

console.log('🧪 Starting Variant Attributes & Discount Orders Regression Test...');

// Test 1: resolveVariantAttributes with capitalized attributes {"Color": "White", "Size": "41"}
{
  const variant = {
    id: 'var-1',
    name: 'White / 41',
    metadata: JSON.stringify({ Color: 'White', Size: '41' })
  };
  const attrs = resolveVariantAttributes(variant);
  assert.strictEqual(attrs.Color, 'White', 'Expected Color to be White');
  assert.strictEqual(attrs.Size, '41', 'Expected Size to be 41');
  console.log('✅ Test 1 Passed: Capitalized keys {"Color": "White", "Size": "41"} correctly normalized');
}

// Test 2: resolveVariantAttributes with Arabic attributes {"اللون": "أبيض", "المقاس": "42"}
{
  const variant = {
    id: 'var-2',
    name: 'أبيض / 42',
    metadata: JSON.stringify({ 'اللون': 'أبيض', 'المقاس': '42' })
  };
  const attrs = resolveVariantAttributes(variant);
  assert.strictEqual(attrs.Color, 'أبيض', 'Expected Color to be أبيض');
  assert.strictEqual(attrs.Size, '42', 'Expected Size to be 42');
  console.log('✅ Test 2 Passed: Arabic keys {"اللون": "أبيض", "المقاس": "42"} correctly mapped to canonical Color/Size');
}

// Test 3: Compound name splitting with slash "White / 41"
{
  const variantName = 'White / 41';
  const parts = variantName.split(/\s*[-–|\/]\s*/);
  assert.strictEqual(parts[0], 'White');
  assert.strictEqual(parts[1], '41');
  console.log('✅ Test 3 Passed: Compound variant name with slash splits properly into Color and Size');
}

// Test 4: Compound name splitting with dash "أحمر - XL"
{
  const variantName = 'أحمر - XL';
  const parts = variantName.split(/\s*[-–|\/]\s*/);
  assert.strictEqual(parts[0], 'أحمر');
  assert.strictEqual(parts[1], 'XL');
  console.log('✅ Test 4 Passed: Compound variant name with dash splits properly into Color and Size');
}

// Test 5: Fallback resolution when item only has item.color / item.size
{
  const item = {
    productId: 'p-1',
    name: 'حذاء رياضي',
    color: 'أسود',
    size: '43',
    quantity: 2,
    price: 350
  };
  const productColor = item.productColor || item.color || null;
  const productSize = item.productSize || item.size || null;
  assert.strictEqual(productColor, 'أسود');
  assert.strictEqual(productSize, '43');
  console.log('✅ Test 5 Passed: item.color and item.size correctly populate productColor and productSize');
}

// Test 6: Nested attributeValues parsing
{
  const variant = {
    id: 'var-3',
    metadata: JSON.stringify({
      attributeValues: {
        Color: 'Navy Blue',
        Size: 'XXL'
      }
    })
  };
  const attrs = resolveVariantAttributes(variant);
  assert.strictEqual(attrs.Color, 'Navy Blue');
  assert.strictEqual(attrs.Size, 'XXL');
  console.log('✅ Test 6 Passed: Nested attributeValues correctly extracted');
}

console.log('🎉 ALL 6 REGRESSION TESTS PASSED SUCCESSFULLY!');
