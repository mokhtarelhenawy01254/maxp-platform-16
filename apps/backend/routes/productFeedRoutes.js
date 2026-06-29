const express = require('express');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

const router = express.Router();

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

router.get('/feed/:catalogId.xml', async (req, res) => {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const catalog = await prisma.facebookProductCatalog.findUnique({
      where: { id: req.params.catalogId },
      include: {
        company: { select: { id: true, name: true, slug: true, currency: true } },
      },
    });

    if (!catalog) {
      return res.status(404).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Catalog not found</error>');
    }

    const products = await prisma.product.findMany({
      where: {
        companyId: catalog.companyId,
        isActive: true,
        isHidden: false,
        deletedAt: null,
      },
      select: {
        id: true, name: true, description: true, sku: true,
        price: true, comparePrice: true, images: true, mainImage: true,
        stock: true, slug: true,
        category: { select: { name: true } },
      },
      // ponytail: 10k product limit, add cursor pagination if exceeded
      take: 10000,
    });

    const company = catalog.company;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
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
      const firstImage = product.mainImage || (product.images ? JSON.parse(product.images)[0] : '');
      const availability = product.stock > 0 ? 'in_stock' : 'out_of_stock';
      const priceNum = parseFloat(product.price.toString());
      const price = priceNum.toFixed(2);

      xml += `    <item>\n`;
      xml += `      <g:id>${id}</g:id>\n`;
      xml += `      <g:title><![CDATA[${product.name}]]></g:title>\n`;
      xml += `      <g:description><![CDATA[${product.description || ''}]]></g:description>\n`;
      xml += `      <g:link>${link}</g:link>\n`;
      xml += `      <g:image_link>${firstImage}</g:image_link>\n`;
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

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error('Product feed error:', error);
    res.status(500).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Internal server error</error>');
  }
});

module.exports = router;
