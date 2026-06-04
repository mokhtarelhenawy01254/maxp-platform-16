const { t: i18n } = require('./i18n');
const { t: i18n } = require('./i18ni18n.t('msg.16dd3e83')msg.c681a5a4'),
  customerPhone: '01123087745',
  orderNumber: 'TEST-123',
  orderItems: '\n📋 تفاصيل الطلب:\n1. تيشيرت | اللون: أحمر | المقاس: XL | الكمية: 2\n',
  total: '500',
  currency: 'EGP'
};

function replaceVariables(template, variables) {
  console.log('[TEST] Input variables:', JSON.stringify(variables, null, 2));
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    console.log(`[TEST] Replacing {${key}} with "${value}"`);
    result = result.replace(regex, value || '');
  }
  console.log('[TEST] Final result:');
  console.log(result);
  return result;
}

console.log('=== TESTING replaceVariables ===\n');
replaceVariables(template, variables);
