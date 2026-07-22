const { getSharedPrismaClient, safeQuery } = require('./services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();

  console.log("=== RAW SQL SEARCH FOR 38115555 ===");

  // Query PostgreSQL information_schema to find all columns that contain 'turbo' or string searching
  const tablesWithTurbo = await prisma.$queryRaw`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND (column_name LIKE '%turbo%' OR column_name LIKE '%order%');
  `;
  console.log("Columns matching 'turbo' or 'order':", tablesWithTurbo);

  // Search orders table
  const ordersFound = await prisma.$queryRaw`
    SELECT id, "orderNumber", "companyId", "turboShipmentId", "turboTrackingNumber", "turboShipmentStatus", "turboMetadata"
    FROM orders
    WHERE "turboTrackingNumber" LIKE '%38115555%'
       OR "turboShipmentId" LIKE '%38115555%'
       OR "orderNumber" LIKE '%38115555%'
       OR "turboMetadata" LIKE '%38115555%';
  `;
  console.log("\n📦 Raw SQL Orders found:", ordersFound);

  // Search guest_orders table
  const guestOrdersFound = await prisma.$queryRaw`
    SELECT id, "orderNumber", "companyId", "turboShipmentId", "turboTrackingNumber", "turboShipmentStatus", "turboMetadata"
    FROM guest_orders
    WHERE "turboTrackingNumber" LIKE '%38115555%'
       OR "turboShipmentId" LIKE '%38115555%'
       OR "orderNumber" LIKE '%38115555%'
       OR "turboMetadata" LIKE '%38115555%';
  `;
  console.log("\n👤 Raw SQL GuestOrders found:", guestOrdersFound);

  // Search all companies that have non-null turboApiKey in companies table
  const companiesWithKey = await prisma.$queryRaw`
    SELECT id, name, "turboEnabled", "turboApiKey", "turboMainClientCode", "turboSenderNumber"
    FROM companies
    WHERE "turboApiKey" IS NOT NULL OR "turboEnabled" = true;
  `;
  console.log("\n🏢 Companies with Turbo key or enabled:", companiesWithKey);

  // Search orders with any turboShipmentId non-null
  const ordersWithTurboShipment = await prisma.$queryRaw`
    SELECT id, "orderNumber", "companyId", "turboShipmentId", "turboTrackingNumber", "turboShipmentStatus"
    FROM orders
    WHERE "turboShipmentId" IS NOT NULL OR "turboTrackingNumber" IS NOT NULL
    LIMIT 20;
  `;
  console.log("\n📦 Sample Orders with Turbo Shipment:", ordersWithTurboShipment);
}

main().catch(err => {
  console.error("SQL Error:", err);
  process.exit(1);
});
