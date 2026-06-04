// Test replaceVariables with actual data
const { getSharedPrismaClient } = require('../services/sharedDatabase');

function replaceVariables(template, variables) {
  console.log(`\n[REPLACE-VARS] Input variables:`, JSON.stringify(variables, null, 2));
  console.log(`[REPLACE-VARS] Template:`, template?.substring(0, 100));
  
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    console.log(`[REPLACE-VARS] Replacing {${key}} with "${value}"`);
    result = result.replace(regex, value || '');
  }
  console.log(`[REPLACE-VARS] Final result:`, result?.substring(0, 200));
  return result;
}

async function test() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Get template content from recent log
    const log = await prisma.whatsAppNotificationLog.findFirst({
      where: { eventType: 'ORDER_CONFIRMED' },
      orderBy: { createdAt: 'desc' },
      select: { content: true }
    });
    
    if (log) {
      console.log('\nðŸ“‹ Template from DB (stored content):');
      console.log(log.content?.substring(0, 300));
      
      // Check if template has {customerPhone} literal
      console.log('\nðŸ” Checking for variable patterns:');
      console.log('Has {customerPhone}?', log.content?.includes('{customerPhone}'));
      console.log('Has {orderItems}?', log.content?.includes('{orderItems}'));
      console.log('Has {customerName}?', log.content?.includes('{customerName}'));
      
      // Extract the template part (before replacement should happen)
      // The template should be stored BEFORE replacement
    }
    
    // Test with sample data
    const sampleTemplate = `Ø£Ù‡Ù„Ø§ Ø¨Ø­Ø¶Ø±ØªÙƒ Ù†ÙˆØ±ØªÙŠÙ†Ø§ ðŸŒŸ

âœ… ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø·Ù„Ø¨

ðŸ‘¤ Ø§Ù„Ø¹Ù…ÙŠÙ„: {customerName}
ðŸ“± Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ: {customerPhone}
ðŸ“¦ Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨: {orderNumber}
{orderItems}
ðŸ’° Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: {total} {currency}

ðŸš€ Ø³ÙŠØªÙ… Ø§Ù„Ø¨Ø¯Ø¡ ÙÙŠ Ø§Ù„ØªØ¬Ù‡ÙŠØ² Ø­Ø§Ù„Ø§Ù‹`;

    const sampleVars = {
      customerName: 'Ù…Ø®ØªØ§Ø± Ø§Ù„Ø­Ù†Ø§ÙˆÙŠ',
      customerPhone: '01123087745',
      orderNumber: 'TEST-123',
      orderItems: '\nðŸ“‹ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨:\n1. ØªÙŠØ´ÙŠØ±Øª | Ø§Ù„Ù„ÙˆÙ†: Ø£Ø­Ù…Ø± | Ø§Ù„Ù…Ù‚Ø§Ø³: XL\n',
      total: '500',
      currency: 'EGP'
    };
    
    console.log('\nðŸ§ª TESTING replaceVariables with sample data:');
    const result = replaceVariables(sampleTemplate, sampleVars);
    console.log('\nâœ… Result:');
    console.log(result);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();

