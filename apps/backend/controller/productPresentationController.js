const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { sanitizeImageCollection } = require('../utils/productMediaUtils');

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0660-\u0669-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function findPresentationById(prisma, presentationId, productId) {
  return prisma.productPresentation.findFirst({
    where: { id: presentationId, productId },
  });
}

function buildPresentationResponse(presentation) {
  return {
    ...presentation,
    images: presentation.images ? JSON.parse(presentation.images) : [],
  };
}

const createPresentation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const { id } = req.params;
    const { name, slug, images, mainImage, title, description, isActive, sortOrder, metadata } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم العرض التقديمي مطلوب' });
    }

    const prisma = getSharedPrismaClient();

    const product = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true, companyId: true, slug: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const presentationSlug = slug || slugify(name);
    if (!presentationSlug) {
      return res.status(400).json({ success: false, message: 'فشل في إنشاء الرابط المختصر' });
    }

    const existingSlug = await prisma.productPresentation.findFirst({
      where: { productId: id, slug: presentationSlug },
    });
    if (existingSlug) {
      return res.status(400).json({ success: false, message: 'يوجد عرض تقديمي بنفس الرابط لهذا المنتج' });
    }

    const imagesStr = images && Array.isArray(images) ? JSON.stringify(sanitizeImageCollection(images)) : '[]';

    const presentation = await prisma.productPresentation.create({
      data: {
        productId: id,
        name: name.trim(),
        slug: presentationSlug,
        images: imagesStr,
        mainImage: mainImage || null,
        title: title || null,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        metadata: metadata || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: buildPresentationResponse(presentation),
      message: 'تم إنشاء العرض التقديمي بنجاح',
    });
  } catch (error) {
    console.error('❌ [createPresentation] Error:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
      return res.status(400).json({ success: false, message: 'يوجد عرض تقديمي بنفس الرابط لهذا المنتج' });
    }
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء العرض التقديمي' });
  }
};

const getPresentations = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const product = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const presentations = await prisma.productPresentation.findMany({
      where: { productId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({
      success: true,
      data: presentations.map(buildPresentationResponse),
      message: `تم جلب ${presentations.length} عرض تقديمي`,
    });
  } catch (error) {
    console.error('❌ [getPresentations] Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب العروض التقديمية' });
  }
};

const getSinglePresentation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const { id, presentationId } = req.params;
    const prisma = getSharedPrismaClient();

    const product = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const presentation = await findPresentationById(prisma, presentationId, id);
    if (!presentation) {
      return res.status(404).json({ success: false, message: 'العرض التقديمي غير موجود' });
    }

    return res.json({
      success: true,
      data: buildPresentationResponse(presentation),
    });
  } catch (error) {
    console.error('❌ [getSinglePresentation] Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب العرض التقديمي' });
  }
};

const updatePresentation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const { id, presentationId } = req.params;
    const { name, slug, images, mainImage, title, description, isActive, sortOrder, metadata } = req.body;

    const prisma = getSharedPrismaClient();

    const product = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const existing = await findPresentationById(prisma, presentationId, id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'العرض التقديمي غير موجود' });
    }

    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'اسم العرض التقديمي مطلوب' });
      }
      updateData.name = name.trim();
    }

    if (slug !== undefined) {
      if (!slug.trim()) {
        return res.status(400).json({ success: false, message: 'رابط العرض التقديمي مطلوب' });
      }
      const slugConflict = await prisma.productPresentation.findFirst({
        where: { productId: id, slug: slug.trim(), id: { not: presentationId } },
      });
      if (slugConflict) {
        return res.status(400).json({ success: false, message: 'يوجد عرض تقديمي بنفس الرابط لهذا المنتج' });
      }
      updateData.slug = slug.trim();
    }

    if (images !== undefined) {
      updateData.images = Array.isArray(images) ? JSON.stringify(sanitizeImageCollection(images)) : '[]';
    }

    if (mainImage !== undefined) updateData.mainImage = mainImage || null;
    if (title !== undefined) updateData.title = title || null;
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
    if (metadata !== undefined) updateData.metadata = metadata;

    const updated = await prisma.productPresentation.update({
      where: { id: presentationId },
      data: updateData,
    });

    return res.json({
      success: true,
      data: buildPresentationResponse(updated),
      message: 'تم تحديث العرض التقديمي بنجاح',
    });
  } catch (error) {
    console.error('❌ [updatePresentation] Error:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
      return res.status(400).json({ success: false, message: 'يوجد عرض تقديمي بنفس الرابط لهذا المنتج' });
    }
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث العرض التقديمي' });
  }
};

const deletePresentation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const { id, presentationId } = req.params;
    const prisma = getSharedPrismaClient();

    const product = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const existing = await findPresentationById(prisma, presentationId, id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'العرض التقديمي غير موجود' });
    }

    await prisma.productPresentation.delete({
      where: { id: presentationId },
    });

    return res.json({
      success: true,
      message: 'تم حذف العرض التقديمي بنجاح',
    });
  } catch (error) {
    console.error('❌ [deletePresentation] Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف العرض التقديمي' });
  }
};

module.exports = {
  createPresentation,
  getPresentations,
  getSinglePresentation,
  updatePresentation,
  deletePresentation,
};
