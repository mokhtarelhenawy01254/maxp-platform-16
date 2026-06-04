
const { getSharedPrismaClient } = require('./services/sharedDatabase');
const orderService = require('./services/orderService');
const OrderConfirmationService = require('./services/orderConfirmationService');

async function verify() {
  const prisma = getSharedPrismaClient();
  const companyId = 'cmmhkxobb0000vpk440j1n6ui';
  
  console.log('🔍 Starting verification for auto-distribution on creation...');
  
  // 1. Get a customer
  const customer = await prisma.customer.findFirst({
    where: { companyId }
  });
  
  if (!customer) {
    console.error('❌ No customer found for testing.');
    return;
  }
  
  // orderService is already initialized but we can set company id if needed
  orderService.setCompanyId(companyId);
  
  const dummyOrder = {
    companyId,
    customerId: customer.id,
    conversationId: 'conv_' + Date.now(),
    customerName: customer.firstName + ' ' + customer.lastName,
    customerPhone: customer.phone,
    productName: 'Verification Product',
    productPrice: 100,
    quantity: 1,
    city: 'القاهرة',
    notes: 'Testing auto-distribution on creation'
  };
  
  console.log('📦 Creating order via OrderService...');
  const order = await orderService.createOrderFromConversation(dummyOrder);
  
  console.log(`✅ Order created: ${order.orderNumber} (ID: ${order.id})`);
  
  // 2. Check for assignment
  console.log('🕵️ Checking for assignment...');
  // Wait a bit just in case it's in background
  const assignment = await prisma.orderAssignment.findFirst({
    where: { 
      orderId: order.id,
      isActive: true
    }
  });
  
  if (assignment) {
    const user = await prisma.user.findUnique({
      where: { id: assignment.assignedTo },
      select: { firstName: true, lastName: true, role: true }
    });
    console.log(`🎊 SUCCESS! Order was auto-assigned to: ${user.firstName} ${user.lastName} (${user.role})`);
    console.log(`   Strategy used: ${assignment.strategy}`);
  } else {
    console.error('❌ FAILURE: Order was NOT assigned.');
    
    // Check settings to see why
    const settings = await OrderConfirmationService.getSettings(companyId);
    console.log('Settings:', JSON.stringify(settings, null, 2));
    
    // Check active members
    const members = await prisma.companyMember.findMany({
      where: { companyId, status: 'available' },
      include: { user: true }
    });
    console.log(`Available members: ${members.length}`);
    members.forEach(m => console.log(`- ${m.user.firstName} (${m.role})`));
  }
}

verify().catch(console.error);
