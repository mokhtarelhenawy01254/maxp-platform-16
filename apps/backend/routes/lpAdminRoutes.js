const express = require('express');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { authenticateToken, requireRole } = require('../utils/verifyToken');

const adminRouter = express.Router();
const publicRouter = express.Router();

const SEED_PAGES = [
  { slug: 'messaging', title: 'Messaging — منصة محادثات موحدة', componentName: 'MessagingLanding', sortOrder: 1 },
  { slug: 'ai-inbox', title: 'AI Inbox — البريد الذكي', componentName: 'AiInboxLanding', sortOrder: 2 },
  { slug: 'mg', title: 'MG Agency — تسويق عقاري', componentName: 'MgAgencyLeadLanding', sortOrder: 3 },
  { slug: 'mg-agency', title: 'MG Agency Lead — تسويق عقاري', componentName: 'MgAgencyLeadLanding', sortOrder: 4 },
];

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
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "lp_pages_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "lp_pages_slug_key"
        ON "lp_pages" ("slug")
      `);

      const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "lp_pages"`);
      if (rows[0].cnt === 0) {
        for (const p of SEED_PAGES) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "lp_pages" ("id","slug","title","componentName","sortOrder","isActive")
             VALUES ($1,$2,$3,$4,$5,true)`,
            `lp-seed-${p.slug}`, p.slug, p.title, p.componentName, p.sortOrder,
          );
        }
      }
    })().catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  return ensureTablePromise;
}

async function getAllPages(prisma) {
  await ensureLpPagesTable(prisma);
  return prisma.$queryRawUnsafe(
    `SELECT id, slug, title, description, "isActive", "sortOrder", "componentName"
     FROM "lp_pages" ORDER BY "sortOrder" ASC`,
  );
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
    const { title, description, isActive, sortOrder } = req.body;
    const sets = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { sets.push(`"title" = $${idx++}`); values.push(title); }
    if (description !== undefined) { sets.push(`"description" = $${idx++}`); values.push(description); }
    if (isActive !== undefined) { sets.push(`"isActive" = $${idx++}`); values.push(isActive); }
    if (sortOrder !== undefined) { sets.push(`"sortOrder" = $${idx++}`); values.push(sortOrder); }

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
      `SELECT id, slug, title, description, "isActive", "sortOrder", "componentName"
       FROM "lp_pages" WHERE "id" = $1`,
      req.params.id,
    );
    res.json(updated[0] || null);
  } catch (err) {
    console.error('[lpAdmin] PATCH /:id error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = { publicRouter, adminRouter };
