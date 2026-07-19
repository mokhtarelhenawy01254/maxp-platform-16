
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function seed() {
  const prisma = getSharedPrismaClient();
  const companyId = 'cmmhkxobb0000vpk440j1n6ui';
  
  console.log('Seeding data for company:', companyId);
  
  // 1. Create a Warehouse if not exists
  let warehouse = await prisma.warehouse.findFirst({ where: { companyId } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        id: 'wh-' + Math.random().toString(36).substr(2, 9),
        name: 'المخزن الرئيسي',
        companyId
      }
    });
    console.log('Created Warehouse:', warehouse.name);
  } else {
    console.log('Using existing Warehouse:', warehouse.name);
  }
  
  // 2. Create Products
  const products = [];
  const productData = [
    { name: 'قميص قطني كلاسيك', sku: 'SHIRT-001', price: 450 },
    { name: 'بنطلون جينز أزرق', sku: 'JEANS-001', price: 850 },
    { name: 'حذاء رياضي مريح', sku: 'SHOES-001', price: 1200 }
  ];
  
  for (const p of productData) {
    let product = await prisma.product.findFirst({ where: { sku: p.sku, companyId } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          ...p,
          companyId,
          isActive: true
        }
      });
      console.log('Created Product:', product.name);
    }
    products.push(product);
    
    // 3. Add Inventory
    const inv = await prisma.inventory.findFirst({ where: { productId: product.id, warehouseId: warehouse.id } });
    if (!inv) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 10,
          available: 10,
          reserved: 0
        }
      });
      console.log('Added Inventory for:', product.name);
    }
  }
  
  // 3.5 Create a Customer
  let customer = await prisma.customer.findFirst({ where: { companyId } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyId,
        firstName: 'عميل',
        lastName: 'تجريبي',
        phone: '0123456789',
      }
    });
    console.log('Created Customer:', customer.firstName);
  }

  // 4. Create Orders
  const orderStatuses = ['CONFIRMED', 'PROCESSING', 'PENDING'];
  for (let i = 0; i < 5; i++) {
    const status = orderStatuses[i % orderStatuses.length];
    const orderNumber = `ORD-${Date.now()}-${i}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        companyId,
        customerId: customer.id,
        customerName: `عميل تجريبي ${i + 1}`,
        customerPhone: '0123456789',
        status,
        subtotal: products[i % products.length].price,
        total: products[i % products.length].price,
        orderItems: {
          create: [{
            productId: products[i % products.length].id,
            productName: products[i % products.length].name,
            quantity: 1,
            price: products[i % products.length].price,
            total: products[i % products.length].price
          }]
        }
      }
    });
    console.log('Created Order:', order.orderNumber, 'with status:', status);
  }
  
  console.log('Seeding completed successfully!');
}

seed().catch(console.error);
