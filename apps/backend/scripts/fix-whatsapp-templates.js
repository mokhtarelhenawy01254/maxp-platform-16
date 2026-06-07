/**
 * Update WhatsApp Templates - Fix variables without deleting data
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const prisma = getSharedPrismaClient();

async function updateTemplates() {
  try {
    // Update ORDER_CREATED templates to use correct variables
    const orderCreatedResult = await prisma.whatsAppNotificationTemplate.updateMany({
      where: { 
        eventType: 'ORDER_CREATED',
        isActive: true
      },
      data: {
        content: `Ø£Ù‡Ù„Ø§ Ø¨Ø­Ø¶Ø±ØªÙƒ Ù†ÙˆØ±ØªÙŠÙ†Ø§ ðŸŒŸ

âœ… ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø·Ù„Ø¨

ðŸ‘¤ Ø§Ù„Ø¹Ù…ÙŠÙ„: {customerName}
ðŸ“± Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ: {customerPhone}
ðŸ“¦ Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨: {orderNumber}
{orderItems}
ðŸ’° Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: {total} {currency}

ðŸš€ Ø³ÙŠØªÙ… Ø§Ù„Ø¨Ø¯Ø¡ ÙÙŠ Ø§Ù„ØªØ¬Ù‡ÙŠØ² Ø­Ø§Ù„Ø§Ù‹`
      }
    });
    
    console.log('âœ… ORDER_CREATED templates updated:', orderCreatedResult.count);
    
    // Update ORDER_CONFIRMED templates
    const orderConfirmedResult = await prisma.whatsAppNotificationTemplate.updateMany({
      where: { 
        eventType: 'ORDER_CONFIRMED',
        isActive: true
      },
      data: {
        content: `Ø£Ù‡Ù„Ø§ Ø¨Ø­Ø¶Ø±ØªÙƒ Ù†ÙˆØ±ØªÙŠÙ†Ø§ ðŸŒŸ

âœ… ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø·Ù„Ø¨

ðŸ‘¤ Ø§Ù„Ø¹Ù…ÙŠÙ„: {customerName}
ðŸ“± Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ: {customerPhone}
ðŸ“¦ Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨: {orderNumber}
{orderItems}
ðŸ’° Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: {total} {currency}

ðŸš€ Ø³ÙŠØªÙ… Ø§Ù„Ø¨Ø¯Ø¡ ÙÙŠ Ø§Ù„ØªØ¬Ù‡ÙŠØ² Ø­Ø§Ù„Ø§Ù‹`
      }
    });
    
    console.log('âœ… ORDER_CONFIRMED templates updated:', orderConfirmedResult.count);
    console.log('\nðŸŽ‰ Templates updated successfully!');
    console.log('ðŸ” Restart the server to apply changes');
    
  } catch (error) {
    console.error('âŒ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplates();

