const express = require('express');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { authenticateToken, requireRole } = require('../utils/verifyToken');
const { marketplaceCatalogService } = require('./../services/catalog/marketplaceCatalogService');

const adminRouter = express.Router();
const publicRouter = express.Router();

const SEED_PAGES = [
  { slug: 'messaging', title: 'Messaging — منصة محادثات موحدة', componentName: 'MessagingLanding', sortOrder: 1, bundleSlug: 'messaging-bundle', activationType: 'both' },
  { slug: 'ai-inbox', title: 'AI Inbox — البريد الذكي', componentName: 'AiInboxLanding', sortOrder: 2, bundleSlug: 'ai-inbox-bundle', activationType: 'both' },
  { slug: 'mg', title: 'MG Agency — تسويق عقاري', componentName: 'MgAgencyLeadLanding', sortOrder: 3, bundleSlug: null, activationType: 'both' },
  { slug: 'mg-agency', title: 'MG Agency Lead — تسويق عقاري', componentName: 'MgAgencyLeadLanding', sortOrder: 4, bundleSlug: null, activationType: 'both' },
  { slug: 'medical', title: 'النظام الطبي — الباقة الطبية الشاملة', componentName: 'MedicalLanding', sortOrder: 5, bundleSlug: 'medical-bundle', activationType: 'both' },
];

// "updatedAt"/"createdAt" are passed explicitly: when lp_pages is (re)created by
// `prisma db push`, `@updatedAt` has NO database default, so omitting it raises
// 23502 NOT NULL violations. Same for activationType (nullable in Prisma, but
// we never want null there).
function buildSeedUpsertSql() {
  return `INSERT INTO "lp_pages" ("id","slug","title","componentName","sortOrder","isActive","bundleSlug","activationType","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
           ON CONFLICT ("slug") DO UPDATE SET
             "title" = EXCLUDED."title",
             "componentName" = EXCLUDED."componentName",
             "sortOrder" = EXCLUDED."sortOrder",
             "bundleSlug" = EXCLUDED."bundleSlug",
             "activationType" = EXCLUDED."activationType",
             "updatedAt" = CURRENT_TIMESTAMP`;
}

function buildSeedUpsertParams(p) {
  return [
    `lp-seed-${p.slug}`,
    p.slug,
    p.title,
    p.componentName,
    Number.isFinite(p.sortOrder) ? p.sortOrder : 0,
    true,
    p.bundleSlug ?? null,
    p.activationType || 'both',
  ];
}

let ensureTablePromise = null;

async function ensureLpPagesTable(prisma) {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "lp_pages" (
          "id" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "componentName" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "bundleSlug" TEXT,
          "activationType" TEXT NOT NULL DEFAULT 'both',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "lp_pages_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "lp_pages_slug_key"
        ON "lp_pages" ("slug")
      `);

      for (const p of SEED_PAGES) {
        await prisma.$executeRawUnsafe(buildSeedUpsertSql(), ...buildSeedUpsertParams(p));
      }
    })().catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  return ensureTablePromise;
}

async function getAllPages(prisma) {
  try {
    await ensureLpPagesTable(prisma);
    return await prisma.$queryRawUnsafe(
      `SELECT id, slug, title, description, "isActive", "sortOrder", "componentName", "bundleSlug", "activationType"
       FROM "lp_pages" ORDER BY "sortOrder" ASC`,
    );
  } catch (err) {
    console.error('[lpAdmin] getAllPages DB error, falling back to seed data:', err.message);
    return SEED_PAGES.map(p => ({
      id: `seed-${p.slug}`,
      slug: p.slug,
      title: p.title,
      description: null,
      isActive: true,
      sortOrder: p.sortOrder,
      componentName: p.componentName,
      bundleSlug: p.bundleSlug,
      activationType: p.activationType,
    }));
  }
}

// ── Public (no auth) ──
publicRouter.get('/', async (req, res) => {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const pages = await getAllPages(prisma);
    res.json(pages);
  } catch (err) {
    console.error('[lpAdmin] public GET / error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Public bundle endpoint (returns LP page + bundle data) ──
publicRouter.get('/:slug', async (req, res) => {
  try {
    const prisma = await getSharedPrismaClientAsync();
    let page;

    try {
      await ensureLpPagesTable(prisma);
      const pages = await prisma.$queryRawUnsafe(
        `SELECT id, slug, title, description, "isActive", "sortOrder", "componentName", "bundleSlug", "activationType"
         FROM "lp_pages" WHERE "slug" = $1 AND "isActive" = true`,
        req.params.slug,
      );
      if (pages && pages.length > 0) {
        page = pages[0];
      }
    } catch (dbErr) {
      console.error('[lpAdmin] public GET /:slug DB error, falling back to seed:', dbErr.message);
    }

    if (!page) {
      const seedPage = SEED_PAGES.find(p => p.slug === req.params.slug);
      if (!seedPage) {
        return res.status(404).json({ message: 'Page not found' });
      }
      page = { ...seedPage, isActive: true, description: null };
    }

    let bundle = null;
    if (page.bundleSlug) {
      try {
        bundle = await marketplaceCatalogService.getBundleBySlug(page.bundleSlug, { onlyActive: true });
      } catch { /* bundle fetch is best-effort */ }
    }
    res.json({ ...page, bundle });
  } catch (err) {
    console.error('[lpAdmin] public GET /:slug error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Admin (auth + SUPER_ADMIN role) ──
adminRouter.get('/', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const pages = await getAllPages(prisma);
    res.json(pages);
  } catch (err) {
    console.error('[lpAdmin] admin GET / error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

adminRouter.patch('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const prisma = await getSharedPrismaClientAsync();
    await ensureLpPagesTable(prisma);
    const { title, description, isActive, sortOrder, bundleSlug, activationType } = req.body;
    const sets = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { sets.push(`"title" = $${idx++}`); values.push(title); }
    if (description !== undefined) { sets.push(`"description" = $${idx++}`); values.push(description); }
    if (isActive !== undefined) { sets.push(`"isActive" = $${idx++}`); values.push(isActive); }
    if (sortOrder !== undefined) { sets.push(`"sortOrder" = $${idx++}`); values.push(sortOrder); }
    if (bundleSlug !== undefined) { sets.push(`"bundleSlug" = $${idx++}`); values.push(bundleSlug); }
    if (activationType !== undefined) { sets.push(`"activationType" = $${idx++}`); values.push(activationType); }

    if (sets.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    sets.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    await prisma.$executeRawUnsafe(
      `UPDATE "lp_pages" SET ${sets.join(', ')} WHERE "id" = $${idx}`,
      ...values,
    );

    const updated = await prisma.$queryRawUnsafe(
      `SELECT id, slug, title, description, "isActive", "sortOrder", "componentName", "bundleSlug", "activationType"
       FROM "lp_pages" WHERE "id" = $1`,
      req.params.id,
    );
    res.json(updated[0] || null);
  } catch (err) {
    console.error('[lpAdmin] PATCH /:id error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = {
  publicRouter,
  adminRouter,
  __test__: { SEED_PAGES, buildSeedUpsertSql, buildSeedUpsertParams, ensureLpPagesTable },
};
