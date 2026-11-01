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
    if (!id || id === 'new') return null;
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: { id, companyId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            totalOrdersCount: true,
            totalDelivered: true,
            status: true,
            createdAt: true,
            wholesaleCustomerPriceLists: {
              select: { priceListId: true },
              take: 1,
            },
          },
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        statements: { orderBy: { periodEnd: 'desc' }, take: 12 },
      },
    });
    if (!wc) return null;
    const priceListId = wc.customer?.wholesaleCustomerPriceLists?.[0]?.priceListId || null;
    return { ...wc, priceListId };
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
    let targetCustomerId = data.customerId;

    // If customerId is not provided or empty, resolve or auto-create the underlying customer
    if (!targetCustomerId || (typeof targetCustomerId === 'string' && targetCustomerId.trim() === '')) {
      const phone = (data.customerPhone || '').trim();
      const rawName = (data.customerName || '').trim();
      const email = (data.customerEmail || '').trim() || null;

      let existingCustomer = null;
      if (phone) {
        existingCustomer = await prisma.customer.findFirst({
          where: { companyId: data.companyId, phone },
        });
      }

      if (existingCustomer) {
        targetCustomerId = existingCustomer.id;
      } else {
        const parts = rawName.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || 'تاجر';
        const lastName = parts.slice(1).join(' ') || 'جملة';

        const newCustomer = await prisma.customer.create({
          data: {
            companyId: data.companyId,
            firstName,
            lastName,
            phone: phone || null,
            email,
            status: 'ACTIVE',
            tags: 'موزع جملة',
          },
        });
        targetCustomerId = newCustomer.id;
      }
    }

    const existing = await prisma.wholesaleCustomer.findFirst({
      where: { customerId: targetCustomerId, companyId: data.companyId },
    });
    if (existing) {
      await prisma.wholesaleCustomer.update({
        where: { id: existing.id },
        data: {
          creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : existing.creditLimit,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
          notes: data.notes !== undefined ? data.notes : existing.notes,
        },
      });
      if (data.priceListId) {
        await wholesaleService.assignPriceListToCustomer(targetCustomerId, data.priceListId, data.companyId);
      }
      return existing;
    }

    const { companyId, creditLimit, currentBalance, isActive, notes, priceListId } = data;
    const wc = await prisma.wholesaleCustomer.create({
      data: {
        customerId: targetCustomerId,
        companyId,
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : 0,
        currentBalance: currentBalance !== undefined ? Number(currentBalance) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        notes: notes || null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    });

    if (priceListId) {
      await wholesaleService.assignPriceListToCustomer(targetCustomerId, priceListId, companyId);
    }
    return wc;
  },

  async updateWholesaleCustomer(id, companyId, data) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: { id, companyId },
      include: { customer: true },
    });
    if (!wc) throw new Error('Wholesale customer not found');

    const updateData = {};
    if (data.creditLimit !== undefined) updateData.creditLimit = Number(data.creditLimit);
    if (data.currentBalance !== undefined) updateData.currentBalance = Number(data.currentBalance);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.notes !== undefined) updateData.notes = data.notes;

    const result = await prisma.wholesaleCustomer.updateMany({ where: { id, companyId }, data: updateData });

    // Also update underlying customer name/phone/email if provided
    if (data.customerName || data.customerPhone || data.customerEmail) {
      const custUpdate = {};
      if (data.customerName) {
        const parts = data.customerName.trim().split(/\s+/).filter(Boolean);
        custUpdate.firstName = parts[0] || 'تاجر';
        custUpdate.lastName = parts.slice(1).join(' ') || 'جملة';
      }
      if (data.customerPhone !== undefined) custUpdate.phone = data.customerPhone.trim() || null;
      if (data.customerEmail !== undefined) custUpdate.email = data.customerEmail.trim() || null;

      await prisma.customer.update({
        where: { id: wc.customerId },
        data: custUpdate,
      }).catch(() => {});
    }

    if (data.priceListId !== undefined) {
      if (data.priceListId) {
        await wholesaleService.assignPriceListToCustomer(wc.customerId, data.priceListId, companyId);
      } else {
        await prisma.wholesaleCustomerPriceList.deleteMany({ where: { customerId: wc.customerId } });
      }
    }
    return result;
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
    const balanceBefore = Number(wc.currentBalance || 0);
    const balanceAfter = type === 'PAYMENT' || type === 'CREDIT_NOTE'
      ? balanceBefore - Number(amount)
      : balanceBefore + Number(amount);
    const tx = await prisma.wholesaleTransaction.create({
      data: { wholesaleCustomerId, companyId, type, amount: Number(amount), balanceBefore, balanceAfter, referenceType, referenceId, notes },
    });
    await prisma.wholesaleCustomer.update({ where: { id: wholesaleCustomerId }, data: { currentBalance: balanceAfter } });
    return tx;
  },

  // ── Statement ──
  async generateStatement(wholesaleCustomerId, companyId, periodStart, periodEnd) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: { id: wholesaleCustomerId, companyId },
      include: { customer: true },
    });
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

    const lines = transactions.map((t) => ({
      date: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      type: t.type,
      reference: t.referenceId || t.id,
      description: t.notes || (t.type === 'INVOICE' ? 'فاتورة طلب' : t.type === 'PAYMENT' ? 'سداد دفعة' : t.type === 'CREDIT_NOTE' ? 'إشعار دائن (مرتجع/إلغاء)' : 'حركة رصيد'),
      debit: t.type === 'INVOICE' ? Number(t.amount) : 0,
      credit: t.type === 'PAYMENT' || t.type === 'CREDIT_NOTE' ? Number(t.amount) : 0,
      balance: Number(t.balanceAfter),
    }));

    const customerName = wc.customer
      ? `${wc.customer.firstName || ''} ${wc.customer.lastName || ''}`.trim()
      : 'تاجر جملة';

    return {
      statement,
      transactions,
      lines,
      customerName,
      customerPhone: wc.customer?.phone || null,
      fromDate: startDate.toISOString(),
      toDate: endDate.toISOString(),
      openingBalance,
      closingBalance,
      totalInvoiced,
      totalPaid,
    };
  },

  // ── Dashboard ──
  async dashboard(companyId) {
    const prisma = getSharedPrismaClient();
    const [customers, priceLists, transactions] = await Promise.all([
      prisma.wholesaleCustomer.findMany({ where: { companyId }, select: { id: true, currentBalance: true, creditLimit: true } }),
      prisma.wholesalePriceList.count({ where: { companyId, isActive: true } }),
      prisma.wholesaleTransaction.findMany({
        where: { companyId, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        select: { amount: true, type: true },
      }),
    ]);
    const totalOutstanding = customers.reduce((s, c) => s + Number(c.currentBalance), 0);
    const overdueAmount = customers.filter(c => Number(c.currentBalance) > Number(c.creditLimit)).reduce((s, c) => s + Number(c.currentBalance), 0);
    const monthlySales = transactions.filter(t => t.type === 'INVOICE').reduce((s, t) => s + Number(t.amount), 0);
    const monthlyOrderCount = transactions.filter(t => t.type === 'INVOICE').length;
    return {
      totalCustomers: customers.length,
      activePriceLists: priceLists,
      totalOutstanding,
      overdueAmount,
      monthlySales,
      monthlyOrderCount,
    };
  },

  // ── Reports ──
  async debtAgingReport(companyId) {
    const prisma = getSharedPrismaClient();
    const customers = await prisma.wholesaleCustomer.findMany({
      where: { companyId, currentBalance: { gt: 0 } },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } }, transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { currentBalance: 'desc' },
    });
    const now = new Date();
    const agingBuckets = [
      { label: '0-7 يوم', minDays: 0, maxDays: 7, amount: 0, count: 0 },
      { label: '8-30 يوم', minDays: 8, maxDays: 30, amount: 0, count: 0 },
      { label: '31-60 يوم', minDays: 31, maxDays: 60, amount: 0, count: 0 },
      { label: '61-90 يوم', minDays: 61, maxDays: 90, amount: 0, count: 0 },
      { label: 'أكثر من 90 يوم', minDays: 91, maxDays: Infinity, amount: 0, count: 0 },
    ];
    const mapped = customers.map(c => {
      const lastTx = c.transactions[0];
      const lastPaymentDate = lastTx && (lastTx.type === 'PAYMENT' || lastTx.type === 'CREDIT_NOTE') ? lastTx.createdAt : null;
      const daysOverdue = lastPaymentDate ? Math.floor((now.getTime() - new Date(lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const bucket = agingBuckets.find(b => daysOverdue >= b.minDays && daysOverdue <= b.maxDays);
      if (bucket) { bucket.amount += Number(c.currentBalance); bucket.count += 1; }
      return {
        id: c.id,
        customerId: c.customerId,
        customerName: `${c.customer.firstName} ${c.customer.lastName}`,
        customerPhone: c.customer.phone,
        creditLimit: Number(c.creditLimit),
        currentBalance: Number(c.currentBalance),
        daysOverdue,
        lastPaymentDate: lastPaymentDate ? lastPaymentDate.toISOString() : null,
      };
    });
    const totalOutstanding = mapped.reduce((s, c) => s + c.currentBalance, 0);
    const totalOverdue = mapped.filter(c => c.currentBalance > c.creditLimit).reduce((s, c) => s + c.currentBalance, 0);
    return { totalOutstanding, totalOverdue, agingBuckets, customers: mapped };
  },

  // ── Pricing Resolution ──
  async resolveWholesalePrice(customerIdOrObj, productId, companyId, variantId = null, options = {}) {
    const { resolveWholesalePrice: resolvePrice } = require('./wholesalePricing');
    return resolvePrice(customerIdOrObj, productId, companyId, variantId, options);
  },

  // ── Credit Limit Validation ──
  async validateCreditLimit(customerId, companyId, orderTotal) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: {
        companyId,
        OR: [{ id: customerId }, { customerId }],
      },
    });
    if (!wc) {
      return {
        isWholesale: false,
        allowed: true,
        creditLimit: 0,
        currentBalance: 0,
        available: Infinity,
        orderTotal: Number(orderTotal || 0),
      };
    }

    const creditLimit = Number(wc.creditLimit || 0);
    const currentBalance = Number(wc.currentBalance || 0);
    const total = Number(orderTotal || 0);
    const newBalance = currentBalance + total;
    const available = Math.max(0, creditLimit - currentBalance);
    const allowed = creditLimit <= 0 || newBalance <= creditLimit;

    return {
      isWholesale: true,
      wholesaleCustomerId: wc.id,
      allowed,
      creditLimit,
      currentBalance,
      orderTotal: total,
      newBalance,
      available,
    };
  },

  // ── Auto-Invoice on Confirmation (Atomic & Idempotent) ──
  async recordOrderInvoice(order, tx = null) {
    const prisma = tx || getSharedPrismaClient();
    const orderId = String(order.id || order.orderId || '');
    const companyId = order.companyId;
    if (!orderId || !companyId) return null;

    let wc = null;
    if (order.wholesaleCustomerId) {
      wc = await prisma.wholesaleCustomer.findFirst({
        where: { id: order.wholesaleCustomerId, companyId },
      });
    } else if (order.customerId) {
      wc = await prisma.wholesaleCustomer.findFirst({
        where: { customerId: order.customerId, companyId },
      });
    }

    if (!wc) return null;

    // Strict idempotency: check if an invoice transaction already exists for this order
    const existing = await prisma.wholesaleTransaction.findFirst({
      where: {
        wholesaleCustomerId: wc.id,
        referenceType: 'ORDER',
        referenceId: orderId,
        type: 'INVOICE',
      },
    });
    if (existing) {
      return existing;
    }

    const amount = Number(order.total !== undefined ? order.total : (order.finalTotal || 0));

    const executeRecord = async (client) => {
      const freshWc = await client.wholesaleCustomer.findUnique({
        where: { id: wc.id },
      });
      const balanceBefore = Number(freshWc?.currentBalance || 0);
      const balanceAfter = balanceBefore + amount;

      const createdTx = await client.wholesaleTransaction.create({
        data: {
          wholesaleCustomerId: wc.id,
          companyId,
          type: 'INVOICE',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'ORDER',
          referenceId: orderId,
          notes: `فاتورة الطلب #${order.orderNumber || orderId}`,
        },
      });

      await client.wholesaleCustomer.update({
        where: { id: wc.id },
        data: { currentBalance: balanceAfter },
      });

      return createdTx;
    };

    if (tx) {
      return executeRecord(tx);
    }
    return getSharedPrismaClient().$transaction(async (t) => executeRecord(t));
  },

  // ── Auto-Credit Note on Cancellation / Return (Atomic & Idempotent) ──
  async recordOrderCreditNote(order, tx = null) {
    const prisma = tx || getSharedPrismaClient();
    const orderId = String(order.id || order.orderId || '');
    const companyId = order.companyId;
    if (!orderId || !companyId) return null;

    let wc = null;
    if (order.wholesaleCustomerId) {
      wc = await prisma.wholesaleCustomer.findFirst({
        where: { id: order.wholesaleCustomerId, companyId },
      });
    } else if (order.customerId) {
      wc = await prisma.wholesaleCustomer.findFirst({
        where: { customerId: order.customerId, companyId },
      });
    }

    if (!wc) return null;

    // Check if an INVOICE transaction exists for this order
    const invoiceTx = await prisma.wholesaleTransaction.findFirst({
      where: {
        wholesaleCustomerId: wc.id,
        referenceType: 'ORDER',
        referenceId: orderId,
        type: 'INVOICE',
      },
    });

    if (!invoiceTx) {
      return null;
    }

    // Strict idempotency: check if CREDIT_NOTE already exists
    const existing = await prisma.wholesaleTransaction.findFirst({
      where: {
        wholesaleCustomerId: wc.id,
        referenceType: 'ORDER',
        referenceId: orderId,
        type: 'CREDIT_NOTE',
      },
    });
    if (existing) {
      return existing;
    }

    const amount = Number(invoiceTx.amount);

    const executeReverse = async (client) => {
      const freshWc = await client.wholesaleCustomer.findUnique({
        where: { id: wc.id },
      });
      const balanceBefore = Number(freshWc?.currentBalance || 0);
      const balanceAfter = Math.max(0, balanceBefore - amount);

      const createdTx = await client.wholesaleTransaction.create({
        data: {
          wholesaleCustomerId: wc.id,
          companyId,
          type: 'CREDIT_NOTE',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'ORDER',
          referenceId: orderId,
          notes: `إشعار دائن لإلغاء/استرجاع الطلب #${order.orderNumber || orderId}`,
        },
      });

      await client.wholesaleCustomer.update({
        where: { id: wc.id },
        data: { currentBalance: balanceAfter },
      });

      return createdTx;
    };

    if (tx) {
      return executeReverse(tx);
    }
    return getSharedPrismaClient().$transaction(async (t) => executeReverse(t));
  },

  // ── Customer Wholesale Prices List ──
  async getCustomerPrices(wholesaleCustomerId, companyId) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: { id: wholesaleCustomerId, companyId },
    });
    if (!wc) throw new Error('Wholesale customer not found');

    const links = await prisma.wholesaleCustomerPriceList.findMany({
      where: { customerId: wc.customerId, companyId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        priceList: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, price: true, mainImage: true },
                },
                variant: {
                  select: { id: true, name: true, sku: true, price: true },
                },
              },
            },
          },
        },
      },
    });

    const prices = [];
    const seenProductVariants = new Set();

    for (const link of links) {
      const pl = link.priceList;
      if (!pl || !pl.isActive) continue;
      for (const item of pl.items || []) {
        const key = `${item.productId}_${item.variantId || 'base'}`;
        if (seenProductVariants.has(key)) continue;
        seenProductVariants.add(key);

        const regularPrice = item.variant?.price !== null && item.variant?.price !== undefined
          ? Number(item.variant.price)
          : Number(item.product?.price || 0);

        prices.push({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'منتج',
          productSku: item.variant?.sku || item.product?.sku || '—',
          productImage: item.product?.mainImage || null,
          variantId: item.variantId,
          variantName: item.variant?.name || null,
          wholesalePrice: Number(item.price),
          regularPrice,
          minQuantity: item.minQuantity,
          priceListId: pl.id,
          priceListName: pl.nameAr || pl.name,
        });
      }
    }

    return prices;
  },

  // ── Customer Wholesale Orders ──
  async getWholesaleCustomerOrders(wholesaleCustomerId, companyId, query = {}) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: { id: wholesaleCustomerId, companyId },
    });
    if (!wc) throw new Error('Wholesale customer not found');

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const where = {
      companyId,
      OR: [
        { wholesaleCustomerId: wc.id },
        { customerId: wc.customerId, orderSource: 'WHOLESALE' },
      ],
    };

    if (query.status && query.status !== 'all') {
      where.status = query.status.toUpperCase();
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              price: true,
              total: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  // ── Daily Workspace Queue (4 Blocks + Counts) ──
  async getManageQueue({ companyId, distributorId, period = 'today', limit = 50 }) {
    const prisma = getSharedPrismaClient();
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    // Date range calculation
    let periodStartDate = null;
    const now = new Date();
    if (period === 'today') {
      periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (period === 'week') {
      periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    // 1. Pending Wholesale Orders (Block 1) - uses compound index [companyId, status, createdAt]
    const pendingWhere = {
      companyId,
      status: 'PENDING',
      OR: [
        { wholesaleCustomerId: distributorId || { not: null } },
        { orderSource: 'WHOLESALE' },
      ],
    };
    if (distributorId) {
      pendingWhere.OR = [
        { wholesaleCustomerId: distributorId },
        { customerId: distributorId, orderSource: 'WHOLESALE' },
      ];
    }
    if (periodStartDate) {
      pendingWhere.createdAt = { gte: periodStartDate };
    }

    // 2. Active Wholesale Customers for Over-Limit detection (Block 2)
    const customerWhere = {
      companyId,
      currentBalance: { gt: 0 },
    };
    if (distributorId) {
      customerWhere.id = distributorId;
    }

    // 3. Suspended Wholesale Customers (Block 3) - uses index [companyId, isActive]
    const suspendedWhere = {
      companyId,
      isActive: false,
    };
    if (distributorId) {
      suspendedWhere.id = distributorId;
    }

    // 4. Processing / Active Fulfillment Orders (Block 4) - uses compound index [companyId, status, createdAt]
    const fulfillmentWhere = {
      companyId,
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] },
      OR: [
        { wholesaleCustomerId: distributorId || { not: null } },
        { orderSource: 'WHOLESALE' },
      ],
    };
    if (distributorId) {
      fulfillmentWhere.OR = [
        { wholesaleCustomerId: distributorId },
        { customerId: distributorId, orderSource: 'WHOLESALE' },
      ];
    }
    if (periodStartDate) {
      fulfillmentWhere.createdAt = { gte: periodStartDate };
    }

    // Execute queries in parallel to avoid N+1 bottlenecks
    const [
      pendingOrders,
      pendingCount,
      pendingSum,
      allBalanceCustomers,
      suspendedWc,
      fulfillmentOrders,
      fulfillmentCount,
      fulfillmentSum,
    ] = await Promise.all([
      prisma.order.findMany({
        where: pendingWhere,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          wholesaleCustomer: {
            select: { id: true, currentBalance: true, creditLimit: true, isActive: true, notes: true },
          },
          orderItems: {
            select: { id: true, productName: true, quantity: true, price: true, total: true },
          },
        },
      }),
      prisma.order.count({ where: pendingWhere }),
      prisma.order.aggregate({ where: pendingWhere, _sum: { total: true } }),
      prisma.wholesaleCustomer.findMany({
        where: customerWhere,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { currentBalance: 'desc' },
        take: 200,
      }),
      prisma.wholesaleCustomer.findMany({
        where: suspendedWhere,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limitNum,
      }),
      prisma.order.findMany({
        where: fulfillmentWhere,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          wholesaleCustomer: { select: { id: true, currentBalance: true, creditLimit: true } },
          orderItems: {
            select: { id: true, productName: true, quantity: true, price: true, total: true },
          },
        },
      }),
      prisma.order.count({ where: fulfillmentWhere }),
      prisma.order.aggregate({ where: fulfillmentWhere, _sum: { total: true } }),
    ]);

    // Format Block 1: Pending Orders
    const mappedPending = pendingOrders.map((o) => {
      const total = Number(o.total || 0);
      const wc = o.wholesaleCustomer;
      const balance = Number(wc?.currentBalance || 0);
      const limit = Number(wc?.creditLimit || 0);
      const isOverLimit = limit > 0 && (balance + total > limit || balance > limit);
      const excessAmount = limit > 0 && balance + total > limit ? balance + total - limit : 0;
      const customerName = o.customer
        ? `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim()
        : (o.customerName || 'تاجر جملة');
      const customerPhone = o.customer?.phone || o.customerPhone || '—';

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        status: o.status,
        total,
        itemCount: o.orderItems ? o.orderItems.length : 0,
        items: (o.orderItems || []).map((it) => ({
          id: it.id,
          productName: it.productName,
          quantity: it.quantity,
          price: Number(it.price || 0),
          total: Number(it.total || 0),
        })),
        distributor: {
          id: wc?.id || o.wholesaleCustomerId || null,
          customerId: o.customerId,
          name: customerName,
          phone: customerPhone,
          currentBalance: balance,
          creditLimit: limit,
          isOverLimit,
          excessAmount,
          isActive: wc ? wc.isActive : true,
        },
      };
    });

    // Format Block 2: Over-Limit Customers
    const overLimitList = allBalanceCustomers
      .filter((c) => Number(c.creditLimit) > 0 && Number(c.currentBalance) > Number(c.creditLimit))
      .map((c) => {
        const balance = Number(c.currentBalance || 0);
        const limit = Number(c.creditLimit || 0);
        const excess = balance - limit;
        const utilization = limit > 0 ? (balance / limit) * 100 : 100;
        const name = c.customer
          ? `${c.customer.firstName || ''} ${c.customer.lastName || ''}`.trim()
          : 'موزع معتمد';
        return {
          id: c.id,
          customerId: c.customerId,
          name,
          phone: c.customer?.phone || '—',
          currentBalance: balance,
          creditLimit: limit,
          excessAmount: excess,
          utilizationPercent: Math.round(utilization),
          isActive: c.isActive,
          notes: c.notes,
          updatedAt: c.updatedAt,
        };
      });

    // Format Block 3: Suspended Customers
    const suspendedList = suspendedWc.map((c) => {
      const name = c.customer
        ? `${c.customer.firstName || ''} ${c.customer.lastName || ''}`.trim()
        : 'موزع موقوف';
      return {
        id: c.id,
        customerId: c.customerId,
        name,
        phone: c.customer?.phone || '—',
        currentBalance: Number(c.currentBalance || 0),
        creditLimit: Number(c.creditLimit || 0),
        notes: c.notes || 'لا يوجد سبب مسجل',
        isActive: false,
        updatedAt: c.updatedAt,
      };
    });

    // Format Block 4: Fulfillment / Processing Orders
    const mappedFulfillment = fulfillmentOrders.map((o) => {
      const customerName = o.customer
        ? `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim()
        : (o.customerName || 'تاجر جملة');
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total || 0),
        createdAt: o.createdAt,
        confirmedAt: o.confirmedAt,
        itemCount: o.orderItems ? o.orderItems.length : 0,
        distributor: {
          id: o.wholesaleCustomer?.id || o.wholesaleCustomerId || null,
          customerId: o.customerId,
          name: customerName,
          phone: o.customer?.phone || o.customerPhone || '—',
        },
      };
    });

    const totalOverLimitAmount = overLimitList.reduce((acc, c) => acc + c.excessAmount, 0);
    const pendingOrdersAmount = Number(pendingSum?._sum?.total || 0);
    const fulfillmentOrdersAmount = Number(fulfillmentSum?._sum?.total || 0);

    return {
      counts: {
        pendingOrdersCount: pendingCount,
        pendingOrdersAmount,
        overLimitDistributorsCount: overLimitList.length,
        totalOverLimitAmount,
        suspendedDistributorsCount: suspendedList.length,
        processingOrdersCount: fulfillmentCount,
        processingOrdersAmount: fulfillmentOrdersAmount,
      },
      groups: {
        pendingOrders: mappedPending,
        overLimitDistributors: overLimitList,
        suspendedDistributors: suspendedList,
        processingOrders: mappedFulfillment,
      },
      filters: {
        companyId,
        distributorId: distributorId || null,
        period,
        periodStartDate: periodStartDate ? periodStartDate.toISOString() : null,
      },
    };
  },

  // ── Confirm Wholesale Order (Calls confirmation center + ensures recordOrderInvoice) ──
  async confirmWholesaleOrder(orderId, companyId, userId = null, notes = null) {
    const prisma = getSharedPrismaClient();
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        companyId,
      },
    });
    if (!order) {
      const err = new Error('طلب الجملة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // 1. Invoke standard order confirmation logic
    const orderConfirmationService = require('./orderConfirmationService');
    const confirmationResult = await orderConfirmationService.confirmOrder(
      companyId,
      order.id,
      userId,
      notes || 'تأكيد من شاشة العمل اليومية لإدارة الموزعين'
    );

    // 2. Fetch fresh order state
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });

    // 3. Guarantee invoice recording (idempotent: safe if already recorded by confirmation hook)
    let invoiceTransaction = null;
    try {
      invoiceTransaction = await this.recordOrderInvoice(updatedOrder || order);
    } catch (invoiceErr) {
      console.warn('⚠️ [WHOLESALE-MANAGE] Auto-invoice guarantee warning:', invoiceErr.message);
    }

    return {
      order: updatedOrder || order,
      invoiceTransaction,
      confirmationResult,
    };
  },

  // ── Suspend Distributor Account with Reason ──
  async suspendDistributor(id, companyId, reason, userId = null) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: { id, companyId },
      include: { customer: true },
    });
    if (!wc) {
      const err = new Error('الموزع غير موجود');
      err.statusCode = 404;
      throw err;
    }
    if (!reason || !String(reason).trim()) {
      const err = new Error('سبب إيقاف الموزع مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const nowStr = new Date().toISOString().split('T')[0];
    const suspensionEntry = `[إيقاف حساب - ${nowStr}]: ${String(reason).trim()}`;
    const newNotes = wc.notes ? `${suspensionEntry}\n${wc.notes}` : suspensionEntry;

    const updated = await prisma.wholesaleCustomer.update({
      where: { id: wc.id },
      data: {
        isActive: false,
        notes: newNotes,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    return updated;
  },

  // ── Resume Distributor Account with Reason ──
  async resumeDistributor(id, companyId, reason = null, userId = null) {
    const prisma = getSharedPrismaClient();
    const wc = await prisma.wholesaleCustomer.findFirst({
      where: { id, companyId },
      include: { customer: true },
    });
    if (!wc) {
      const err = new Error('الموزع غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const nowStr = new Date().toISOString().split('T')[0];
    const resumeEntry = `[إعادة تفعيل - ${nowStr}]${reason && String(reason).trim() ? `: ${String(reason).trim()}` : ''}`;
    const newNotes = wc.notes ? `${resumeEntry}\n${wc.notes}` : resumeEntry;

    const updated = await prisma.wholesaleCustomer.update({
      where: { id: wc.id },
      data: {
        isActive: true,
        notes: newNotes,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    return updated;
  },
};

module.exports = { wholesaleService, WHOLESALE_PERMISSIONS: { VIEW: 'wholesale.view', CREATE: 'wholesale.create', EDIT: 'wholesale.edit', DELETE: 'wholesale.delete' } };
module.exports.wholesalePricing = require('./wholesalePricing');
