const { initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  const prisma = await initializeSharedDatabase();
  console.log("Searching for 12987...");

  const queries = [
    prisma.order.findFirst({ where: { id: "12987" } }),
    prisma.order.findFirst({ where: { orderNumber: "12987" } }),
    prisma.order.findFirst({ where: { orderNumber: { contains: "12987" } } }),
    prisma.guestOrder.findFirst({ where: { id: "12987" } }),
    prisma.guestOrder.findFirst({ where: { orderNumber: "12987" } }),
    prisma.guestOrder.findFirst({ where: { orderNumber: { contains: "12987" } } })
  ];

  const results = await Promise.all(queries);
  
  let found = false;
  results.forEach((res, i) => {
      if (res) {
          found = true;
          console.log(`Found match at query ${i}:`, res.orderNumber || res.id);
          console.log("Status:", res.status);
          console.log("ConfirmedAt:", res.confirmedAt || "N/A");
      }
  });

  if (!found) {
    console.log("Not found anywhere.");
    
    // Dump an order to see what it looks like
    const anyOrder = await prisma.order.findFirst({ orderBy: { createdAt: 'desc' } });
    console.log("Most recent order id:", anyOrder?.id, "orderNumber:", anyOrder?.orderNumber);
    const anyGuest = await prisma.guestOrder.findFirst({ orderBy: { createdAt: 'desc' } });
    console.log("Most recent guest order id:", anyGuest?.id, "orderNumber:", anyGuest?.orderNumber);
  }
}

main().catch(console.error).finally(() => process.exit(0));
