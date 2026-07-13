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

    // تحديث الكوبون
    const updatedCoupon = await getPrisma().coupon.update({
      where: { id },
      data: {
        ...updateData,
        code: updateData.code ? updateData.code.toUpperCase() : undefined,
        type: updateData.type ? (updateData.type.toUpperCase() === 'FIXED' ? 'FIXED_AMOUNT' : updateData.type.toUpperCase()) : undefined,
        value: updateData.value ? parseFloat(updateData.value) : undefined,
        minOrderAmount: updateData.minOrderAmount ? parseFloat(updateData.minOrderAmount) : undefined,
        maxDiscountAmount: updateData.maxDiscountAmount ? parseFloat(updateData.maxDiscountAmount) : undefined,
        validFrom: updateData.validFrom ? new Date(updateData.validFrom) : undefined,
        validTo: updateData.validTo ? new Date(updateData.validTo) : undefined,
        customerSegments: updateData.customerSegments ? JSON.stringify(updateData.customerSegments) : undefined
      }
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
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (parseFloat(orderAmount) * parseFloat(coupon.value)) / 100;
      // تطبيق الحد الأقصى للخصم إذا كان موجوداً
      if (coupon.maxDiscountAmount && discountAmount > parseFloat(coupon.maxDiscountAmount)) {
        discountAmount = parseFloat(coupon.maxDiscountAmount);
      }
    } else if (coupon.type === 'FIXED' || coupon.type === 'FIXED_AMOUNT') {
      discountAmount = parseFloat(coupon.value);
    }

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value
        },
        discountAmount,
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
