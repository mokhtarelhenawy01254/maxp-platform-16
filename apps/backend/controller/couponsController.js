const { getSharedPrismaClient } = require('../services/sharedDatabase');
const getPrisma = () => getSharedPrismaClient();

/**
 * 🎟️ Coupons Controller
 * إدارة الكوبونات والخصومات
 */

// ✅ الحصول على جميع الكوبونات
exports.getCoupons = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { isActive, type, customerSegment, page = 1, limit = 20 } = req.query;

    const where = { companyId };

    // تطبيق الفلاتر
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (type) {
      where.type = type.toUpperCase() === 'FIXED' ? 'FIXED_AMOUNT' : type.toUpperCase();
    }

    // حساب الـ pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // جلب الكوبونات
    const [coupons, total] = await Promise.all([
      getPrisma().coupon.findMany({
        where,
        include: {
          _count: {
            select: { couponUsages: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      getPrisma().coupon.count({ where })
    ]);

    // تصفية حسب فئة العملاء إذا تم تحديدها
    let filteredCoupons = coupons;
    if (customerSegment) {
      filteredCoupons = coupons.filter(coupon => {
        if (!coupon.customerSegments) return false;
        const segments = JSON.parse(coupon.customerSegments);
        return segments.includes(customerSegment) || segments.includes('all');
      });
    }

    res.json({
      success: true,
      data: filteredCoupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching coupons:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الكوبونات'
    });
  }
};

// ✅ الحصول على كوبون واحد
exports.getCoupon = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const coupon = await getPrisma().coupon.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        couponUsages: {
          take: 10,
          orderBy: { usedAt: 'desc' }
        },
        _count: {
          select: { couponUsages: true }
        }
      }
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'الكوبون غير موجود'
      });
    }

    res.json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('❌ Error fetching coupon:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الكوبون'
    });
  }
};

// ✅ إنشاء كوبون جديد
exports.createCoupon = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      code,
      name,
      description,
      type,
      value,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      userUsageLimit,
      validFrom,
      validTo,
      isActive,
      customerSegments
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!code || !name || !type || (value === undefined || value === null || value === '') || !validFrom || !validTo) {
      const missingFields = [];
      if (!code) missingFields.push('code');
      if (!name) missingFields.push('name');
      if (!type) missingFields.push('type');
      if (value === undefined || value === null || value === '') missingFields.push('value');
      if (!validFrom) missingFields.push('validFrom');
      if (!validTo) missingFields.push('validTo');

      console.error('❌ Validation failed. Missing fields:', missingFields);

      return res.status(400).json({
        success: false,
        error: `يرجى إدخال جميع البيانات المطلوبة (${missingFields.join(', ')})`
      });
    }

    // التحقق من صحة التواريخ
    const startDate = new Date(validFrom);
    const endDate = new Date(validTo);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'تنسيق التاريخ غير صحيح'
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        error: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'
      });
    }

    // التحقق من عدم وجود كوبون بنفس الكود
    const existingCoupon = await getPrisma().coupon.findFirst({
      where: {
        companyId,
        code: code.toUpperCase()
      }
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        error: 'يوجد كوبون بنفس الكود بالفعل'
      });
    }

    // إنشاء الكوبون
    const coupon = await getPrisma().coupon.create({
      data: {
        companyId,
        code: code.toUpperCase(),
        name,
        description,
        type: type.toUpperCase() === 'FIXED' ? 'FIXED_AMOUNT' : type.toUpperCase(),
        value: parseFloat(value),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        userUsageLimit: userUsageLimit ? parseInt(userUsageLimit) : null,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        isActive: isActive !== undefined ? isActive : true,
        customerSegments: customerSegments ? JSON.stringify(customerSegments) : JSON.stringify(['all']),
        createdBy: userId
      }
    });

    res.status(201).json({
      success: true,
      data: coupon,
      message: 'تم إنشاء الكوبون بنجاح'
    });
  } catch (error) {
    console.error('❌ Error creating coupon:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء الكوبون'
    });
  }
};

// ✅ تحديث كوبون
exports.updateCoupon = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    // التحقق من وجود الكوبون
    const existingCoupon = await getPrisma().coupon.findFirst({
      where: { id, companyId }
    });

    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        error: 'الكوبون غير موجود'
      });
    }

    // التحقق من تكرار الكود إذا تم تغييره
    if (updateData.code && updateData.code.toUpperCase() !== existingCoupon.code) {
      const codeExists = await getPrisma().coupon.findFirst({
        where: {
          companyId,
          code: updateData.code.toUpperCase(),
          NOT: { id }
        }
      });
      if (codeExists) {
        return res.status(400).json({
          success: false,
          error: 'يوجد كوبون آخر بنفس الكود بالفعل'
        });
      }
    }

    // تجهيز الحقول المسموح بتعديلها فقط (Safe Whitelist)
    const safeData = {};
    if (updateData.name !== undefined) safeData.name = updateData.name;
    if (updateData.description !== undefined) safeData.description = updateData.description;
    if (updateData.code !== undefined) safeData.code = updateData.code.toUpperCase();
    if (updateData.type !== undefined) {
      const t = String(updateData.type).toUpperCase();
      safeData.type = t === 'FIXED' ? 'FIXED_AMOUNT' : t;
    }
    if (updateData.value !== undefined) safeData.value = parseFloat(updateData.value);
    if (updateData.minOrderAmount !== undefined) safeData.minOrderAmount = updateData.minOrderAmount ? parseFloat(updateData.minOrderAmount) : null;
    if (updateData.maxDiscountAmount !== undefined) safeData.maxDiscountAmount = updateData.maxDiscountAmount ? parseFloat(updateData.maxDiscountAmount) : null;
    if (updateData.usageLimit !== undefined) safeData.usageLimit = updateData.usageLimit ? parseInt(updateData.usageLimit) : null;
    if (updateData.userUsageLimit !== undefined) safeData.userUsageLimit = updateData.userUsageLimit ? parseInt(updateData.userUsageLimit) : null;
    if (updateData.validFrom !== undefined) safeData.validFrom = new Date(updateData.validFrom);
    if (updateData.validTo !== undefined) safeData.validTo = new Date(updateData.validTo);
    if (updateData.isActive !== undefined) safeData.isActive = Boolean(updateData.isActive);
    if (updateData.customerSegments !== undefined) safeData.customerSegments = typeof updateData.customerSegments === 'string' ? updateData.customerSegments : JSON.stringify(updateData.customerSegments);
    if (updateData.allowWithLoyalty !== undefined) safeData.allowWithLoyalty = Boolean(updateData.allowWithLoyalty);

    // تحديث الكوبون
    const updatedCoupon = await getPrisma().coupon.update({
      where: { id },
      data: safeData
    });

    res.json({
      success: true,
      data: updatedCoupon,
      message: 'تم تحديث الكوبون بنجاح'
    });
  } catch (error) {
    console.error('❌ Error updating coupon:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث الكوبون'
    });
  }
};

// ✅ حذف كوبون
exports.deleteCoupon = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    // التحقق من وجود الكوبون
    const existingCoupon = await getPrisma().coupon.findFirst({
      where: { id, companyId }
    });

    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        error: 'الكوبون غير موجود'
      });
    }

    // حذف الكوبون
    await getPrisma().coupon.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف الكوبون بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting coupon:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في حذف الكوبون'
    });
  }
};

// ✅ التحقق من صلاحية كوبون
exports.validateCoupon = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { code, orderAmount, customerId } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال كود الكوبون وقيمة الطلب'
      });
    }

    // البحث عن الكوبون
    const coupon = await getPrisma().coupon.findFirst({
      where: {
        companyId,
        code: code.toUpperCase(),
        isActive: true
      },
      include: {
        couponUsages: customerId ? {
          where: { customerId }
        } : false
      }
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'الكوبون غير صحيح أو غير نشط'
      });
    }

    // التحقق من صلاحية التاريخ
    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
      return res.status(400).json({
        success: false,
        error: 'الكوبون منتهي الصلاحية'
      });
    }

    // التحقق من حد الاستخدام الكلي
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        error: 'تم استنفاد عدد مرات استخدام الكوبون'
      });
    }

    // التحقق من حد الاستخدام للعميل
    if (customerId && coupon.userUsageLimit && coupon.couponUsages) {
      if (coupon.couponUsages.length >= coupon.userUsageLimit) {
        return res.status(400).json({
          success: false,
          error: 'لقد استخدمت هذا الكوبون الحد الأقصى من المرات'
        });
      }
    }

    // التحقق من الحد الأدنى لقيمة الطلب
    if (coupon.minOrderAmount && parseFloat(orderAmount) < parseFloat(coupon.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        error: `الحد الأدنى لقيمة الطلب هو ${coupon.minOrderAmount} جنيه`
      });
    }

    // حساب قيمة الخصم
    let discountAmount = 0;
    const isFreeShipping = coupon.type === 'FREE_SHIPPING';
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (parseFloat(orderAmount) * parseFloat(coupon.value)) / 100;
      // تطبيق الحد الأقصى للخصم إذا كان موجوداً
      if (coupon.maxDiscountAmount && discountAmount > parseFloat(coupon.maxDiscountAmount)) {
        discountAmount = parseFloat(coupon.maxDiscountAmount);
      }
    } else if (coupon.type === 'FIXED' || coupon.type === 'FIXED_AMOUNT') {
      discountAmount = parseFloat(coupon.value);
    }

    discountAmount = Math.max(0, Math.min(parseFloat(orderAmount), discountAmount));

    res.json({
      success: true,
      discount: discountAmount,
      discountAmount,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value
        },
        discountAmount,
        discount: discountAmount,
        isFreeShipping,
        finalAmount: parseFloat(orderAmount) - discountAmount
      }
    });
  } catch (error) {
    console.error('❌ Error validating coupon:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في التحقق من الكوبون'
    });
  }
};

// ✅ تطبيق كوبون على طلب
exports.applyCoupon = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { couponId, orderId, customerId, orderAmount, discountAmount } = req.body;

    // تسجيل استخدام الكوبون
    await getPrisma().$transaction([
      // إضافة سجل الاستخدام
      getPrisma().couponUsage.create({
        data: {
          couponId,
          companyId,
          customerId,
          orderId,
          orderAmount: parseFloat(orderAmount),
          discountAmount: parseFloat(discountAmount)
        }
      }),
      // تحديث عداد الاستخدام
      getPrisma().coupon.update({
        where: { id: couponId },
        data: {
          usageCount: {
            increment: 1
          }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'تم تطبيق الكوبون بنجاح'
    });
  } catch (error) {
    console.error('❌ Error applying coupon:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تطبيق الكوبون'
    });
  }
};

// ✅ إنشاء كوبونات جماعية بكود فريد لكل عميلة (Win-back 90/120/150)
exports.bulkGenerateCoupons = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      prefix,
      type,
      value,
      validFrom,
      validTo,
      customerIds,
      inactiveDays,
      name,
      description,
      minOrderAmount,
      maxDiscountAmount,
      userUsageLimit = 1,
      usageLimit = 1,
      customerSegments,
      isActive = true
    } = req.body;

    if (!prefix || !type || value === undefined || value === null || value === '' || !validFrom || !validTo) {
      return res.status(400).json({ success: false, error: 'prefix, type, value, validFrom, validTo مطلوبة' });
    }

    const cleanPrefix = String(prefix).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20) || 'WB';
    const couponType = String(type).toUpperCase() === 'FIXED' ? 'FIXED_AMOUNT' : String(type).toUpperCase();
    if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(couponType)) {
      return res.status(400).json({ success: false, error: 'type يجب أن يكون PERCENTAGE أو FIXED' });
    }

    const startDate = new Date(validFrom);
    const endDate = new Date(validTo);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({ success: false, error: 'تواريخ غير صحيحة' });
    }

    let targetIds = Array.isArray(customerIds) ? customerIds.filter(Boolean) : [];

    // Win-back auto-select: inactiveDays → customers with last order < cutoff
    if (targetIds.length === 0 && inactiveDays) {
      const days = Math.max(1, Math.min(365, parseInt(inactiveDays, 10) || 90));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const prisma = getPrisma();
      const rows = await prisma.$queryRaw`
        SELECT c.id
        FROM "customers" c
        JOIN "orders" o ON o."customerId" = c.id
        WHERE o."companyId" = ${companyId}
        GROUP BY c.id
        HAVING MAX(o."createdAt") < ${cutoff}
        LIMIT 200
      `;
      targetIds = (rows || []).map(r => r.id);
    }

    if (targetIds.length === 0) {
      return res.status(400).json({ success: false, error: 'لا يوجد عملاء مستهدفين (customerIds أو inactiveDays)' });
    }

    if (targetIds.length > 200) targetIds = targetIds.slice(0, 200);

    const prisma = getPrisma();
    // Validate customers belong to company
    const validCustomers = await prisma.customer.findMany({
      where: { id: { in: targetIds }, companyId },
      select: { id: true, phone: true }
    });
    const validMap = new Map(validCustomers.map(c => [c.id, c]));

    let created = 0;
    let skipped = 0;
    const generated = [];
    const errors = [];

    for (const cid of targetIds) {
      if (!validMap.has(cid)) { skipped++; continue; }
      const cust = validMap.get(cid);
      const phoneSuffix = (cust.phone || '').replace(/\D/g, '').slice(-4) || '0000';
      let code;
      let attempts = 0;
      do {
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        code = `${cleanPrefix}-${phoneSuffix}-${rand}`.toUpperCase();
        attempts++;
        if (attempts > 5) break;
        const exists = await prisma.coupon.findFirst({ where: { companyId, code } });
        if (!exists) break;
        code = null;
      } while (!code && attempts < 5);

      if (!code) { skipped++; errors.push({ customerId: cid, error: 'تعذر توليد كود فريد' }); continue; }

      try {
        const coupon = await prisma.coupon.create({
          data: {
            companyId,
            code,
            name: name || `${cleanPrefix} - ${phoneSuffix}`,
            description: description || `كوبون Win-back ${cleanPrefix}`,
            type: couponType,
            value: parseFloat(value),
            minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
            maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
            usageLimit: usageLimit ? parseInt(usageLimit) : 1,
            userUsageLimit: userUsageLimit ? parseInt(userUsageLimit) : 1,
            validFrom: startDate,
            validTo: endDate,
            isActive: isActive !== false,
            customerSegments: customerSegments ? JSON.stringify(customerSegments) : JSON.stringify([cid]),
            metadata: JSON.stringify({ bulkPrefix: cleanPrefix, customerId: cid, inactiveDays: inactiveDays || null }),
            createdBy: userId
          }
        });
        generated.push({ customerId: cid, code: coupon.code, couponId: coupon.id });
        created++;
      } catch (e) {
        if (e.code === 'P2002') {
          skipped++;
          errors.push({ customerId: cid, error: 'كود مكرر' });
        } else {
          skipped++;
          errors.push({ customerId: cid, error: e.message });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: { created, skipped, total: targetIds.length, coupons: generated },
      errors: errors.length ? errors : undefined,
      message: `تم إنشاء ${created} كوبون فريد من ${targetIds.length}`
    });
  } catch (error) {
    console.error('❌ Error bulk generating coupons:', error);
    res.status(500).json({ success: false, error: 'فشل في إنشاء الكوبونات الجماعية' });
  }
};

// ✅ إحصائيات الكوبونات
exports.getCouponStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [totalCoupons, activeCoupons, totalUsages, totalDiscount] = await Promise.all([
      getPrisma().coupon.count({ where: { companyId } }),
      getPrisma().coupon.count({ where: { companyId, isActive: true } }),
      getPrisma().couponUsage.count({ where: { companyId } }),
      getPrisma().couponUsage.aggregate({
        where: { companyId },
        _sum: { discountAmount: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        totalUsages,
        totalDiscount: totalDiscount._sum.discountAmount || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching coupon stats:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات الكوبونات'
    });
  }
};
