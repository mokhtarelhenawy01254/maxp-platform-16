const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { getSharedPrismaClient } = require('./sharedDatabase');
const { syncProductsToFacebook } = require('../controller/facebookCatalogController');

const FRAMED_DIR = path.join(__dirname, '..', 'uploads', 'products', 'framed');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function resolveOverlayPath(overlayImage) {
  if (overlayImage.startsWith('/')) {
    const p = path.join(__dirname, '..', overlayImage);
    if (!fs.existsSync(p)) throw new Error('Overlay image not found');
    return p;
  }
  if (overlayImage.startsWith('http://') || overlayImage.startsWith('https://')) {
    const tmpDir = path.join(__dirname, '..', 'uploads', 'products', 'framed', '.tmp');
    ensureDir(tmpDir);
    const tmpPath = path.join(tmpDir, `overlay-${Date.now()}.png`);
    const buf = await downloadUrl(overlayImage);
    fs.writeFileSync(tmpPath, buf);
    return tmpPath;
  }
  if (!fs.existsSync(overlayImage)) throw new Error('Overlay image not found');
  return overlayImage;
}

async function generateFramedImage(originalUrl, overlayPath) {
  const originalPath = originalUrl.startsWith('/')
    ? path.join(__dirname, '..', originalUrl)
    : originalUrl;

  if (!fs.existsSync(originalPath)) return null;

  ensureDir(FRAMED_DIR);
  const filename = `${Date.now()}-${path.basename(originalPath)}`;
  const outputPath = path.join(FRAMED_DIR, filename);

  const overlay = await sharp(overlayPath).ensureAlpha().resize({
    width: 1200,
    height: 1200,
    fit: sharp.fit.inside,
    withoutEnlargement: true,
  }).toBuffer();

  const product = await sharp(originalPath).resize(1200, 1200, {
    fit: sharp.fit.contain,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  }).ensureAlpha().toBuffer();

  await sharp(product)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  return `/uploads/products/framed/${filename}`;
}

class OverlayCampaignService {
  async create(data) {
    const prisma = getSharedPrismaClient();
    return prisma.overlayCampaign.create({ data });
  }

  async getById(id) {
    const prisma = getSharedPrismaClient();
    return prisma.overlayCampaign.findUnique({
      where: { id },
      include: { products: { include: { product: true } } },
    });
  }

  async list(companyId) {
    const prisma = getSharedPrismaClient();
    return prisma.overlayCampaign.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async update(id, data) {
    const prisma = getSharedPrismaClient();
    return prisma.overlayCampaign.update({ where: { id }, data });
  }

  async delete(id) {
    const prisma = getSharedPrismaClient();
    const campaign = await prisma.overlayCampaign.findUnique({ where: { id } });
    if (!campaign) throw new Error('Campaign not found');
    await prisma.overlayCampaignProduct.deleteMany({ where: { campaignId: id } });
    return prisma.overlayCampaign.delete({ where: { id } });
  }

  async addProducts(campaignId, productIds) {
    const prisma = getSharedPrismaClient();
    const entries = productIds.map(productId => ({ campaignId, productId }));
    await prisma.overlayCampaignProduct.createMany({ data: entries, skipDuplicates: true });
  }

  async removeProduct(campaignId, productId) {
    const prisma = getSharedPrismaClient();
    return prisma.overlayCampaignProduct.deleteMany({
      where: { campaignId, productId },
    });
  }

  async applyOverlay(companyId, campaignId) {
    const prisma = getSharedPrismaClient();
    const campaign = await prisma.overlayCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const overlayPath = await resolveOverlayPath(campaign.overlayImage);

    const products = await prisma.overlayCampaignProduct.findMany({
      where: { campaignId },
      include: { product: true },
    });

    const results = [];
    for (const cp of products) {
      try {
        const images = JSON.parse(cp.product.images || '[]');
        if (!images.length) continue;

        const framedUrl = await generateFramedImage(images[0], overlayPath);
        if (!framedUrl) continue;

        await prisma.overlayCampaignProduct.update({
          where: { id: cp.id },
          data: { framedImage: framedUrl },
        });
        results.push({ productId: cp.productId, framedUrl });
      } catch (err) {
        console.error(`[OVERLAY] Failed for product ${cp.productId}:`, err.message);
      }
    }

    // Auto-sync to Facebook catalogs after applying overlays
    const catalogs = await prisma.facebookProductCatalog.findMany({
      where: { companyId, facebookCatalogId: { not: null } },
    });
    const syncResults = [];
    for (const catalog of catalogs) {
      try {
        const result = await syncProductsToFacebook(
          catalog,
          companyId,
          products.map(p => p.productId),
          false,
        );
        syncResults.push({ catalogId: catalog.id, name: catalog.name, ...result });
      } catch (err) {
        console.error(`[OVERLAY] Facebook sync failed for catalog ${catalog.id}:`, err.message);
        syncResults.push({ catalogId: catalog.id, name: catalog.name, success: false, error: err.message });
      }
    }

    return { results, syncResults };
  }

  async activateExpired() {
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const campaigns = await prisma.overlayCampaign.findMany({
      where: {
        status: 'ACTIVE',
        endAt: { lte: now },
      },
    });
    for (const c of campaigns) {
      await prisma.overlayCampaign.update({
        where: { id: c.id },
        data: { status: 'EXPIRED' },
      });
    }
    return campaigns.map(c => c.id);
  }

  async activateScheduled() {
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const campaigns = await prisma.overlayCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        startAt: { lte: now },
      },
      include: { products: { include: { product: true } } },
    });

    const activated = [];
    for (const campaign of campaigns) {
      try {
        // Mark as ACTIVE
        await prisma.overlayCampaign.update({
          where: { id: campaign.id },
          data: { status: 'ACTIVE' },
        });

        // Re-apply overlay
        const overlayPath = await resolveOverlayPath(campaign.overlayImage);
        for (const cp of campaign.products) {
          try {
            const images = JSON.parse(cp.product.images || '[]');
            if (!images.length) continue;
            const framedUrl = await generateFramedImage(images[0], overlayPath);
            if (!framedUrl) continue;
            await prisma.overlayCampaignProduct.update({
              where: { id: cp.id },
              data: { framedImage: framedUrl },
            });
          } catch (err) {
            console.error(`[OVERLAY-ACTIVATE] Product ${cp.productId} failed:`, err.message);
          }
        }

        // Auto-sync to Facebook catalogs
        const catalogs = await prisma.facebookProductCatalog.findMany({
          where: { companyId: campaign.companyId, facebookCatalogId: { not: null } },
        });
        for (const catalog of catalogs) {
          try {
            await syncProductsToFacebook(
              catalog,
              campaign.companyId,
              campaign.products.map(p => p.productId),
              false,
            );
          } catch (err) {
            console.error(`[OVERLAY-ACTIVATE] Facebook sync failed for catalog ${catalog.id}:`, err.message);
          }
        }

        activated.push(campaign.id);
      } catch (err) {
        console.error(`[OVERLAY-ACTIVATE] Campaign ${campaign.id} activation failed:`, err.message);
      }
    }

    return activated;
  }
}

module.exports = new OverlayCampaignService();
