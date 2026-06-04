const { t: i18n } = require('./i18n');
// Direct test of the fixed replaceVariables logic
function replaceVariables(template, variables) {
  console.log('[REPLACE-VARS] Input variables keys:', Object.keys(variables));
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    const matches = result.match(regex);
    if (matches) {
      console.log(`[REPLACE-VARS] Replacing {${key}} (${matches.length} matches) with "${value?.substring?.(0, 30) || value}"`);
      result = result.replace(regex, value || 'i18n.t('msg.c2760dc1i18n.t('msg.2396f713'),
    customerPhone: '01123087745',
    orderNumber: 'TEST-ORD-001',
    orderItems: '\n📋 تفاصيل الطلب:\n1. تيشيرت رجالي | اللون: أحمر | المقاس: XL | الكمية: 2\n',
    total: '500',
    currency: 'EGP'
  };

  const recipientName = i18n.t('msg.c681a5a4');
  const recipientPhone = '01123087745';

  console.log('\n🧪 Testing FIXED logic (variables spread FIRST):\n');

  // OLD (broken) logic - variables at the end
  console.log('❌ OLD logic (broken):');
  const oldResult = replaceVariables(template, {
    customerName: receivedVariables.customerName || recipientName || i18n.t('msg.7afe3275'),
    customerPhone: receivedVariables.customerPhone || recipientPhone || '',
    orderNumber: receivedVariables.orderNumber || '',
    orderItems: receivedVariables.orderItems || '',
    total: receivedVariables.total || '0',
    currency: receivedVariables.currency || 'EGP',
    ...receivedVariables  // This would OVERWRITE with same values
  });
  console.log('Result:', oldResult.substring(0, 200));
  console.log('Has {customerPhone}?', oldResult.includes('{customerPhone}'));

  console.log('\n✅ NEW logic (fixed) - spread variables FIRST:');
  const newResult = replaceVariables(template, {
    ...receivedVariables,  // Spread FIRST
    customerName: receivedVariables.customerName || recipientName || i18n.t('msg.7afe3275'),
    customerPhone: receivedVariables.customerPhone || recipientPhone || '',
    orderNumber: receivedVariables.orderNumber || '',
    orderItems: receivedVariables.orderItems || '',
    total: receivedVariables.total || '0',
    currency: receivedVariables.currency || 'EGP'
  });
  console.log('Result:', newResult.substring(0, 200));
  console.log('Has {customerPhone}?', newResult.includes('{customerPhone}'));
  console.log('Has {orderItems}?', newResult.includes('{orderItems}'));

  console.log('\n📊 Comparison:');
  console.log('- OLD has unreplaced variables:', oldResult.includes('{customerPhone}') || oldResult.includes('{orderItems}'));
  console.log('- NEW has unreplaced variables:', newResult.includes('{customerPhone}') || newResult.includes('{orderItems}'));
}

testFixedLogic();
