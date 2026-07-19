const buildCompanyInventoryWhere = ({ productId, companyId }) => ({
  productId,
  warehouse: {
    companyId,
    isActive: true,
  },
});

const syncProductStockFromInventory = async (
  prisma,
  { productId, companyId, inventoryWhere } = {},
) => {
  if (!prisma || !productId || !companyId) {
    return null;
  }

  const where =
    inventoryWhere ||
    buildCompanyInventoryWhere({
      productId,
      companyId,
    });

  const stock = await prisma.inventory.aggregate({
    where,
    _sum: {
      available: true,
    },
  });

  const nextStock = Math.max(0, Number(stock?._sum?.available || 0));

  return prisma.product.update({
    where: { id: productId },
    data: {
      stock: nextStock,
      updatedAt: new Date(),
    },
  });
};

module.exports = {
  buildCompanyInventoryWhere,
  syncProductStockFromInventory,
};
