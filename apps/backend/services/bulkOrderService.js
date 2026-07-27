const { getSharedPrismaClient } = require('./sharedDatabase');
const XLSX = require('xlsx');
const auditTrailService = require('./auditTrailService');

const AUDIT_ACTIONS = {
  BULK_ORDER_CREATED: 'BULK_ORDER_CREATED',
  BULK_ORDER_UPDATED: 'BULK_ORDER_UPDATED',
  BULK_ORDER_DELETED: 'BULK_ORDER_DELETED',
  BULK_ORDER_EXPORTED: 'BULK_ORDER_EXPORTED',
  BULK_ORDER_EXECUTED: 'BULK_ORDER_EXECUTED',
  BULK_ORDER_DUPLICATED: 'BULK_ORDER_DUPLICATED',
  BULK_ORDER_IMPORTED: 'BULK_ORDER_IMPORTED',
};

const BULK_ORDER_PERMISSIONS = {
  VIEW: 'bulkOrders.view',
  CREATE: 'bulkOrders.create',
  EDIT: 'bulkOrders.edit',
  DELETE: 'bulkOrders.delete',
  EXPORT: 'bulkOrders.export',
  IMPORT: 'bulkOrders.import',
  EXECUTE: 'bulkOrders.execute',
};

const generateOperationNumber = async (companyId) => {
  const prisma = getSharedPrismaClient();
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = `BLK-${y}${m}${d}-`;

  const lastRecord = await prisma.bulkOrder.findFirst({
    where: {
      companyId,
      operationNumber: { startsWith: prefix },
    },
    orderBy: { operationNumber: 'desc' },
  });

  let nextNum = 1;
  if (lastRecord && lastRecord.operationNumber) {
    const parts = lastRecord.operationNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

const bulkOrderService = {
  async list({ companyId, page = 1, limit = 20, status, search, sortBy = 'createdAt', sortOrder = 'desc', userId, dateFrom, dateTo }) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };

    if (status) where.status = status;
    if (userId) where.createdById = userId;
    if (search) {
      where.OR = [
        { operationNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    const ALLOWED_SORT_COLUMNS = [
      'operationNumber', 'name', 'totalOrders', 'status',
      'progress', 'createdByName', 'createdAt', 'updatedAt',
    ];
    const safeSort = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy = { [safeSort]: safeOrder };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.bulkOrder.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { items: true } } },
      }),
      prisma.bulkOrder.count({ where }),
    ]);

    return {
      data: data.map((o) => ({
        id: o.id,
        operationNumber: o.operationNumber,
        name: o.name,
        totalOrders: o.totalOrders,
        status: o.status,
        progress: o.progress,
        createdByName: o.createdByName,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        itemsCount: o._count.items,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id, companyId) {
    const prisma = getSharedPrismaClient();
    const record = await prisma.bulkOrder.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    return record;
  },

  async create(data, user) {
    const prisma = getSharedPrismaClient();
    if (!data.name || !data.name.trim()) {
      throw new Error('Operation name is required');
    }
    const operationNumber = await generateOperationNumber(user.companyId);
    const validStatuses = ['DRAFT', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    const initialStatus = validStatuses.includes(data.status) ? data.status : 'DRAFT';

    const record = await prisma.bulkOrder.create({
      data: {
        operationNumber,
        name: data.name,
        description: data.description,
        status: initialStatus,
        totalOrders: data.totalOrders || 0,
        customerData: data.customerData ? JSON.stringify(data.customerData) : null,
        productData: data.productData ? JSON.stringify(data.productData) : null,
        fileAttachments: data.fileAttachments ? JSON.stringify(data.fileAttachments) : null,
        createdById: user.id,
        createdByName: user.name || user.email,
        companyId: user.companyId,
      },
    });
    auditTrailService.createAuditEntry({
      action: AUDIT_ACTIONS.BULK_ORDER_CREATED,
      companyId: user.companyId,
      userId: user.id,
      resourceType: 'bulk_order',
      resourceId: record.id,
      details: { name: data.name, operationNumber },
      severity: 'INFO',
    }).catch(() => {});
    return record;
  },

  async update(id, data, user) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.bulkOrder.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) throw new Error('Bulk order not found');

    const record = await prisma.bulkOrder.update({
      where: { id, companyId: user.companyId },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        status: data.status ?? existing.status,
        totalOrders: data.totalOrders ?? existing.totalOrders,
        progress: data.progress ?? existing.progress,
        customerData: data.customerData ? JSON.stringify(data.customerData) : undefined,
        productData: data.productData ? JSON.stringify(data.productData) : undefined,
        fileAttachments: data.fileAttachments ? JSON.stringify(data.fileAttachments) : undefined,
        updatedById: user.id,
        updatedByName: user.name || user.email,
      },
    });
    auditTrailService.createAuditEntry({
      action: AUDIT_ACTIONS.BULK_ORDER_UPDATED,
      companyId: user.companyId,
      userId: user.id,
      resourceType: 'bulk_order',
      resourceId: id,
      details: { name: data.name, changes: Object.keys(data) },
      severity: 'INFO',
    }).catch(() => {});
    return record;
  },

  async delete(id, companyId, user) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.bulkOrder.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new Error('Bulk order not found');

    await prisma.bulkOrderItem.deleteMany({ where: { bulkOrderId: id, companyId } });
    await prisma.bulkOrder.delete({ where: { id, companyId } });
    if (user) {
      auditTrailService.createAuditEntry({
        action: AUDIT_ACTIONS.BULK_ORDER_DELETED,
        companyId: companyId,
        userId: user.id,
        resourceType: 'bulk_order',
        resourceId: id,
        details: { name: existing.name, operationNumber: existing.operationNumber },
        severity: 'WARNING',
      }).catch(() => {});
    }
    return { success: true };
  },

  async duplicate(id, user) {
    const prisma = getSharedPrismaClient();
    const original = await prisma.bulkOrder.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true },
    });
    if (!original) throw new Error('Bulk order not found');

    const operationNumber = await generateOperationNumber(user.companyId);
    const newRecord = await prisma.bulkOrder.create({
      data: {
        operationNumber,
        name: `${original.name} (Copy)`,
        description: original.description,
        status: 'DRAFT',
        totalOrders: original.totalOrders,
        customerData: original.customerData,
        productData: original.productData,
        createdById: user.id,
        createdByName: user.name || user.email,
        companyId: user.companyId,
        items: original.items.length > 0 ? {
          create: original.items.map((item) => ({
            orderNumber: item.orderNumber,
            customerName: item.customerName,
            customerPhone: item.customerPhone,
            city: item.city,
            governorate: item.governorate,
            productName: item.productName,
            sku: item.sku,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            notes: item.notes,
            status: 'PENDING',
            companyId: user.companyId,
          })),
        } : undefined,
      },
    });
    auditTrailService.createAuditEntry({
      action: AUDIT_ACTIONS.BULK_ORDER_DUPLICATED,
      companyId: user.companyId,
      userId: user.id,
      resourceType: 'bulk_order',
      resourceId: newRecord.id,
      details: { originalId: id, originalName: original.name, newName: newRecord.name },
      severity: 'INFO',
    }).catch(() => {});
    return newRecord;
  },

  async export(id, companyId, format = 'json', user) {
    const prisma = getSharedPrismaClient();
    const record = await prisma.bulkOrder.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    if (!record) throw new Error('Bulk order not found');

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Operation Number', 'Name', 'Total Orders', 'Created At', 'Status', 'Progress', 'Created By'],
        [record.operationNumber, record.name, record.totalOrders, record.createdAt, record.status, `${record.progress}%`, record.createdByName],
        [],
        ['Order Number', 'Customer Name', 'Phone', 'City', 'Governorate', 'Product', 'SKU', 'Size', 'Color', 'Quantity', 'Price', 'Total', 'Status', 'Notes'],
        ...record.items.map((item) => [
          item.orderNumber, item.customerName, item.customerPhone, item.city, item.governorate,
          item.productName, item.sku, item.size, item.color,
          item.quantity, Number(item.price), Number(item.total), item.status, item.notes,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'BulkOrder');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return { buffer, filename: `bulk-order-${record.operationNumber}.xlsx` };
    }

    return {
      data: {
        ...record,
        customerData: (() => { try { return record.customerData ? JSON.parse(record.customerData) : null; } catch { return record.customerData; } })(),
        productData: (() => { try { return record.productData ? JSON.parse(record.productData) : null; } catch { return record.productData; } })(),
        items: record.items,
      },
      filename: `bulk-order-${record.operationNumber}.json`,
    };
  },

  async logAudit(action, recordId, companyId, userId, details) {
    auditTrailService.createAuditEntry({
      action,
      companyId,
      userId,
      resourceType: 'bulk_order',
      resourceId: recordId,
      details,
      severity: 'INFO',
    }).catch(() => {});
  },

  async parseUpload(fileBuffer, _mimeType) {
    let records = [];
    try {
      const wb = XLSX.read(fileBuffer, { type: 'buffer', raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } catch (e) {
      const content = fileBuffer.toString('utf-8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length > 0) {
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if ((ch === ',' || ch === '\t') && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += ch;
            }
          }
          result.push(current.trim());
          return result;
        };
        const headers = parseCSVLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
          records.push(row);
        }
      }
    }
    return records.map((r, i) => ({
      row: i + 2,
      orderNumber: String(r['orderNumber'] || r['Order Number'] || r['order_number'] || '').trim(),
      customerName: String(r['customerName'] || r['Customer Name'] || r['customer_name'] || '').trim(),
      customerPhone: String(r['customerPhone'] || r['Phone'] || r['phone'] || r['customer_phone'] || '').trim(),
      city: String(r['city'] || r['City'] || r['town'] || r['Town'] || r['City/Town'] || '').trim(),
      governorate: String(r['governorate'] || r['Governorate'] || r['govern'] || r['Govern'] || '').trim(),
      productName: String(r['productName'] || r['Product Name'] || r['product_name'] || r['product'] || '').trim(),
      sku: String(r['sku'] || r['SKU'] || r['Sku'] || '').trim(),
      size: String(r['size'] || r['Size'] || r['shoeSize'] || r['Shoe Size'] || '').trim(),
      color: String(r['color'] || r['Color'] || r['colour'] || r['Colour'] || '').trim(),
      quantity: parseInt(r['quantity'] || r['Quantity'] || '1', 10) || 1,
      price: parseFloat(r['price'] || r['Price'] || '0') || 0,
      notes: String(r['notes'] || r['Notes'] || r['note'] || r['Note'] || '').trim(),
    }));
  },

  async importItems(bulkOrderId, items, user) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.bulkOrder.findFirst({
      where: { id: bulkOrderId, companyId: user.companyId },
    });
    if (!existing) throw new Error('Bulk order not found');

    const created = await prisma.bulkOrderItem.createMany({
      data: items.map((item) => ({
        bulkOrderId,
        orderNumber: item.orderNumber,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        city: item.city,
        governorate: item.governorate,
        productName: item.productName,
        sku: item.sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity || 1,
        price: item.price || 0,
        total: (item.quantity || 1) * (item.price || 0),
        notes: item.notes,
        companyId: user.companyId,
      })),
    });

    const count = await prisma.bulkOrderItem.count({ where: { bulkOrderId } });
    await prisma.bulkOrder.update({
      where: { id: bulkOrderId, companyId: user.companyId },
      data: { totalOrders: count },
    });

    auditTrailService.createAuditEntry({
      action: AUDIT_ACTIONS.BULK_ORDER_IMPORTED,
      companyId: user.companyId,
      userId: user.id,
      resourceType: 'bulk_order',
      resourceId: bulkOrderId,
      details: { count: created.count, itemsCount: items.length },
      severity: 'INFO',
    }).catch(() => {});
    return created;
  },

  async execute(bulkOrderId, user) {
    const prisma = getSharedPrismaClient();
    const order = await prisma.bulkOrder.findFirst({
      where: { id: bulkOrderId, companyId: user.companyId },
      include: { items: true },
    });
    if (!order) throw new Error('Bulk order not found');

    await prisma.bulkOrder.update({
      where: { id: bulkOrderId, companyId: user.companyId },
      data: { status: 'PROCESSING', updatedById: user.id, updatedByName: user.name || user.email },
    });

    let successCount = 0;
    const errors = [];

    for (const item of order.items) {
      try {
        if (item.orderNumber) {
          const existingOrder = await prisma.order.findFirst({
            where: { orderNumber: item.orderNumber, companyId: user.companyId },
          });
          if (existingOrder) {
            await prisma.order.update({
              where: { id: existingOrder.id },
              data: { status: 'CONFIRMED' },
            });
            await prisma.bulkOrderItem.update({
              where: { id: item.id, companyId: user.companyId },
              data: { status: 'COMPLETED' },
            });
          } else {
            await prisma.bulkOrderItem.update({
              where: { id: item.id, companyId: user.companyId },
              data: { status: 'FAILED' },
            });
            throw new Error(`Order not found: ${item.orderNumber}`);
          }
        }
        successCount++;
      } catch (err) {
        await prisma.bulkOrderItem.update({
          where: { id: item.id, companyId: user.companyId },
          data: { status: 'FAILED' },
        }).catch(() => {});
        errors.push({ itemId: item.id, error: err.message });
      }
    }

    const progress = order.items.length > 0 ? Math.round((successCount / order.items.length) * 100) : 0;
    await prisma.bulkOrder.update({
      where: { id: bulkOrderId, companyId: user.companyId },
      data: {
        status: errors.length === 0 ? 'COMPLETED' : 'FAILED',
        progress,
        executedAt: new Date(),
      },
    });

    auditTrailService.createAuditEntry({
      action: AUDIT_ACTIONS.BULK_ORDER_EXECUTED,
      companyId: user.companyId,
      userId: user.id,
      resourceType: 'bulk_order',
      resourceId: bulkOrderId,
      details: { successCount, errorCount: errors.length, progress },
      severity: errors.length > 0 ? 'WARNING' : 'INFO',
    }).catch(() => {});
    return { successCount, errors, progress };
  },
};

module.exports = { bulkOrderService, BULK_ORDER_PERMISSIONS };
