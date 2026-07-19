const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { safeDb } = require('../utils/safeDatabase');

const PRODUCT_CATALOG = [
  {
    name: 'AeroFit Running Shoes',
    slug: 'mokhtar-aerofit-running-shoes',
    description:
      'Lightweight running shoes with breathable mesh upper and anti-slip sole for daily training and long walks.',
    price: 1299.0,
    comparePrice: 1599.0,
    stock: 140,
    sku: 'MK-AEROFIT',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Mesh + EVA',
      warranty: '6 months',
      details: ['Cushioned insole', 'Flexible sole', 'Everyday comfort'],
    },
    variants: [
      { name: 'Black - 42', type: 'size', sku: 'MK-AEROFIT-BLK-42', price: 1299.0, stock: 40 },
      { name: 'Gray - 43', type: 'size', sku: 'MK-AEROFIT-GRY-43', price: 1299.0, stock: 50 },
      { name: 'Blue - 44', type: 'size', sku: 'MK-AEROFIT-BLU-44', price: 1349.0, stock: 30 },
    ],
  },
  {
    name: 'Urban Cotton T-Shirt',
    slug: 'mokhtar-urban-cotton-tshirt',
    description:
      'Premium 100% cotton t-shirt with relaxed fit, soft touch, and durable stitching for daily use.',
    price: 349.0,
    comparePrice: 449.0,
    stock: 300,
    sku: 'MK-URB-TSHIRT',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: '100% Cotton',
      fit: 'Regular',
      details: ['Breathable fabric', 'Machine washable', 'Colorfast printing'],
    },
    variants: [
      { name: 'White - M', type: 'size', sku: 'MK-URB-TS-WHT-M', price: 349.0, stock: 70 },
      { name: 'Black - L', type: 'size', sku: 'MK-URB-TS-BLK-L', price: 349.0, stock: 60 },
      { name: 'Olive - XL', type: 'size', sku: 'MK-URB-TS-OLV-XL', price: 379.0, stock: 40 },
    ],
  },
  {
    name: 'Zen Coffee Mug Set',
    slug: 'mokhtar-zen-coffee-mug-set',
    description:
      'Ceramic coffee mug set of 4 pieces with minimalist design, heat-resistant body, and easy-grip handles.',
    price: 499.0,
    comparePrice: 599.0,
    stock: 120,
    sku: 'MK-ZEN-MUG',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Ceramic',
      capacity: '320ml',
      details: ['Microwave safe', 'Dishwasher friendly', 'Scratch resistant glaze'],
    },
    variants: [
      { name: 'Ivory Set', type: 'color', sku: 'MK-ZEN-MUG-IVR', price: 499.0, stock: 50 },
      { name: 'Matte Black Set', type: 'color', sku: 'MK-ZEN-MUG-MBK', price: 529.0, stock: 45 },
    ],
  },
  {
    name: 'PureGlow Desk Lamp',
    slug: 'mokhtar-pureglow-desk-lamp',
    description:
      'Adjustable LED desk lamp with three light modes, eye-care diffuser, and touch brightness control.',
    price: 799.0,
    comparePrice: 949.0,
    stock: 90,
    sku: 'MK-PUREGLOW',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      power: '12W',
      warranty: '12 months',
      details: ['Touch panel', 'USB power mode', 'Low flicker design'],
    },
    variants: [
      { name: 'White Body', type: 'color', sku: 'MK-PUREGLOW-WHT', price: 799.0, stock: 30 },
      { name: 'Black Body', type: 'color', sku: 'MK-PUREGLOW-BLK', price: 829.0, stock: 35 },
      { name: 'Sand Body', type: 'color', sku: 'MK-PUREGLOW-SND', price: 829.0, stock: 25 },
    ],
  },
  {
    name: 'StormShield Backpack',
    slug: 'mokhtar-stormshield-backpack',
    description:
      'Water-resistant backpack with laptop sleeve, anti-theft zipper pocket, and ergonomic shoulder straps.',
    price: 1199.0,
    comparePrice: 1399.0,
    stock: 110,
    sku: 'MK-STORM-BAG',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Water-resistant polyester',
      capacity: '28L',
      details: ['Fits 15.6 inch laptop', 'Dual side pockets', 'Breathable back support'],
    },
    variants: [
      { name: 'Navy', type: 'color', sku: 'MK-STORM-NVY', price: 1199.0, stock: 40 },
      { name: 'Charcoal', type: 'color', sku: 'MK-STORM-CHR', price: 1199.0, stock: 35 },
      { name: 'Khaki', type: 'color', sku: 'MK-STORM-KHK', price: 1249.0, stock: 25 },
    ],
  },
  {
    name: 'SilkTouch Bed Sheet Set',
    slug: 'mokhtar-silktouch-bed-sheet-set',
    description:
      'Ultra-soft microfiber bed sheet set including flat sheet, fitted sheet, and two pillow covers.',
    price: 899.0,
    comparePrice: 1099.0,
    stock: 150,
    sku: 'MK-SILK-SHEET',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Microfiber',
      threadCount: '400TC',
      details: ['Wrinkle resistant', 'Easy wash', 'Soft all-season texture'],
    },
  },
  {
    name: 'KitchenPro Knife Set',
    slug: 'mokhtar-kitchenpro-knife-set',
    description:
      'Stainless steel kitchen knife set with ergonomic handles and rust-resistant blades for everyday prep.',
    price: 649.0,
    comparePrice: 799.0,
    stock: 95,
    sku: 'MK-KNIFE-SET',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506368083636-6defb67639a7?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Stainless steel',
      pieces: 6,
      details: ['Anti-slip handle', 'Balanced weight', 'Protective blade covers'],
    },
  },
  {
    name: 'ActiveBand Fitness Tracker',
    slug: 'mokhtar-activeband-fitness-tracker',
    description:
      'Daily fitness tracker with heart-rate monitor, sleep insights, and up to 10-day battery life.',
    price: 999.0,
    comparePrice: 1199.0,
    stock: 130,
    sku: 'MK-ACTIVE-BAND',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544117519-31a4b719223d?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      display: '1.47 inch AMOLED',
      waterResistance: '5 ATM',
      details: ['Step counting', 'SpO2 tracking', 'Phone notifications'],
    },
  },
  {
    name: 'CloudRest Neck Pillow',
    slug: 'mokhtar-cloudrest-neck-pillow',
    description:
      'Memory foam neck pillow designed for travel comfort with breathable cover and compact carry bag.',
    price: 399.0,
    comparePrice: 499.0,
    stock: 210,
    sku: 'MK-CLOUDREST',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      fill: 'Memory foam',
      cover: 'Breathable fabric',
      details: ['Portable design', 'Washable cover', 'Neck support shape'],
    },
  },
  {
    name: 'Breeze Portable Blender',
    slug: 'mokhtar-breeze-portable-blender',
    description:
      'Rechargeable portable blender with strong blades, 380ml cup, and one-touch blending for smoothies.',
    price: 749.0,
    comparePrice: 899.0,
    stock: 85,
    sku: 'MK-BREEZE-BLEND',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      capacity: '380ml',
      battery: '2000mAh',
      details: ['USB-C charging', 'Self-clean mode', 'Food-grade cup material'],
    },
  },
];

async function findTargetCompany() {
  const exactName = await safeDb.findFirst('Company', {
    where: { name: { equals: 'mokhtar', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true, email: true },
  });

  if (exactName) return exactName;

  const exactSlug = await safeDb.findFirst('Company', {
    where: { slug: { equals: 'mokhtar', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true, email: true },
  });

  if (exactSlug) return exactSlug;

  const fallback = await safeDb.findFirst('Company', {
    where: {
      OR: [
        { name: { contains: 'mokhtar', mode: 'insensitive' } },
        { slug: { contains: 'mokhtar', mode: 'insensitive' } },
        { email: { contains: 'mokhtar', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, email: true },
  });

  return fallback;
}

async function upsertProduct(companyId, item, index) {
  const payload = {
    name: item.name,
    description: item.description,
    price: item.price,
    comparePrice: item.comparePrice,
    stock: item.stock,
    sku: item.sku,
    isActive: true,
    isFeatured: Boolean(item.isFeatured),
    slug: item.slug,
    companyId,
    mainImage: item.mainImage,
    images: JSON.stringify(item.images),
    tags: JSON.stringify(['mokhtar', 'new', 'catalog-2026']),
    metadata: JSON.stringify(item.metadata),
  };

  const existing = await safeDb.findFirst('Product', {
    where: { companyId, slug: item.slug },
    select: { id: true, name: true },
  });

  let productId = null;
  let action = 'created';

  if (existing) {
    const updated = await safeDb.update('Product', {
      where: { id: existing.id },
      data: payload,
      select: { id: true, name: true, slug: true },
    });
    productId = updated.id;
    action = 'updated';
  } else {
    const created = await safeDb.create('Product', {
      data: payload,
      select: { id: true, name: true, slug: true },
    });
    productId = created.id;
  }

  // Keep variants in sync for idempotent behavior.
  await safeDb.deleteMany('ProductVariant', {
    where: { productId },
  });

  if (Array.isArray(item.variants) && item.variants.length > 0) {
    for (let i = 0; i < item.variants.length; i += 1) {
      const variant = item.variants[i];
      await safeDb.create('ProductVariant', {
        data: {
          productId,
          name: variant.name,
          type: variant.type || 'color',
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,
          isActive: true,
          sortOrder: i + 1,
          images: JSON.stringify(item.images.slice(0, 2)),
        },
      });
    }
  }

  return {
    action,
    productId,
    name: item.name,
    slug: item.slug,
    variantsCount: Array.isArray(item.variants) ? item.variants.length : 0,
  };
}

async function main() {
  console.log('Starting Mokhtar catalog seeding...');
  const company = await findTargetCompany();

  if (!company) {
    throw new Error('No company found matching "mokhtar".');
  }

  console.log(
    `Target company: ${company.name} | slug=${company.slug || 'N/A'} | id=${company.id}`,
  );

  const results = [];
  for (let i = 0; i < PRODUCT_CATALOG.length; i += 1) {
    const result = await upsertProduct(company.id, PRODUCT_CATALOG[i], i);
    results.push(result);
    console.log(
      `- ${result.action.toUpperCase()}: ${result.name} (${result.slug}) variants=${result.variantsCount}`,
    );
  }

  const totalProducts = await safeDb.count('Product', {
    where: { companyId: company.id },
  });

  const productsWithVariants = await safeDb.count('Product', {
    where: {
      companyId: company.id,
      productVariants: {
        some: {},
      },
    },
  });

  console.log('\nCompleted successfully.');
  console.log(`Inserted/updated in this run: ${results.length}`);
  console.log(`Company total products now: ${totalProducts}`);
  console.log(`Products with variants now: ${productsWithVariants}`);
}

main()
  .catch((error) => {
    console.error('Failed to add Mokhtar products:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Prisma lifecycle is managed by safeDb shared client.
  });
