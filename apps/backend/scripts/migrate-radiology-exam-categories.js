const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { normalizeModality } = require('../utils/radiologyModality');

const main = async () => {
  const prisma = getSharedPrismaClient();

  const examTypes = await prisma.radiologyExamType.findMany({
    where: { category: { not: null }, NOT: { category: '' } },
    select: { id: true, companyId: true, category: true, categoryId: true },
  });
  console.log(`Found ${examTypes.length} exam types with a category string`);

  const existingCategories = await prisma.radiologyExamCategory.findMany({
    select: { id: true, companyId: true, name: true },
  });
  const categoryByKey = new Map(
    existingCategories.map(c => [`${c.companyId || ''}|${c.name}`, c])
  );

  const distinct = new Map();
  for (const et of examTypes) {
    const name = String(et.category || '').trim();
    if (!name) continue;
    const key = `${et.companyId || ''}|${name}`;
    if (!distinct.has(key)) distinct.set(key, { companyId: et.companyId, name });
  }
  console.log(`Distinct categories to ensure: ${distinct.size}`);

  const created = [];
  for (const [key, { companyId, name }] of distinct.entries()) {
    if (!categoryByKey.has(key)) {
      const category = await prisma.radiologyExamCategory.create({
        data: { companyId, name, modality: normalizeModality(name) },
      });
      categoryByKey.set(key, category);
      created.push(category);
    }
  }
  console.log(`Created ${created.length} categories`);

  let linked = 0;
  for (const et of examTypes) {
    if (et.categoryId) continue;
    const name = String(et.category || '').trim();
    if (!name) continue;
    const category = categoryByKey.get(`${et.companyId || ''}|${name}`);
    if (!category) continue;
    await prisma.radiologyExamType.update({
      where: { id: et.id },
      data: { categoryId: category.id },
    });
    linked++;
  }
  console.log(`Linked ${linked} exam types to categories`);
};

main()
  .then(() => { console.log('Migration complete'); process.exit(0); })
  .catch((err) => { console.error('Migration failed:', err); process.exit(1); });
