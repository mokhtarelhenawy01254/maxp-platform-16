const { getSharedPrismaClient } = require('../services/sharedDatabase');

const sanitizePackages = (packages) => {
  if (packages === undefined || packages === null || packages === '') return undefined;
  if (typeof packages === 'string') {
    try { packages = JSON.parse(packages); } catch { throw new Error('صيغة الباقات غير صحيحة'); }
  }
  if (!Array.isArray(packages)) throw new Error('الباقات يجب أن تكون مصفوفة');
  return packages.map(p => {
    const count = Math.max(1, Math.min(1000, Math.floor(Number(p?.count) || 1)));
    const price = Math.max(0, Math.min(100000000, Number(p?.price) || 0));
    const originalPrice = p?.originalPrice != null && p.originalPrice !== '' ? Math.max(0, Number(p.originalPrice)) : undefined;
    return { count, price, ...(originalPrice !== undefined ? { originalPrice } : {}) };
  });
};

const getAllServices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const services = await getSharedPrismaClient().bookingService.findMany({
      where: { companyId },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
        },
        doctorServices: {
          include: { doctor: { select: { id: true, name: true, title: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });
    const data = services.map(s => ({
      ...s,
      branchServices: s.branchServices.map(bs => ({
        ...bs,
        packages: typeof bs.packages === 'string' ? (() => { try { return JSON.parse(bs.packages); } catch { return bs.packages; } })() : bs.packages
      }))
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الخدمات' });
  }
};

const createService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let { name, description, requiresConsultation, durationMinutes, basePrice, imageUrl, categoryId, branches, doctorIds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الخدمة مطلوب' });

    const prisma = getSharedPrismaClient();
    if (categoryId) {
      const category = await prisma.bookingServiceCategory.findFirst({ where: { id: categoryId, companyId }, select: { id: true } });
      if (!category) return res.status(400).json({ success: false, error: 'القسم غير موجود' });
    }
    if (Array.isArray(branches) && branches.length > 0) {
      const branchIds = branches.map((b) => b.branchId || b);
      const found = await prisma.bookingBranch.count({ where: { companyId, id: { in: branchIds } } });
      if (found !== branchIds.length) return res.status(400).json({ success: false, error: 'أحد الفروع غير موجود' });
    }
    if (Array.isArray(doctorIds) && doctorIds.length > 0) {
      const doctorIdList = doctorIds.map((d) => (typeof d === 'string' ? d : d.doctorId));
      const found = await prisma.bookingDoctor.count({ where: { companyId, id: { in: doctorIdList } } });
      if (found !== doctorIdList.length) return res.status(400).json({ success: false, error: 'أحد الأطباء غير موجود' });
    }

    const service = await prisma.bookingService.create({
      data: {
        companyId,
        name: name.trim(),
        description,
        requiresConsultation: requiresConsultation !== false,
        durationMinutes: durationMinutes && durationMinutes > 0 ? durationMinutes : 30,
        basePrice: basePrice !== undefined && basePrice !== null && basePrice !== '' ? Number(basePrice) : undefined,
        imageUrl,
        categoryId: categoryId || undefined,
        branchServices: Array.isArray(branches) && branches.length > 0 ? {
          create: branches.map((b) => ({
            branchId: b.branchId || b,
            hasPackages: b.hasPackages !== false,
            packages: sanitizePackages(b.packages),
            isActive: b.isActive !== false
          }))
        } : undefined,
        doctorServices: Array.isArray(doctorIds) && doctorIds.length > 0 ? {
          create: doctorIds.map((d) => {
            const did = typeof d === 'string' ? d : d.doctorId;
            const fee = typeof d === 'object' && d.fee ? Number(d.fee) : undefined;
            return {
              companyId,
              doctorId: did,
              ...(fee !== undefined ? { fee } : {}),
              isActive: true
            };
          })
        } : undefined
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
        },
        doctorServices: {
          include: { doctor: { select: { id: true, name: true, title: true } } }
        }
      }
    });
    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الخدمة' });
  }
};

const updateService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    let { name, description, requiresConsultation, isActive, durationMinutes, basePrice, imageUrl, categoryId, doctorIds } = req.body;

    const existing = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const prisma = getSharedPrismaClient();
    if (categoryId !== undefined && categoryId) {
      const category = await prisma.bookingServiceCategory.findFirst({ where: { id: categoryId, companyId }, select: { id: true } });
      if (!category) return res.status(400).json({ success: false, error: 'القسم غير موجود' });
    }
    if (Array.isArray(doctorIds) && doctorIds.length > 0) {
      const doctorIdList = doctorIds.map((d) => (typeof d === 'string' ? d : d.doctorId));
      const found = await prisma.bookingDoctor.count({ where: { companyId, id: { in: doctorIdList } } });
      if (found !== doctorIdList.length) return res.status(400).json({ success: false, error: 'أحد الأطباء غير موجود' });
    }

    const data = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(requiresConsultation !== undefined ? { requiresConsultation } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(durationMinutes !== undefined ? { durationMinutes: durationMinutes > 0 ? durationMinutes : 30 } : {}),
      ...(basePrice !== undefined && basePrice !== null && basePrice !== '' ? { basePrice: Number(basePrice) } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
    };

    const service = await getSharedPrismaClient().bookingService.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
        },
        doctorServices: {
          include: { doctor: { select: { id: true, name: true, title: true } } }
        }
      }
    });

    // Replace doctor-service links when doctorIds is provided
    if (Array.isArray(doctorIds)) {
      await getSharedPrismaClient().bookingDoctorService.deleteMany({ where: { serviceId: id, companyId } });
      if (doctorIds.length > 0) {
        await getSharedPrismaClient().bookingDoctorService.createMany({
          data: doctorIds.map((d) => {
            const did = typeof d === 'string' ? d : d.doctorId;
            const fee = typeof d === 'object' && d.fee ? Number(d.fee) : undefined;
            return {
              companyId,
              serviceId: id,
              doctorId: did,
              ...(fee !== undefined ? { fee } : {}),
              isActive: true
            };
          })
        });
      }
    }

    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الخدمة' });
  }
};

const deleteService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    await getSharedPrismaClient().bookingService.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الخدمة' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الخدمة' });
  }
};

const cloneService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name: newName, branchId } = req.body;

    const source = await getSharedPrismaClient().bookingService.findFirst({
      where: { id, companyId },
      include: { branchServices: true }
    });
    if (!source) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const clone = await getSharedPrismaClient().bookingService.create({
      data: {
        companyId,
        name: (newName || source.name + ' (نسخة)').trim(),
        description: source.description,
        requiresConsultation: source.requiresConsultation,
        durationMinutes: source.durationMinutes,
        basePrice: source.basePrice,
        imageUrl: source.imageUrl,
        categoryId: source.categoryId,
        branchServices: {
          create: source.branchServices
            .filter(bs => !branchId || bs.branchId === branchId)
            .map(bs => ({
              branchId: branchId || bs.branchId,
              hasPackages: bs.hasPackages,
              packages: bs.packages,
              isActive: bs.isActive
            }))
        }
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
        },
        doctorServices: {
          include: { doctor: { select: { id: true, name: true, title: true } } }
        }
      }
    });
    res.json({ success: true, data: clone });
  } catch (error) {
    console.error('Error cloning service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في استنساخ الخدمة' });
  }
};

const getServiceBranches = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const service = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const branches = await getSharedPrismaClient().bookingBranchService.findMany({
      where: { serviceId: id },
      include: { branch: { select: { id: true, name: true } } }
    });
    const data = branches.map(b => ({
      ...b,
      packages: typeof b.packages === 'string' ? (() => { try { return JSON.parse(b.packages); } catch { return b.packages; } })() : b.packages
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching service branches:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب فروع الخدمة' });
  }
};

const addServiceBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    let { branchId, hasPackages, packages, isActive } = req.body;
    if (!branchId) return res.status(400).json({ success: false, error: 'الفرع مطلوب' });

    const service = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const branch = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id: branchId, companyId } });
    if (!branch) return res.status(400).json({ success: false, error: 'الفرع غير موجود' });

    if (typeof packages === 'string') { try { packages = JSON.parse(packages); } catch {} }

    const branchService = await getSharedPrismaClient().bookingBranchService.upsert({
      where: { serviceId_branchId: { serviceId: id, branchId } },
      update: { hasPackages: hasPackages !== false, packages: sanitizePackages(packages), isActive: isActive !== false },
      create: { serviceId: id, branchId, hasPackages: hasPackages !== false, packages: sanitizePackages(packages), isActive: isActive !== false }
    });
    res.json({ success: true, data: branchService });
  } catch (error) {
    console.error('Error adding service branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الفرع للخدمة' });
  }
};

const updateServiceBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, branchId } = req.params;
    let { hasPackages, packages, isActive } = req.body;

    const existing = await getSharedPrismaClient().bookingBranchService.findFirst({
      where: { serviceId: id, branchId },
      include: { service: { select: { companyId: true } } }
    });
    if (!existing || existing.service.companyId !== companyId) {
      return res.status(404).json({ success: false, error: 'الخدمة غير موجودة في هذا الفرع' });
    }

    if (typeof packages === 'string') { try { packages = JSON.parse(packages); } catch {} }

    const branchService = await getSharedPrismaClient().bookingBranchService.update({
      where: { serviceId_branchId: { serviceId: id, branchId } },
      data: { hasPackages, packages: sanitizePackages(packages), isActive }
    });
    res.json({ success: true, data: branchService });
  } catch (error) {
    console.error('Error updating service branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفرع' });
  }
};

const removeServiceBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, branchId } = req.params;
    const existing = await getSharedPrismaClient().bookingBranchService.findFirst({
      where: { serviceId: id, branchId },
      include: { service: { select: { companyId: true } } }
    });
    if (!existing || existing.service.companyId !== companyId) {
      return res.status(404).json({ success: false, error: 'الخدمة غير موجودة في هذا الفرع' });
    }

    await getSharedPrismaClient().bookingBranchService.delete({
      where: { serviceId_branchId: { serviceId: id, branchId } }
    });
    res.json({ success: true, message: 'تم إزالة الخدمة من الفرع' });
  } catch (error) {
    console.error('Error removing service branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة الخدمة من الفرع' });
  }
};

const toggleService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const service = await getSharedPrismaClient().bookingService.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: { branchServices: { include: { branch: { select: { id: true, name: true } } } } }
    });
    res.json({ success: true, data: service, message: existing.isActive ? 'تم إيقاف الخدمة' : 'تم تفعيل الخدمة' });
  } catch (error) {
    console.error('Error toggling service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تبديل حالة الخدمة' });
  }
};

// ── Service Categories (departments) ─────────────────────────────────────

const getServiceCategories = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const categories = await getSharedPrismaClient().bookingServiceCategory.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أقسام الخدمات' });
  }
};

const createServiceCategory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, color, icon, sortOrder } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم القسم مطلوب' });

    const category = await getSharedPrismaClient().bookingServiceCategory.create({
      data: { companyId, name: name.trim(), color, icon, sortOrder: sortOrder || 0 }
    });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating service category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء القسم' });
  }
};

const updateServiceCategory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingServiceCategory.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'القسم غير موجود' });

    const { name, color, icon, sortOrder, isActive } = req.body;
    const category = await getSharedPrismaClient().bookingServiceCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(isActive !== undefined ? { isActive } : {})
      }
    });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating service category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث القسم' });
  }
};

const deleteServiceCategory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingServiceCategory.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'القسم غير موجود' });

    await getSharedPrismaClient().bookingServiceCategory.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف القسم' });
  } catch (error) {
    console.error('Error deleting service category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف القسم' });
  }
};

// ── Doctor-Service links ──────────────────────────────────────────────────

const getServiceDoctors = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const service = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const links = await getSharedPrismaClient().bookingDoctorService.findMany({
      where: { serviceId: id, companyId },
      include: { doctor: { select: { id: true, name: true, title: true, specialty: true } } }
    });
    res.json({ success: true, data: links });
  } catch (error) {
    console.error('Error fetching service doctors:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أطباء الخدمة' });
  }
};

const addServiceDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { doctorId, fee } = req.body;
    if (!doctorId) return res.status(400).json({ success: false, error: 'الطبيب مطلوب' });

    const service = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const doctor = await getSharedPrismaClient().bookingDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(400).json({ success: false, error: 'الطبيب غير موجود' });

    const link = await getSharedPrismaClient().bookingDoctorService.upsert({
      where: { doctorId_serviceId: { doctorId, serviceId: id } },
      update: { fee: fee !== undefined ? Number(fee) : null, isActive: true },
      create: { companyId, serviceId: id, doctorId, fee: fee !== undefined ? Number(fee) : undefined, isActive: true }
    });
    res.json({ success: true, data: link });
  } catch (error) {
    console.error('Error adding service doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الطبيب للخدمة' });
  }
};

const removeServiceDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, doctorId } = req.params;
    await getSharedPrismaClient().bookingDoctorService.deleteMany({ where: { serviceId: id, doctorId, companyId } });
    res.json({ success: true, message: 'تم إزالة الطبيب من الخدمة' });
  } catch (error) {
    console.error('Error removing service doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة الطبيب من الخدمة' });
  }
};

module.exports = {
  getAllServices, createService, updateService, deleteService,
  cloneService, getServiceBranches, addServiceBranch, updateServiceBranch, removeServiceBranch,
  toggleService,
  getServiceCategories, createServiceCategory, updateServiceCategory, deleteServiceCategory,
  getServiceDoctors, addServiceDoctor, removeServiceDoctor
};
