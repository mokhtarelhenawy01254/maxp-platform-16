const { t: i18n } = require('./i18n');
const { t: i18n } = require('./i18ni18n.t('msg.c9f9c497')@prisma/clienti18n.t('msg.5a6aca9d')shippingCompany', 'governorate', 'city'],
  orderStatusTime: ['confirmedAt', 'shippedAt', 'deliveredAt'],
  productHealth: ['costPrice', 'stock'],
  returns: ['returnReason', 'refundAmount'],
  teamPerformance: ['assignedTo', 'assignedBy'],
  funnel: ['status', 'createdAt'],
  stockForecast: ['stock', 'isActive'],
  codPerformance: ['paymentMethod', 'status'],
  profit: ['costPrice', 'shippingCost'],
  regions: ['governorate', 'city', 'address']
};

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n');
  
  try {
    // Check Order model fields
    const sampleOrder = await prisma.order.findFirst({
      select: {
        id: true,
        status: true,
        total: true,
        shippingCompany: true,
        governorate: true,
        city: true,
        paymentMethod: true,
        confirmedAt: true,
        shippedAt: true,
        deliveredAt: true,
        assignedTo: true,
        createdAt: true
      }
    });
    
    console.log('✅ Order model fields accessible');
    
    // Check Product model fields
    const sampleProduct = await prisma.product.findFirst({
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        stock: true,
        isActive: true
      }
    });
    
    console.log('✅ Product model fields accessible');
    
    // Check OrderItem model
    const sampleOrderItem = await prisma.orderItem.findFirst({
      select: {
        id: true,
        orderId: true,
        productId: true,
        quantity: true,
        price: true
      }
    });
    
    console.log('✅ OrderItem model fields accessible');
    
    return true;
  } catch (error) {
    console.error('❌ Database schema check failed:', error.message);
    return false;
  }
}

async function testAnalyticsQueries(companyId) {
  console.log('\n🔍 Testing analytics queries...\n');
  
  const tests = [
    {
      name: 'Store Analytics',
      query: async () => {
        const orders = await prisma.order.findMany({
          where: { companyId: String(companyId) },
          take: 10
        });
        return orders.length;
      }
    },
    {
      name: 'Product Analytics',
      query: async () => {
        const products = await prisma.product.findMany({
          where: { companyId: String(companyId), isActive: true },
          take: 10
        });
        return products.length;
      }
    },
    {
      name: 'Order Items with Relations',
      query: async () => {
        const items = await prisma.orderItem.findMany({
          where: {
            orders: {
              companyId: String(companyId)
            }
          },
          include: {
            orders: {
              select: { status: true }
            },
            product: {
              select: { name: true, price: true }
            }
          },
          take: 10
        });
        return items.length;
      }
    },
    {
      name: 'Delivery Rate Query',
      query: async () => {
        const orders = await prisma.order.findMany({
          where: { companyId: String(companyId) },
          select: {
            id: true,
            status: true,
            total: true,
            shippingCompany: true,
            governorate: true,
            city: true
          },
          take: 10
        });
        return orders.length;
      }
    },
    {
      name: 'Stock Forecast Query',
      query: async () => {
        const products = await prisma.product.findMany({
          where: { companyId: String(companyId), isActive: true },
          select: {
            id: true,
            name: true,
            stock: true
          },
          take: 10
        });
        
        const orders = await prisma.order.findMany({
          where: {
            companyId: String(companyId),
            status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] }
          },
          select: { id: true },
          take: 10
        });
        
        return { products: products.length, orders: orders.length };
      }
    }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.query();
      console.log(`✅ ${test.name}: ${JSON.stringify(result)}`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting comprehensive analytics fix check...\n');
  
  // Check schema
  const schemaOk = await checkDatabaseSchema();
  
  if (!schemaOk) {
    console.log('\n❌ Schema check failed. Please fix database schema first.');
    return;
  }
  
  // Get a sample company ID
  const company = await prisma.company.findFirst();
  
  if (!company) {
    console.log('\n⚠️  No companies found in database');
    return;
  }
  
  console.log(`\n📊 Testing with company: ${company.name} (${company.id})`);
  
  // Test queries
  await testAnalyticsQueries(company.id);
  
  console.log('\n✅ All checks completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
