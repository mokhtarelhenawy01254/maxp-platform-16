const {
  getSharedPrismaClient,
  safeQuery,
} = require("../services/sharedDatabase");

const normalizePurchaseInvoice = (invoice) => {
  if (!invoice) return invoice;

  const { purchaseInvoiceItems, supplierPayments, _count, ...rest } = invoice;

  return {
    ...rest,
    ...(purchaseInvoiceItems !== undefined
      ? { items: purchaseInvoiceItems }
      : {}),
    ...(supplierPayments !== undefined ? { payments: supplierPayments } : {}),
    ...(_count
      ? {
          _count: {
            ..._count,
            ...(typeof _count.purchaseInvoiceItems === "number"
              ? { items: _count.purchaseInvoiceItems }
              : {}),
            ...(typeof _count.supplierPayments === "number"
              ? { payments: _count.supplierPayments }
              : {}),
          },
        }
      : {}),
  };
};

const generateInvoiceNumber = async (companyId) => {
  const lastInvoice = await safeQuery(() =>
    getSharedPrismaClient().purchaseInvoice.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  );

  const lastNumber = lastInvoice
    ? parseInt(lastInvoice.invoiceNumber.split("-").pop())
    : 0;
  return `PI-${String(lastNumber + 1).padStart(6, "0")}`;
};

const generatePaymentNumber = async (companyId) => {
  const lastPayment = await safeQuery(() =>
    getSharedPrismaClient().supplierPayment.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  );

  const lastNumber = lastPayment
    ? parseInt(lastPayment.paymentNumber.split("-").pop())
    : 0;
  return `SP-${String(lastNumber + 1).padStart(6, "0")}`;
};

exports.createPurchaseInvoice = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      supplierId,
      purchaseOrderId,
      invoiceDate,
      dueDate,
      items,
      notes,
      shippingCost,
      discountAmount,
      paidAmount: rawPaidAmount,
      paymentMethod,
      paymentNotes,
    } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: "المورد والأصناف مطلوبة" });
    }

    const invoiceNumber = await generateInvoiceNumber(companyId);

    // Validate candidate productIds against actual Products table to avoid Foreign Key violation
    const validProductIds = new Set();
    const candidateProductIds = items
      .map((item) => item.productId)
      .filter(Boolean);

    if (candidateProductIds.length > 0) {
      const existingProducts = await safeQuery(() =>
        getSharedPrismaClient().product.findMany({
          where: {
            id: { in: candidateProductIds },
            companyId,
          },
          select: { id: true },
        }),
      );
      if (Array.isArray(existingProducts)) {
        existingProducts.forEach((p) => validProductIds.add(p.id));
      }
    }

    let subtotal = 0;
    let taxAmount = 0;

    const invoiceItems = items.map((item) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const taxRate = parseFloat(item.taxRate || 0);
      const discountRate = parseFloat(item.discountRate || 0);

      const itemSubtotal = quantity * unitPrice;
      const itemDiscount = itemSubtotal * (discountRate / 100);
      const itemTax = (itemSubtotal - itemDiscount) * (taxRate / 100);
      const totalPrice = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      const safeProductId =
        item.productId && validProductIds.has(item.productId)
          ? item.productId
          : null;

      return {
        productId: safeProductId,
        productName: item.productName,
        description: item.description,
        quantity,
        unitPrice,
        taxRate,
        discountRate,
        totalPrice,
        notes: item.notes,
      };
    });

    const shipping = parseFloat(shippingCost || 0);
    const discount = parseFloat(discountAmount || 0);
    const totalAmount = subtotal + taxAmount + shipping - discount;

    const requestedPaid = Math.max(0, parseFloat(rawPaidAmount || 0));
    const paidAmount = Math.min(requestedPaid, totalAmount);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const status = remainingAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIALLY_PAID" : "PENDING";

    const invoice = await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.create({
        data: {
          companyId,
          supplierId,
          purchaseOrderId: purchaseOrderId || null,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotal,
          taxAmount,
          discountAmount: discount,
          shippingCost: shipping,
          totalAmount,
          paidAmount,
          remainingAmount,
          status,
          notes,
          createdBy: userId,
          purchaseInvoiceItems: {
            create: invoiceItems,
          },
        },
        include: {
          purchaseInvoiceItems: true,
          supplier: true,
          purchaseOrder: true,
        },
      }),
    );

    if (paidAmount > 0) {
      const paymentNumber = await generatePaymentNumber(companyId);
      await safeQuery(() =>
        getSharedPrismaClient().supplierPayment.create({
          data: {
            companyId,
            supplierId,
            purchaseInvoiceId: invoice.id,
            paymentNumber,
            paymentDate: invoiceDate ? new Date(invoiceDate) : new Date(),
            amount: paidAmount,
            paymentMethod: paymentMethod || "CASH",
            notes: paymentNotes || "سداد فوري عند إنشاء الفاتورة",
            createdBy: userId,
          },
        }),
      );
    }

    if (remainingAmount > 0) {
      await safeQuery(() =>
        getSharedPrismaClient().supplier.update({
          where: { id: supplierId },
          data: {
            currentBalance: {
              increment: remainingAmount,
            },
          },
        }),
      );
    }

    // Accounting Auto-Posting Hook (Non-blocking & Zero Blast-Radius)
    try {
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      AccountingAutoPostingService.postPurchaseInvoice(companyId, invoice.id, {
        userId,
        invoiceData: invoice,
      }).catch((err) => console.error('[Accounting Auto-Posting] Purchase Invoice async error:', err.message));
    } catch (autoErr) {
      console.error('[Accounting Auto-Posting] Purchase Invoice hook error:', autoErr.message);
    }

    res.status(201).json({
      success: true,
      message: paidAmount >= totalAmount ? "تم إنشاء الفاتورة وسدادها بنجاح" : "تم إنشاء الفاتورة بنجاح",
      invoice: normalizePurchaseInvoice(invoice),
    });
  } catch (error) {
    console.error("Error creating purchase invoice:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الفاتورة: " + error.message,
      error: error.message,
      details: error.stack,
    });
  }
};

exports.getAllPurchaseInvoices = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, status, supplierId, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (status === "OVERDUE") {
      where.status = { notIn: ["PAID", "CANCELLED"] };
      where.dueDate = { lt: new Date() };
    } else if (status && status !== "all") {
      where.status = status;
    }
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [invoices, total] = await Promise.all([
      safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
          include: {
            supplier: {
              select: { id: true, name: true, phone: true },
            },
            purchaseOrder: {
              select: { id: true, orderNumber: true },
            },
            _count: {
              select: { purchaseInvoiceItems: true, supplierPayments: true },
            },
          },
        }),
      ),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where })),
    ]);

    res.json({
      invoices: invoices.map(normalizePurchaseInvoice),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الفواتير" });
  }
};

exports.getPurchaseInvoiceById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const invoice = await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.findFirst({
        where: { id, companyId },
        include: {
          supplier: true,
          purchaseOrder: true,
          purchaseInvoiceItems: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
          supplierPayments: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    );

    if (!invoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    res.json(normalizePurchaseInvoice(invoice));
  } catch (error) {
    console.error("Error fetching purchase invoice:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الفاتورة" });
  }
};

exports.updatePurchaseInvoice = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { supplierId, invoiceDate, dueDate, status, notes } = req.body;

    const existingInvoice = await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.findFirst({
        where: { id, companyId },
      }),
    );

    if (!existingInvoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    if (existingInvoice.status === "PAID") {
      return res
        .status(400)
        .json({ message: "لا يمكن تعديل فاتورة مدفوعة بالكامل" });
    }

    const invoice = await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.update({
        where: { id },
        data: {
          supplierId,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          status,
          notes,
        },
        include: {
          purchaseInvoiceItems: true,
          supplier: true,
          supplierPayments: true,
        },
      }),
    );

    res.json({
      message: "تم تحديث الفاتورة بنجاح",
      invoice: normalizePurchaseInvoice(invoice),
    });
  } catch (error) {
    console.error("Error updating purchase invoice:", error);
    res.status(500).json({ message: "حدث خطأ أثناء تحديث الفاتورة" });
  }
};

exports.deletePurchaseInvoice = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const invoice = await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.findFirst({
        where: { id, companyId },
        include: {
          _count: {
            select: { supplierPayments: true },
          },
        },
      }),
    );

    if (!invoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    if (invoice._count.supplierPayments > 0) {
      return res
        .status(400)
        .json({ message: "لا يمكن حذف فاتورة مرتبطة بمدفوعات" });
    }

    await safeQuery(() =>
      getSharedPrismaClient().supplier.update({
        where: { id: invoice.supplierId },
        data: {
          currentBalance: {
            decrement: invoice.totalAmount,
          },
        },
      }),
    );

    await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.delete({
        where: { id },
      }),
    );

    res.json({ message: "تم حذف الفاتورة بنجاح" });
  } catch (error) {
    console.error("Error deleting purchase invoice:", error);
    res.status(500).json({ message: "حدث خطأ أثناء حذف الفاتورة" });
  }
};

exports.getPurchaseInvoiceStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
    ] = await Promise.all([
      safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.count({ where: { companyId } }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.count({
          where: { companyId, status: "PENDING" },
        }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.count({
          where: { companyId, status: "PENDING", dueDate: { lt: new Date() } },
        }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.aggregate({
          where: { companyId, status: { notIn: ["CANCELLED"] } },
          _sum: { totalAmount: true },
        }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.aggregate({
          where: { companyId, status: { notIn: ["CANCELLED"] } },
          _sum: { paidAmount: true },
        }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.aggregate({
          where: { companyId, status: "PENDING" },
          _sum: { remainingAmount: true },
        }),
      ),
    ]);

    res.json({
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount: totalAmount._sum.totalAmount || 0,
      paidAmount: paidAmount._sum.paidAmount || 0,
      pendingAmount: pendingAmount._sum.remainingAmount || 0,
    });
  } catch (error) {
    console.error("Error fetching purchase invoice stats:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الإحصائيات" });
  }
};

exports.checkOverdueInvoices = async (req, res) => {
  try {
    const { companyId } = req.user;

    const overdueInvoices = await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.findMany({
        where: {
          companyId,
          status: { notIn: ["PAID", "CANCELLED"] },
          dueDate: { lt: new Date() },
        },
      }),
    );

    res.json({
      success: true,
      message: "تم فحص الفواتير المتأخرة",
      count: overdueInvoices.length,
      overdueInvoices: overdueInvoices.map(normalizePurchaseInvoice),
    });
  } catch (error) {
    console.error("Error checking overdue invoices:", error);
    res.status(500).json({ message: "حدث خطأ أثناء فحص الفواتير المتأخرة" });
  }
};
