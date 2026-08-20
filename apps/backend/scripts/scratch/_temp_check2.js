const { PrismaClient } = require('./generated/postgresql_v2');
const prisma = new PrismaClient();
async function main() {
  for (const tbl of ['hotel_room_types','hotel_rooms','hotel_reservations']) {
    const cols = await prisma.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      tbl
    );
    console.log(`=== ${tbl} ===`);
    cols.forEach(c => console.log(`  ${c.column_name}`));
  }

  // Verify enum
  const enums = await prisma.$queryRawUnsafe(
    "SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'HotelPricingModel' ORDER BY e.enumsortorder"
  );
  console.log('=== HotelPricingModel enum ===');
  enums.forEach(e => console.log(`  ${e.enumlabel}`));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
