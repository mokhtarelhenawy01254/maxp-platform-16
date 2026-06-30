const express = require('express');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { extractSubdomainMiddleware } = require('../middleware/subdomainMiddleware');

const router = express.Router();

router.use(extractSubdomainMiddleware);

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return baseUrl.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
}

function buildFeedXml(company, products, baseUrl) {
  const currency = company.currency || 'EGP';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
  xml += `  <channel>\n`;
  xml += `    <title><![CDATA[${company.name} - Product Feed]]></title>\n`;
  xml += `    <link>${baseUrl}</link>\n`;
  xml += `    <description><![CDATA[Product feed for ${company.name}]]></description>\n`;

  for (const product of products) {
    const id = escapeXml(product.sku || product.id);
    const link = `${baseUrl}/product/${product.slug || product.id}`;
    let images = [];
    if (product.mainImage) images.push(product.mainImage);
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) {
          for (const img of parsed) {
            if (img && !images.includes(img)) images.push(img);
          }
        }
      } catch {}
    }
    const firstImage = images.length ? toAbsoluteUrl(images[0], baseUrl) : '';
    const extraImages = images.slice(1, 11).map(u => toAbsoluteUrl(u, baseUrl));
    const availability = product.stock > 0 ? 'in_stock' : 'out_of_stock';
    const priceNum = parseFloat(product.price.toString());
    const price = priceNum.toFixed(2);

    xml += `    <item>\n`;
    xml += `      <g:id>${id}</g:id>\n`;
    xml += `      <g:title><![CDATA[${product.name}]]></g:title>\n`;
    xml += `      <g:description><![CDATA[${product.description || ''}]]></g:description>\n`;
    xml += `      <g:link>${link}</g:link>\n`;
    if (firstImage) {
      xml += `      <g:image_link>${escapeXml(firstImage)}</g:image_link>\n`;
    }
    if (extraImages.length) {
      xml += `      <g:additional_image_link>${escapeXml(extraImages.join(','))}</g:additional_image_link>\n`;
    }
    xml += `      <g:availability>${availability}</g:availability>\n`;
    xml += `      <g:price>${price} ${currency}</g:price>\n`;
    if (product.comparePrice) {
      xml += `      <g:sale_price>${parseFloat(product.comparePrice.toString()).toFixed(2)} ${currency}</g:sale_price>\n`;
    }
    xml += `      <g:brand><![CDATA[${company.name}]]></g:brand>\n`;
    if (product.category?.name) {
      xml += `      <g:product_type><![CDATA[${product.category.name}]]></g:product_type>\n`;
    }
    xml += `      <g:condition>new</g:condition>\n`;
    xml += `    </item>\n`;
  }

  xml += `  </channel>\n`;
  xml += `</rss>`;
  return xml;
}

// Simple feed by company (from subdomain) — no catalog needed
router.get('/', async (req, res) => {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const companyId = req.companyId || req.query.companyId;
    if (!companyId) {
      return res.status(400).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Company not specified — use subdomain or ?companyId=</error>');
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true, currency: true },
    });
    if (!company) {
      return res.status(404).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Company not found</error>');
    }

    const products = await prisma.product.findMany({
      where: { companyId: company.id, isActive: true, isHidden: false, deletedAt: null },
      select: { id: true, name: true, description: true, sku: true, price: true, comparePrice: true, images: true, mainImage: true, stock: true, slug: true, category: { select: { name: true } } },
      take: 10000,
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const xml = buildFeedXml(company, products, baseUrl);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error('Product feed error:', error);
    res.status(500).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Internal server error</error>');
  }
});

// Feed by catalog ID (for catalog owners)
router.get('/:catalogId.xml', async (req, res) => {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const catalog = await prisma.facebookProductCatalog.findUnique({
      where: { id: req.params.catalogId },
      include: { company: { select: { id: true, name: true, slug: true, currency: true } } },
    });
    if (!catalog) {
      return res.status(404).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Catalog not found</error>');
    }

    const products = await prisma.product.findMany({
      where: { companyId: catalog.companyId, isActive: true, isHidden: false, deletedAt: null },
      select: { id: true, name: true, description: true, sku: true, price: true, comparePrice: true, images: true, mainImage: true, stock: true, slug: true, category: { select: { name: true } } },
      take: 10000,
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const xml = buildFeedXml(catalog.company, products, baseUrl);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error('Product feed error:', error);
    res.status(500).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Internal server error</error>');
  }
});

module.exports = router;
