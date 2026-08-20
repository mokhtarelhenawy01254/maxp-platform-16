const { getSharedPrismaClient } = require('./sharedDatabase');

class EasyWarehouseService {
  get prisma() {
    const client = getSharedPrismaClient();
    if (!client) throw new Error('Prisma client is not initialized.');
    return client;
  }

  async getSettings(companyId) {
    const settings = await this.prisma.storefrontSettings.findUnique({
      where: { companyId },
      select: { easyWarehouseMode: true }
    });
    return { easyWarehouseMode: settings?.easyWarehouseMode === true };
  }

  async updateSettings(companyId, enabled) {
    const value = Boolean(enabled);
    await this.prisma.storefrontSettings.upsert({
      where: { companyId },
      update: { easyWarehouseMode: value },
      create: { companyId, easyWarehouseMode: value }
    });
    return { easyWarehouseMode: value };
  }

  async ensureProductsForItems(companyId, items) {
    const prisma = this.prisma;
    const created = [];
    const matched = [];

    for (const item of Array.isArray(items) ? items : []) {
      const name = String(item?.productName || item?.name || '').trim();
      if (!name) continue;

      const price = Number(item?.price) || 0;
      const sku = String(item?.sku || '').trim() || null;

      let product = null;
      if (item?.productId) {
        product = await prisma.product.findFirst({
          where: { id: item.productId, companyId, deletedAt: null }
        });
      }
      if (!product) {
        product = await prisma.product.findFirst({
          where: { companyId, deletedAt: null, OR: [{ name: { equals: name, mode: 'insensitive' } }, ...(sku ? [{ sku }] : [])] }
        });
      }
      if (product) {
        matched.push({ productId: product.id, productName: name, sku });
        continue;
      }

      const newProduct = await prisma.product.create({
        data: {
          name,
          sku,
          price,
          companyId,
          source: 'manual'
        }
      });
      created.push({ productId: newProduct.id, productName: name, sku });
    }

    return { created, matched };
  }
}

module.exports = new EasyWarehouseService();
