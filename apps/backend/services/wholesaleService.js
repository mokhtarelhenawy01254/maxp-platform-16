const { getSharedPrismaClient } = require('./sharedDatabase');

const wholesaleService = {
  // ── Price Lists ──
  async listPriceLists({ companyId, page = 1, limit = 20, isActive, type, search }) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (type) where.type = type;
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nameAr: { contains: search, mode: 'insensitive' } },
    ];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.wholesalePriceList.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { _count: { select: { items: true } } } }),
      prisma.wholesalePriceList.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getPriceList(id, companyId) {
    const prisma = getSharedPrismaClient();
    return prisma.wholesalePriceList.findFirst({
      where: { id, companyId },
      include: { items: { include: { product: { select: { id: true, name: true, sku: true, price: true, mainImage: true } }, variant: { select: { id: true, name: true, sku: true, price: true } } } }, customerLinks: { include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } } } },
    });
  },

  async createPriceList(data, userId) {
    const prisma = getSharedPrismaClient();
    return prisma.wholesalePriceList.create({ data: { ...data, companyId: data.companyId } });
  },

  async updatePriceList(id, companyId, data) {
    const prisma = getSharedPrismaClient();
    return prisma.wholesalePriceList.updateMany({ where: { id, companyId }, data });
  },

  async deletePriceList(id, companyId) {
    const prisma = getSharedPrismaClient();
    return prisma.wholesalePriceList.deleteMany({ where: { id, companyId } });
  },

  // ── Price List Items ──
  async addPriceListItem(priceListId, companyId, data) {
    const prisma = getSharedPrismaClient();
    const list = await prisma.wholesalePriceList.findFirst({ where: { id: priceListId, companyId } });
    if (!list) throw new Error('Price list not found');
    return prisma.wholesalePriceListItem.create({ data: { ...data, priceListId } });
  },

  async removePriceListItem(itemId, companyId) {
    const prisma = getSharedPrismaClient();
    const item = await prisma.wholesalePriceListItem.findFirst({ where: { id: itemId }, include: { priceList: { select: { companyId: true } } } });
    if (!item || item.priceList.companyId !== companyId) throw new Error('Item not found');
    return prisma.wholesalePriceListItem.delete({ where: { id: itemId } });
  },

  // ── Wholesale Customers ──
  async listWholesaleCustomers({ companyId, page = 1, limit = 20, isActive, search }) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.customer = { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.wholesaleCustomer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true, totalOrdersCount: true, totalDelivered: true } } } }),
      prisma.wholesaleCustomer.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getWholesaleCustomer(id, companyId) {
    const prisma = getSharedPrismaClient();
    return prisma.wholesaleCustomer.findFirst({
      where: { id, companyId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, totalOrdersCount: true, totalDelivered: true, status: true, createdAt: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        statements: { orderBy: { periodEnd: 'desc' }, take: 12 },
      },
    });
  },

  async getWholesaleCustomerByCustomerId(customerId, companyId) {
    const prisma = getSharedPrismaClient();
    let wc = await prisma.wholesaleCustomer.findFirst({ where: { customerId, companyId } });
    if (!wc) {
      wc = await prisma.wholesaleCustomer.create({ data: { customerId, companyId, creditLimit: 0, currentBalance: 0 } });
    }
    return wc;
  },

  async createWholesaleCustomer(data) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.wholesaleCustomer.findFirst({ where: { customerId: data.customerId, companyId: data.companyId } });
    if (existing) throw new Error('Customer is already a wholesale customer');
    return prisma.wholesaleCustomer.create({ data });
  },

  async updateWholesaleCustomer(id, companyId, data) {
    const prisma = getSharedPrismaClient();
    return prisma.wholesaleCustomer.updateMany({ where: { id, companyId }, data });
  },

  // ── Customer-PriceList Link ──
  async assignPriceListToCustomer(customerId, priceListId, companyId) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.wholesaleCustomerPriceList.findFirst({ where: { customerId, priceListId } });
    if (existing) return existing;
    return prisma.wholesaleCustomerPriceList.create({ data: { customerId, priceListId, companyId } });
  },

  async removePriceListFromCustomer(customerId, priceListId) {
    const prisma = getSharedPrismaClient();
    return prisma.wholesaleCustomerPriceList.deleteMany({ where: { customerId, priceListId } });
  },

  // ── Transactions / Balance ──
  async recordTransaction({ wholesaleCustomerId, companyId, type, amount, referenceType, referenceId, notes }) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({ where: { id: wholesaleCustomerId, companyId } });
    if (!wc) throw new Error('Wholesale customer not found');
    const balanceBefore = wc.currentBalance;
    const balanceAfter = type === 'PAYMENT' || type === 'CREDIT_NOTE'
      ? Number(balanceBefore) - Number(amount)
      : Number(balanceBefore) + Number(amount);
    const [tx] = await prisma.$transaction([
      prisma.wholesaleTransaction.create({
        data: { wholesaleCustomerId, companyId, type, amount, balanceBefore, balanceAfter, referenceType, referenceId, notes },
      }),
      prisma.wholesaleCustomer.update({ where: { id: wholesaleCustomerId }, data: { currentBalance: balanceAfter } }),
    ]);
    return tx;
  },

  // ── Statement ──
  async generateStatement(wholesaleCustomerId, companyId, periodStart, periodEnd) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({ where: { id: wholesaleCustomerId, companyId } });
    if (!wc) throw new Error('Wholesale customer not found');
    const startDate = periodStart ? new Date(periodStart) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = periodEnd ? new Date(periodEnd) : new Date();
    const transactions = await prisma.wholesaleTransaction.findMany({
      where: { wholesaleCustomerId, createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'asc' },
    });
    const totalInvoiced = transactions.filter(t => t.type === 'INVOICE').reduce((s, t) => s + Number(t.amount), 0);
    const totalPaid = transactions.filter(t => t.type === 'PAYMENT' || t.type === 'CREDIT_NOTE').reduce((s, t) => s + Number(t.amount), 0);
    const prev = await prisma.wholesaleTransaction.findFirst({
      where: { wholesaleCustomerId, createdAt: { lt: startDate } },
      orderBy: { createdAt: 'desc' },
    });
    const openingBalance = prev ? Number(prev.balanceAfter) : 0;
    const closingBalance = Number(wc.currentBalance);
    const statement = await prisma.wholesaleStatement.create({
      data: { wholesaleCustomerId, companyId, periodStart: startDate, periodEnd: endDate, openingBalance, closingBalance, totalInvoiced, totalPaid },
    });
    return { statement, transactions, openingBalance, closingBalance, totalInvoiced, totalPaid };
  },

  // ── Reports ──
  async debtAgingReport(companyId) {
    const prisma = getSharedPrismaClient();
    const customers = await prisma.wholesaleCustomer.findMany({
      where: { companyId, currentBalance: { gt: 0 } },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { currentBalance: 'desc' },
    });
    return customers.map(c => ({
      id: c.id,
      customerId: c.customerId,
      customerName: `${c.customer.firstName} ${c.customer.lastName}`,
      phone: c.customer.phone,
      creditLimit: Number(c.creditLimit),
      currentBalance: Number(c.currentBalance),
      availableCredit: Number(c.creditLimit) - Number(c.currentBalance),
    }));
  },
};

module.exports = { wholesaleService, WHOLESALE_PERMISSIONS: { VIEW: 'wholesale.view', CREATE: 'wholesale.create', EDIT: 'wholesale.edit', DELETE: 'wholesale.delete' } };
