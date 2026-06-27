const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllServices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const services = await getSharedPrismaClient().bookingService.findMany({
      where: { companyId },
      include: {
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
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

    let { name, description, requiresConsultation, branches } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الخدمة مطلوب' });

    const service = await getSharedPrismaClient().bookingService.create({
      data: {
        companyId,
        name: name.trim(),
        description,
        requiresConsultation: requiresConsultation !== false,
        branchServices: Array.isArray(branches) && branches.length > 0 ? {
          create: branches.map((b: any) => ({
            branchId: b.branchId,
            hasPackages: b.hasPackages !== false,
            packages: b.packages || undefined,
            isActive: b.isActive !== false
          }))
        } : undefined
      },
      include: {
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
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
    let { name, description, requiresConsultation, isActive } = req.body;

    const existing = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const service = await getSharedPrismaClient().bookingService.update({
      where: { id },
      data: { name, description, requiresConsultation, isActive },
      include: {
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
        }
      }
    });
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
        branchServices: {
          include: { branch: { select: { id: true, name: true } } }
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
      update: { hasPackages: hasPackages !== false, packages, isActive: isActive !== false },
      create: { serviceId: id, branchId, hasPackages: hasPackages !== false, packages, isActive: isActive !== false }
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
      data: { hasPackages, packages, isActive }
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

module.exports = {
  getAllServices, createService, updateService, deleteService,
  cloneService, getServiceBranches, addServiceBranch, updateServiceBranch, removeServiceBranch
};
