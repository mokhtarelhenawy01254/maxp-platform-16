const { t: i18n } = require('./i18n');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { safeDb } = require('../utils/safeDatabase');

const TARGET_KEYWORD = 'mokhtar';

const CATEGORY_CATALOG = [
  {
    name: i18n.t('msg.f7facef0'),
    slug: 'running-shoes',
    description: i18n.t('msg.af3e646a'),
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.5d0698ec'),
    metaDescription: i18n.t('msg.46db9e9c'),
  },
  {
    name: i18n.t('msg.7defba49'),
    slug: 'casual-sneakers',
    description: i18n.t('msg.17cefb70'),
    image:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.857b8e7d'),
    metaDescription: i18n.t('msg.ad110941'),
  },
  {
    name: i18n.t('msg.e85bb30b'),
    slug: 'formal-shoes',
    description: i18n.t('msg.d0dbf637'),
    image:
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.a75b92d5'),
    metaDescription: i18n.t('msg.b1c601d1'),
  },
  {
    name: i18n.t('msg.8fa6cc40'),
    slug: 'slip-on-shoes',
    description: i18n.t('msg.a26b01d6'),
    image:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.04a22e05'),
    metaDescription: i18n.t('msg.3253bc67'),
  },
  {
    name: i18n.t('msg.dc4aca9b'),
    slug: 'comfort-sandals',
    description: i18n.t('msg.2a12750d'),
    image:
      'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.f9cacbc2'),
    metaDescription: i18n.t('msg.9c28b124'),
  },
  {
    name: i18n.t('msg.9ecc20ec'),
    slug: 'basic-tshirts',
    description: i18n.t('msg.a8663909'),
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.37afa462'),
    metaDescription: i18n.t('msg.afb546bf'),
  },
  {
    name: i18n.t('msg.0ce30595'),
    slug: 'winter-hoodies',
    description: i18n.t('msg.14419c09'),
    image:
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.ad9798f9'),
    metaDescription: i18n.t('msg.a98a6cb7'),
  },
  {
    name: i18n.t('msg.51e555b0'),
    slug: 'light-jackets',
    description: i18n.t('msg.88fb58d4'),
    image:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.d95552f4'),
    metaDescription: i18n.t('msg.b2f98ed5'),
  },
  {
    name: i18n.t('msg.825d8737'),
    slug: 'everyday-jeans',
    description: i18n.t('msg.849b8080'),
    image:
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.9360e5b0'),
    metaDescription: i18n.t('msg.1390ffc4'),
  },
  {
    name: i18n.t('msg.70a26e46'),
    slug: 'tracksuits',
    description: i18n.t('msg.344052c8'),
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',
    metaTitle: i18n.t('msg.e1fdf7b6'),
    metaDescription: i18n.t('msg.93c09947'),
  },
];

const PRODUCT_CATALOG = [
  {
    name: i18n.t('msg.8950fdd5'),
    slug: 'mokhtar-sprint-x-running-shoes',
    categorySlug: 'running-shoes',
    description:
      i18n.t('msg.99aa567f'),
    price: 1499,
    comparePrice: 1799,
    sku: 'MK-SPRINTX',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Mesh + EVA',
      collection: 'Footwear 2026',
      highlights: [i18n.t('msg.9dacb6ab'), i18n.t('msg.a681bc84'), i18n.t('msg.0721d8bc')],
    },
    colors: [
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.68ac0fa3'), code: 'WHT' },
      { label: i18n.t('msg.9357df1d'), code: 'GRY' },
    ],
    sizes: [
      { label: '41', code: '41' },
      { label: '42', code: '42' },
      { label: '43', code: '43' },
    ],
  },
  {
    name: i18n.t('msg.8c6a44a7'),
    slug: 'mokhtar-nova-street-sneakers',
    categorySlug: 'casual-sneakers',
    description:
      i18n.t('msg.ac815e86'),
    price: 1599,
    comparePrice: 1899,
    sku: 'MK-NOVAST',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Synthetic leather',
      collection: 'Streetwear 2026',
      highlights: [i18n.t('msg.29460d4b'), i18n.t('msg.eef2603d'), i18n.t('msg.3dbecbc7')],
    },
    colors: [
      { label: i18n.t('msg.68ac0fa3'), code: 'WHT' },
      { label: i18n.t('msg.69654f66'), code: 'NVY' },
      { label: i18n.t('msg.1a89b029'), code: 'BEI' },
    ],
    sizes: [
      { label: '41', code: '41' },
      { label: '42', code: '42' },
      { label: '43', code: '43' },
    ],
  },
  {
    name: i18n.t('msg.e942544f'),
    slug: 'mokhtar-classic-edge-formal-shoes',
    categorySlug: 'formal-shoes',
    description:
      i18n.t('msg.f69e63e8'),
    price: 1899,
    comparePrice: 2299,
    sku: 'MK-CLSEDG',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514996937319-344454492b37?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'PU leather',
      collection: 'Classic Office',
      highlights: [i18n.t('msg.7dd571a7'), i18n.t('msg.ad397460'), i18n.t('msg.0a69d1bd')],
    },
    colors: [
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.9c716ef9'), code: 'BRN' },
      { label: i18n.t('msg.d8ff43ce'), code: 'TAN' },
    ],
    sizes: [
      { label: '41', code: '41' },
      { label: '42', code: '42' },
      { label: '43', code: '43' },
    ],
  },
  {
    name: i18n.t('msg.df016902'),
    slug: 'mokhtar-flex-move-slip-on',
    categorySlug: 'slip-on-shoes',
    description:
      i18n.t('msg.96a83aa0'),
    price: 1399,
    comparePrice: 1649,
    sku: 'MK-FLEXMV',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1608256246200-53e8b47b2f80?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543508282-6319a3e2621f?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Knit fabric',
      collection: 'Easy Wear',
      highlights: [i18n.t('msg.b18194ac'), i18n.t('msg.3b3e81f8'), i18n.t('msg.eabc2506')],
    },
    colors: [
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.9357df1d'), code: 'GRY' },
      { label: i18n.t('msg.0f919fba'), code: 'OLV' },
    ],
    sizes: [
      { label: '41', code: '41' },
      { label: '42', code: '42' },
      { label: '43', code: '43' },
    ],
  },
  {
    name: i18n.t('msg.498713b2'),
    slug: 'mokhtar-terra-walk-sandals',
    categorySlug: 'comfort-sandals',
    description:
      i18n.t('msg.3c51098f'),
    price: 999,
    comparePrice: 1249,
    sku: 'MK-TERRAW',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1605348532760-6753d2c43329?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Soft synthetic upper',
      collection: 'Summer Comfort',
      highlights: [i18n.t('msg.ea22ddac'), i18n.t('msg.161ccb68'), i18n.t('msg.a6b1af82')],
    },
    colors: [
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.9c716ef9'), code: 'BRN' },
      { label: i18n.t('msg.67a6d87f'), code: 'KHK' },
    ],
    sizes: [
      { label: '41', code: '41' },
      { label: '42', code: '42' },
      { label: '43', code: '43' },
    ],
  },
  {
    name: i18n.t('msg.530f0d59'),
    slug: 'mokhtar-core-cotton-tshirt',
    categorySlug: 'basic-tshirts',
    description:
      i18n.t('msg.5733c065'),
    price: 399,
    comparePrice: 499,
    sku: 'MK-CORETS',
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
      collection: 'Basics',
      highlights: [i18n.t('msg.a92b0712'), i18n.t('msg.71cac032'), i18n.t('msg.c8f353cf')],
    },
    colors: [
      { label: i18n.t('msg.68ac0fa3'), code: 'WHT' },
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.69654f66'), code: 'NVY' },
    ],
    sizes: [
      { label: 'M', code: 'M' },
      { label: 'L', code: 'L' },
      { label: 'XL', code: 'XL' },
    ],
  },
  {
    name: i18n.t('msg.61d4f360'),
    slug: 'mokhtar-urban-shield-hoodie',
    categorySlug: 'winter-hoodies',
    description:
      i18n.t('msg.1e14636d'),
    price: 799,
    comparePrice: 949,
    sku: 'MK-URBHD',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Cotton blend fleece',
      collection: 'Urban Winter',
      highlights: [i18n.t('msg.e1944a1a'), i18n.t('msg.7489ab2d'), i18n.t('msg.e742393e')],
    },
    colors: [
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.9357df1d'), code: 'GRY' },
      { label: i18n.t('msg.0f919fba'), code: 'OLV' },
    ],
    sizes: [
      { label: 'M', code: 'M' },
      { label: 'L', code: 'L' },
      { label: 'XL', code: 'XL' },
    ],
  },
  {
    name: i18n.t('msg.89de2445'),
    slug: 'mokhtar-aero-light-jacket',
    categorySlug: 'light-jackets',
    description:
      i18n.t('msg.ac2fdf4c'),
    price: 1099,
    comparePrice: 1299,
    sku: 'MK-AEROLT',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523398002811-999ca8dec234?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Lightweight woven fabric',
      collection: 'Transit Season',
      highlights: [i18n.t('msg.161ccb68'), i18n.t('msg.c2ec4f9b'), i18n.t('msg.c8f353cf')],
    },
    colors: [
      { label: i18n.t('msg.69654f66'), code: 'NVY' },
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.e960294b'), code: 'SND' },
    ],
    sizes: [
      { label: 'M', code: 'M' },
      { label: 'L', code: 'L' },
      { label: 'XL', code: 'XL' },
    ],
  },
  {
    name: i18n.t('msg.0ed0d2c9'),
    slug: 'mokhtar-denim-line-jeans',
    categorySlug: 'everyday-jeans',
    description:
      i18n.t('msg.557a8fab'),
    price: 899,
    comparePrice: 1099,
    sku: 'MK-DENIML',
    isFeatured: false,
    mainImage:
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582552938357-32b906df40cb?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Stretch denim',
      collection: 'Daily Denim',
      highlights: [i18n.t('msg.a386f88c'), i18n.t('msg.c35b0991'), i18n.t('msg.e2593671')],
    },
    colors: [
      { label: i18n.t('msg.a2c285ec'), code: 'BLU' },
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.9357df1d'), code: 'GRY' },
    ],
    sizes: [
      { label: '32', code: '32' },
      { label: '34', code: '34' },
      { label: '36', code: '36' },
    ],
  },
  {
    name: i18n.t('msg.3178c8a9'),
    slug: 'mokhtar-motion-set-tracksuit',
    categorySlug: 'tracksuits',
    description:
      i18n.t('msg.ff3c2818'),
    price: 1299,
    comparePrice: 1499,
    sku: 'MK-MOTION',
    isFeatured: true,
    mainImage:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
    ],
    metadata: {
      brand: 'mokhtar',
      material: 'Soft athletic blend',
      collection: 'Activewear',
      highlights: [i18n.t('msg.a386f88c'), i18n.t('msg.8752d310'), i18n.t('msg.666cc349')],
    },
    colors: [
      { label: i18n.t('msg.6f357595'), code: 'BLK' },
      { label: i18n.t('msg.e2a89b9b'), code: 'CHR' },
      { label: i18n.t('msg.69654f66'), code: 'NVY' },
    ],
    sizes: [
      { label: 'M', code: 'M' },
      { label: 'L', code: 'L' },
      { label: 'XL', code: 'XL' },
    ],
  },
];

function getArgValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!direct) return null;
  return direct.slice(name.length + 3).trim() || null;
}

function buildVariantRows(item) {
  const rows = [];
  let sortOrder = 1;

  item.colors.forEach((color, colorIndex) => {
    item.sizes.forEach((size, sizeIndex) => {
      const primaryImage = item.images[colorIndex % item.images.length];
      const secondaryImage = item.images[(colorIndex + 1) % item.images.length];
      const priceDelta = sizeIndex * 25;
      const stock = 7 + colorIndex * 3 + sizeIndex * 2;

      rows.push({
        name: `${color.label} - ${size.label}`,
        type: 'variant',
        sku: `${item.sku}-${color.code}-${size.code}`,
        price: item.price + priceDelta,
        comparePrice: item.comparePrice + priceDelta,
        stock,
        sortOrder,
        metadata: JSON.stringify({
          color: color.label,
          size: size.label,
          colorCode: color.code,
          sizeCode: size.code,
        }),
        images: JSON.stringify([primaryImage, secondaryImage]),
      });

      sortOrder += 1;
    });
  });

  return rows;
}

async function resolveTargetCompany() {
  const requestedCompanyId = getArgValue('companyId');
  if (requestedCompanyId) {
    const explicit = await safeDb.findUnique('company', {
      where: { id: requestedCompanyId },
      select: { id: true, name: true, slug: true, email: true },
    });

    if (!explicit) {
      throw new Error(`Company not found for --companyId=${requestedCompanyId}`);
    }

    return explicit;
  }

  const candidates = await safeDb.findMany('company', {
    where: {
      OR: [
        { name: { contains: TARGET_KEYWORD, mode: 'insensitive' } },
        { slug: { contains: TARGET_KEYWORD, mode: 'insensitive' } },
        { email: { contains: TARGET_KEYWORD, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, email: true },
  });

  if (!candidates.length) {
    throw new Error(`No company found matching "${TARGET_KEYWORD}"`);
  }

  const ranked = [];
  for (const company of candidates) {
    const [productCount, settingsCount] = await Promise.all([
      safeDb.count('product', { where: { companyId: company.id } }),
      safeDb.count('storefrontSettings', { where: { companyId: company.id } }),
    ]);

    const exactName = String(company.name || '').toLowerCase() === TARGET_KEYWORD;
    const exactSlug = String(company.slug || '').toLowerCase() === TARGET_KEYWORD;

    ranked.push({
      ...company,
      productCount,
      settingsCount,
      score:
        (exactName ? 100 : 0) +
        (exactSlug ? 60 : 0) +
        settingsCount * 20 +
        Math.min(productCount, 25),
    });
  }

  ranked.sort((left, right) => right.score - left.score);

  return ranked[0];
}

async function upsertCategory(companyId, item, index) {
  const existing = await safeDb.findFirst('category', {
    where: {
      companyId,
      slug: item.slug,
    },
    select: { id: true, name: true },
  });

  const data = {
    companyId,
    name: item.name,
    slug: item.slug,
    description: item.description,
    image: item.image,
    isActive: true,
    sortOrder: index + 1,
    displayType: 'default',
    metaTitle: item.metaTitle,
    metaDescription: item.metaDescription,
  };

  if (existing) {
    const updated = await safeDb.update('category', {
      where: { id: existing.id },
      data,
      select: { id: true, name: true, slug: true },
    });

    return { action: 'updated', ...updated };
  }

  const created = await safeDb.create('category', {
    data,
    select: { id: true, name: true, slug: true },
  });

  return { action: 'created', ...created };
}

async function upsertProduct(companyId, categoryIdBySlug, item) {
  const variants = buildVariantRows(item);
  const stock = variants.reduce((sum, variant) => sum + variant.stock, 0);

  const payload = {
    companyId,
    categoryId: categoryIdBySlug[item.categorySlug] || null,
    name: item.name,
    slug: item.slug,
    description: item.description,
    price: item.price,
    comparePrice: item.comparePrice,
    stock,
    sku: item.sku,
    isActive: true,
    isFeatured: Boolean(item.isFeatured),
    trackInventory: true,
    mainImage: item.mainImage,
    images: JSON.stringify(item.images),
    tags: JSON.stringify(['mokhtar', 'fashion', item.categorySlug]),
    metadata: JSON.stringify({
      ...item.metadata,
      colors: item.colors.map((color) => color.label),
      sizes: item.sizes.map((size) => size.label),
      categorySlug: item.categorySlug,
    }),
  };

  const existing = await safeDb.findFirst('product', {
    where: {
      companyId,
      slug: item.slug,
    },
    select: { id: true, name: true, slug: true },
  });

  let productId = null;
  let action = 'created';

  if (existing) {
    const updated = await safeDb.update('product', {
      where: { id: existing.id },
      data: payload,
      select: { id: true, name: true, slug: true },
    });
    productId = updated.id;
    action = 'updated';
  } else {
    const created = await safeDb.create('product', {
      data: payload,
      select: { id: true, name: true, slug: true },
    });
    productId = created.id;
  }

  await safeDb.deleteMany('productVariant', {
    where: { productId },
  });

  await safeDb.createMany('productVariant', {
    data: variants.map((variant) => ({
      productId,
      ...variant,
      isActive: true,
      trackInventory: true,
    })),
  });

  return {
    action,
    productId,
    slug: item.slug,
    name: item.name,
    categorySlug: item.categorySlug,
    variantsCount: variants.length,
  };
}

async function main() {
  console.log('Seeding Mokhtar fashion catalog...');

  const company = await resolveTargetCompany();
  console.log(
    `Target company: ${company.name} | slug=${company.slug || 'N/A'} | id=${company.id}`,
  );

  const categoryIdBySlug = {};
  const categoryResults = [];
  for (let index = 0; index < CATEGORY_CATALOG.length; index += 1) {
    const result = await upsertCategory(company.id, CATEGORY_CATALOG[index], index);
    categoryIdBySlug[result.slug] = result.id;
    categoryResults.push(result);
    console.log(`- ${result.action.toUpperCase()} CATEGORY: ${result.name} (${result.slug})`);
  }

  const productResults = [];
  for (const item of PRODUCT_CATALOG) {
    const result = await upsertProduct(company.id, categoryIdBySlug, item);
    productResults.push(result);
    console.log(
      `- ${result.action.toUpperCase()} PRODUCT: ${result.name} (${result.slug}) variants=${result.variantsCount}`,
    );
  }

  const seededSlugs = PRODUCT_CATALOG.map((item) => item.slug);
  const [categoriesTotal, categoriesWithImages, seededProducts, seededVariants, companyProducts] =
    await Promise.all([
      safeDb.count('category', { where: { companyId: company.id } }),
      safeDb.count('category', { where: { companyId: company.id, image: { not: null } } }),
      safeDb.count('product', { where: { companyId: company.id, slug: { in: seededSlugs } } }),
      safeDb.count('productVariant', {
        where: { product: { companyId: company.id, slug: { in: seededSlugs } } },
      }),
      safeDb.count('product', { where: { companyId: company.id } }),
    ]);

  console.log('\nSeed completed successfully.');
  console.log(`Categories total in company: ${categoriesTotal}`);
  console.log(`Categories with images in company: ${categoriesWithImages}`);
  console.log(`Seeded fashion products present: ${seededProducts}`);
  console.log(`Seeded fashion variants present: ${seededVariants}`);
  console.log(`Total products in company now: ${companyProducts}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed Mokhtar fashion catalog:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Prisma lifecycle is managed by the shared safeDb client.
  });
