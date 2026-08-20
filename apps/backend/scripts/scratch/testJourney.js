const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();
const WhatsAppJourneyService = require('./services/whatsapp/WhatsAppJourneyService');

async function testJourney() {
  console.log('--- STARTING JOURNEY TEST ---');
  try {
    // 1. Find a test company
    const company = await prisma.company.findFirst({
        where: { isActive: true }
    });
    if (!company) {
        console.log('No company found.');
        return;
    }
    const companyId = company.id;
    console.log(`Using Company ID: ${companyId}`);

    // 2. Ensure a Flow exists
    let flow = await prisma.whatsAppFollowUpFlow.findFirst({
        where: { companyId, isEnabled: true },
        include: { steps: true }
    });

    if (!flow) {
        console.log('Creating a dummy flow...');
        flow = await prisma.whatsAppFollowUpFlow.create({
            data: {
                companyId,
                name: 'Test Journey Flow',
                isEnabled: true,
                steps: {
                    create: [
                        { delayDays: 0, stepOrder: 1, content: 'مرحباً {{firstName}}! شكراً لاستلامك الطلب رقم {{orderNumber}}. ما هو تقييمك؟' },
                        { delayDays: 1, stepOrder: 2, content: 'هذه رسالة تذكيرية بعد يوم من استلام الطلب.' }
                    ]
                }
            },
            include: { steps: true }
        });
    }
    console.log(`Using Flow: ${flow.name} with ${flow.steps.length} steps`);

    // 3. Enable dummy settings for testing
    console.log('Enabling Dummy Notifications Settings & Workflow config for testing...');
    await prisma.whatsAppNotificationSettings.upsert({
         where: { companyId },
         create: { companyId, isEnabled: true },
         update: { isEnabled: true }
    });
    await prisma.orderWorkflowConfig.upsert({
         where: { companyId },
         create: { companyId, enabled: true },
         update: { enabled: true }
    });

    // 4. Find or create a test customer
    let customer = await prisma.customer.findFirst({
        where: { companyId }
    });
    if (!customer) {
        console.log('Creating dummy customer...');
        customer = await prisma.customer.create({
            data: {
                companyId,
                firstName: 'Test',
                lastName: 'User',
                email: 'test' + Date.now() + '@example.com',
                phone: '+201000000000',
            }
        });
    }
    console.log(`Using Customer: ${customer.firstName} ${customer.lastName} (${customer.id})`);

    // 4. Create a test order
    const orderNumber = 'TEST_ORD_' + Math.floor(Math.random() * 10000);
    const order = await prisma.order.create({
        data: {
            companyId,
            customerId: customer.id,
            orderNumber: orderNumber,
            status: 'DELIVERED', // Must be delivered
            subtotal: 1500.50,
            total: 1500.50,
            currency: 'EGP',
            customerPhone: customer.phone
        }
    });
    console.log(`Created Order: ${order.orderNumber} (${order.id}) with status DELIVERED`);

    // 5. Enroll Customer in Journey
    console.log('--- ENROLLING CUSTOMER ---');
    await WhatsAppJourneyService.enrollCustomer(companyId, customer.id, order.id);

    // 6. Check if enrolled
    const journeyRecord = await prisma.customerJourney.findFirst({
        where: { orderId: order.id, companyId }
    });
    console.log('Journey Record Created:', !!journeyRecord);
    if(journeyRecord) {
        console.log(`Status: ${journeyRecord.status}, Next Send At: ${journeyRecord.nextSendAt}`);
        
        // 7. Force "Next Send At" to be NOW so cron job picks it up immediately
        await prisma.customerJourney.update({
            where: { id: journeyRecord.id },
            data: { nextSendAt: new Date() }
        });
        console.log('Forced nextSendAt to NOW to test sending mechanism.');

        // 8. Trigger cron processor manually
        console.log('--- TRIGGERING CRON JOB MANUALLY ---');
        await WhatsAppJourneyService.processPendingJourneys();

        // 9. Inspect result
        const updatedJourney = await prisma.customerJourney.findUnique({
            where: { id: journeyRecord.id }
        });
        console.log('Journey Record After Processing:');
        console.log(`Current Step: ${updatedJourney.currentStep}`);
        console.log(`Status: ${updatedJourney.status}`);
        console.log(`Logs: \n${updatedJourney.logs}`);

        // 10. Test Cancel Journey Hook
        console.log('--- TESTING CANCELLATION HOOK ---');
        const orderWorkflowService = require('./services/orderWorkflowService');
        // Simulate order being returned
        console.log(`Bypassing complex workflow and simulating direct status change handler for order ${order.id} to RETURNED`);
        
        await prisma.order.update({ where: { id: order.id }, data: { status: 'RETURNED' } });

        // Then we can trigger the notification handler which does the journey cancellation
        try {
           await orderWorkflowService.sendWorkflowNotification(companyId, order, 'RETURNED', null, customer);
           console.log('Successfully called sendWorkflowNotification to simulate order RETURNED.');
        } catch(e) {
           console.log('sendWorkflowNotification catch:', e.message);
        }
        
        // Wait briefly
        await new Promise(r => setTimeout(r, 1000));
        
        // Verify cancellation
        const finalJourney = await prisma.customerJourney.findUnique({
            where: { id: journeyRecord.id }
        });
        console.log('Journey Status After Cancellation by Order RETURNED:', finalJourney ? finalJourney.status : 'NOT_FOUND');
    }

  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('--- TEST FINISHED ---');
  }
}

testJourney();
