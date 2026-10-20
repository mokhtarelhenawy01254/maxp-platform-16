const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { logProcurementActivity } = require('../services/procurementAuditService');

exports.createSupplier = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      name,
      contactPerson,
      email,
      phone,
      mobile,
      address,
      city,
      country,
      taxNumber,
      commercialRegister,
      paymentTerms,
      creditLimit,
      openingBalance,
      rating,
      notes,
      isActive
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'اسم المورد مطلوب' });
    }

    const initialBal = openingBalance ? parseFloat(openingBalance) : 0;

    const supplier = await safeQuery(() =>
      getSharedPrismaClient().supplier.create({
        data: {
          companyId,
          name,
          contactPerson,
          email,
          phone,
          mobile,
          address,
          city,
          country: country || 'Egypt',
          taxNumber,
          commercialRegister,
          paymentTerms,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null,
          openingBalance: initialBal,
          currentBalance: initialBal,
          rating: rating ? parseInt(rating) : 0,
          notes,
          isActive: isActive !== undefined ? isActive : true,
          createdBy: userId
        }
      })
    );

    await logProcurementActivity({
      companyId,
      userId,
      action: 'CREATE_SUPPLIER',
      targetType: 'SUPPLIER',
      targetId: supplier.id,
      targetName: supplier.name,
      description: `إضافة مورد جديد: ${supplier.name}`,
      metadata: { phone: supplier.phone, contactPerson: supplier.contactPerson },
      severity: 'LOW',
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المورد بنجاح',
      supplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة المورد: ' + error.message,
      error: error.message
    });
  }
};

exports.getAllSuppliers = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, search, isActive } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [suppliers, total] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().supplier.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              purchaseOrders: true,
              purchaseInvoices: true
            }
          }
        }
      })),
      safeQuery(() => getSharedPrismaClient().supplier.count({ where }))
    ]);

    res.json({
      suppliers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الموردين' });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        purchaseInvoices: {
          orderBy: { invoiceDate: 'desc' }
        },
        supplierPayments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    }));

    if (!supplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    const openingBalance = parseFloat(supplier.openingBalance) || 0;
    const currentBalance = parseFloat(supplier.currentBalance) || 0;

    // Chronological statement combining invoices and payments
    const statementItems = [];
    (supplier.purchaseInvoices || []).forEach((inv) => {
      statementItems.push({
        id: inv.id,
        type: 'INVOICE',
        typeName: 'فاتورة شراء',
        date: inv.invoiceDate || inv.createdAt,
        reference: inv.invoiceNumber,
        debit: parseFloat(inv.totalAmount) || 0, // زيادة المديونية
        credit: 0,
        amount: parseFloat(inv.totalAmount) || 0,
        paid: parseFloat(inv.paidAmount) || 0,
        remaining: parseFloat(inv.remainingAmount) || 0,
        status: inv.status,
        notes: inv.notes,
      });
    });

    (supplier.supplierPayments || []).forEach((pay) => {
      statementItems.push({
        id: pay.id,
        type: 'PAYMENT',
        typeName: 'سند صرف / دفعة',
        date: pay.paymentDate || pay.createdAt,
        reference: pay.paymentNumber,
        debit: 0,
        credit: parseFloat(pay.amount) || 0, // سداد / تخفيض المديونية
        amount: parseFloat(pay.amount) || 0,
        method: pay.paymentMethod,
        status: 'PAID',
        notes: pay.notes,
      });
    });

    // Sort ascending to calculate running balance accurately
    statementItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = openingBalance;
    const statement = statementItems.map((item) => {
      running = running + item.debit - item.credit;
      return {
        ...item,
        runningBalance: Math.round(running * 100) / 100,
      };
    });

    // Reverse for UI display (newest first)
    statement.reverse();

    // Debt Aging based on unpaid purchase invoices
    const now = new Date();
    const aging = {
      days0To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
      totalUnpaid: 0,
    };

    (supplier.purchaseInvoices || []).forEach((inv) => {
      const remaining = parseFloat(inv.remainingAmount) || 0;
      if (remaining > 0 && inv.status !== 'PAID') {
        const invDate = new Date(inv.invoiceDate || inv.createdAt);
        const diffDays = Math.floor((now - invDate) / (1000 * 60 * 60 * 24));
        aging.totalUnpaid = Math.round((aging.totalUnpaid + remaining) * 100) / 100;

        if (diffDays <= 30) {
          aging.days0To30 = Math.round((aging.days0To30 + remaining) * 100) / 100;
        } else if (diffDays <= 60) {
          aging.days31To60 = Math.round((aging.days31To60 + remaining) * 100) / 100;
        } else if (diffDays <= 90) {
          aging.days61To90 = Math.round((aging.days61To90 + remaining) * 100) / 100;
        } else {
          aging.days90Plus = Math.round((aging.days90Plus + remaining) * 100) / 100;
        }
      }
    });

    res.json({
      ...supplier,
      openingBalance,
      currentBalance,
      statement,
      aging,
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات المورد' });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const {
      name,
      contactPerson,
      email,
      phone,
      mobile,
      address,
      city,
      country,
      taxNumber,
      commercialRegister,
      paymentTerms,
      creditLimit,
      rating,
      notes,
      isActive
    } = req.body;

    const existingSupplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId }
    }));

    if (!existingSupplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.update({
      where: { id },
      data: {
        name,
        contactPerson,
        email,
        phone,
        mobile,
        address,
        city,
        country,
        taxNumber,
        commercialRegister,
        paymentTerms,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        openingBalance: req.body.openingBalance !== undefined ? parseFloat(req.body.openingBalance) : existingSupplier.openingBalance,
        rating: rating ? parseInt(rating) : existingSupplier.rating,
        notes,
        isActive
      }
    }));

    res.json({
      message: 'تم تحديث بيانات المورد بنجاح',
      supplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث بيانات المورد' });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            purchaseInvoices: true
          }
        }
      }
    }));

    if (!supplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    if (supplier._count.purchaseOrders > 0 || supplier._count.purchaseInvoices > 0) {
      return res.status(400).json({
        message: 'لا يمكن حذف المورد لأنه مرتبط بأوامر شراء أو فواتير'
      });
    }

    await safeQuery(() => getSharedPrismaClient().supplier.delete({
      where: { id }
    }));

    await logProcurementActivity({
      companyId,
      userId: req.user.id,
      action: 'DELETE_SUPPLIER',
      targetType: 'SUPPLIER',
      targetId: supplier.id,
      targetName: supplier.name,
      description: `حذف المورد: ${supplier.name}`,
      severity: 'MEDIUM',
    });

    res.json({ message: 'تم حذف المورد بنجاح' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف المورد' });
  }
};

exports.getSupplierStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId }
    }));

    if (!supplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    const [totalOrders, totalInvoices, totalPaid, pendingAmount] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({
        where: { supplierId: id, companyId }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({
        where: { supplierId: id, companyId }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.aggregate({
        where: { supplierId: id, companyId },
        _sum: { amount: true }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.aggregate({
        where: {
          supplierId: id,
          companyId,
          status: 'PENDING'
        },
        _sum: { remainingAmount: true }
      }))
    ]);

    res.json({
      totalOrders,
      totalInvoices,
      totalPaid: totalPaid._sum.amount || 0,
      pendingAmount: pendingAmount._sum.remainingAmount || 0,
      currentBalance: supplier.currentBalance
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب إحصائيات المورد' });
  }
};
