const { getSharedPrismaClient } = require('../services/sharedDatabase');

const prisma = getSharedPrismaClient();

async function updateTemplates() {
  try {
    // Get all ORDER_CREATED templates
    const templates = await prisma.whatsAppNotificationTemplate.findMany({
      where: { eventType: 'ORDER_CREATED' },
      select: { id: true, name: true, companyId: true, content: true }
    });
    
    console.log('Found', templates.length, 'ORDER_CREATED templates');
    
    for (const template of templates) {
      console.log('\n--- Template:', template.name, '---');
      console.log('Company:', template.companyId);
      console.log('Current content preview:', template.content.substring(0, 80));
      
      // Update with correct content
      const updated = await prisma.whatsAppNotificationTemplate.update({
        where: { id: template.id },
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
      
      console.log('âœ… Updated:', updated.name);
    }
    
    console.log('\nðŸŽ‰ All templates updated successfully!');
    
  } catch (error) {
    console.error('âŒ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplates();

