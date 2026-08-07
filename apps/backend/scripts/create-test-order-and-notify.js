// Create a real test order and verify the "new order" WhatsApp template is sent
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const prisma = getSharedPrismaClient();

const COMPANY_ID = 'cmleybpf70028juo2wwpmp8rt';
const CUSTOMER_PHONE = '01123087745';

async function run() {
  try {
    // 1. Find or create the customer
    let customer = await prisma.customer.findFirst({
      where: { companyId: COMPANY_ID, phone: CUSTOMER_PHONE }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId: COMPANY_ID,
          firstName: 'مختار',
          lastName: 'الحناوي',
          phone: CUSTOMER_PHONE,
          phoneNormalized: CUSTOMER_PHONE.replace(/[^0-9]/g, ''),
          status: 'LEAD'
        }
      });
      console.log('CUSTOMER_CREATED:', customer.id);
    } else {
      console.log('CUSTOMER_FOUND:', customer.id, customer.firstName, customer.lastName);
    }

    // 2. Create a real order
    const orderNumber = 'TEST-' + Date.now();
    const order = await prisma.order.create({
      data: {
        orderNumber,
        companyId: COMPANY_ID,
        customerId: customer.id,
        status: 'PENDING',
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: CUSTOMER_PHONE,
        subtotal: 500,
        shipping: 0,
        tax: 0,
        discount: 0,
        total: 500,
        currency: 'EGP',
        sourceType: 'ai_conversation',
        orderItems: {
          create: [
            {
              productName: 'تيشيرت أحمر',
              quantity: 2,
              productColor: 'أحمر',
              productSize: 'XL',
              price: 250
            }
          ]
        }
      },
      include: { orderItems: true }
    });
    console.log('ORDER_CREATED:', order.id, order.orderNumber, 'total:', order.total);

    // 3. Send the new-order notification
    const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
    const result = await WhatsAppNotificationService.sendOrderCreatedNotification(order);
    console.log('RESULT:', JSON.stringify(result, null, 2));

    // 4. Wait and check the notification log
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const logs = await prisma.whatsAppNotificationLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    if (logs.length > 0) {
      console.log('LOG:', JSON.stringify({
        status: logs[0].status,
        eventType: logs[0].eventType,
        recipientPhone: logs[0].recipientPhone,
        failureReason: logs[0].failureReason
      }));
    } else {
      console.log('LOG: none found');
    }

    // 5. Check WhatsApp messages for this phone
    const msgs = await prisma.$queryRawUnsafe(
      'SELECT id, remote_jid, content, status, "createdAt" FROM whatsapp_messages WHERE remote_jid LIKE $1 ORDER BY "createdAt" DESC LIMIT 5',
      '%1123087745%'
    );
    console.log('WHATSAPP_MESSAGES:', JSON.stringify(msgs));

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

run();
