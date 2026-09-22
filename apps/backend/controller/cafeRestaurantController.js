const recipeService = require('../services/recipeService');
const stockAuditService = require('../services/stockAuditService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// ==========================================
// 1. RECIPE CONTROLLERS
// ==========================================

exports.listRecipes = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { page, limit, search } = req.query;
    const result = await recipeService.listRecipes(companyId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search: search || ''
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in listRecipes:', error);
    res.status(500).json({ success: false, message: error.message || 'حدث خطأ أثناء جلب معايير التصنيع' });
  }
};

exports.getRecipeByProductId = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { productId } = req.params;
    const recipe = await recipeService.getRecipeByProductId(companyId, productId);
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Error in getRecipeByProductId:', error);
    res.status(500).json({ success: false, message: error.message || 'حدث خطأ أثناء جلب الرسيبي' });
  }
};

exports.upsertRecipe = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const recipe = await recipeService.upsertRecipe(companyId, req.body);
    res.json({ success: true, data: recipe, message: 'تم حفظ معيار التصنيع (الرسيبي) بنجاح' });
  } catch (error) {
    console.error('Error in upsertRecipe:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل حفظ الرسيبي' });
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    await recipeService.deleteRecipe(companyId, id);
    res.json({ success: true, message: 'تم حذف الرسيبي بنجاح' });
  } catch (error) {
    console.error('Error in deleteRecipe:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل حذف الرسيبي' });
  }
};

// ==========================================
// 2. STOCK AUDIT CONTROLLERS
// ==========================================

exports.listAuditSessions = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { page, limit, warehouseId, status } = req.query;
    const result = await stockAuditService.listAuditSessions(companyId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      warehouseId,
      status
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in listAuditSessions:', error);
    res.status(500).json({ success: false, message: error.message || 'حدث خطأ أثناء جلب جلسات الجرد' });
  }
};

exports.getAuditSession = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const session = await stockAuditService.getAuditSessionById(companyId, id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسة الجرد غير موجودة' });
    }
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error in getAuditSession:', error);
    res.status(500).json({ success: false, message: error.message || 'حدث خطأ أثناء جلب تفاصيل الجلسة' });
  }
};

exports.startAuditSession = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { warehouseId, title, notes, categoryId } = req.body;
    const session = await stockAuditService.startAuditSession(companyId, {
      warehouseId,
      title,
      notes,
      userId,
      categoryId
    });
    res.json({ success: true, data: session, message: 'تم بدء جلسة جرد جديدة وأخذ لقطة للأرصدة بنجاح' });
  } catch (error) {
    console.error('Error in startAuditSession:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل بدء جلسة الجرد' });
  }
};

exports.updateAuditCounts = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { items, notes, isFinalSubmission } = req.body;
    const session = await stockAuditService.updateAuditCounts(companyId, id, {
      items,
      notes,
      isFinalSubmission
    });
    res.json({ success: true, data: session, message: 'تم تحديث أرقام العد الفعلي بنجاح' });
  } catch (error) {
    console.error('Error in updateAuditCounts:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل تحديث أرقام الجرد' });
  }
};

exports.approveAndReconcileAudit = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { id } = req.params;
    const session = await stockAuditService.approveAndReconcileAudit(companyId, id, userId);
    res.json({
      success: true,
      data: session,
      message: 'تم اعتماد الجرد وتسوية فوارق المخزون آلياً بنجاح'
    });
  } catch (error) {
    console.error('Error in approveAndReconcileAudit:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل اعتماد وتسوية الجرد' });
  }
};

// ==========================================
// 3. PRODUCT MODIFIER GROUPS CONTROLLERS
// ==========================================

exports.listModifierGroups = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();
    const groups = await prisma.productModifierGroup.findMany({
      where: { companyId, isActive: true },
      include: {
        options: {
          where: { isActive: true },
          include: {
            rawProduct: { select: { id: true, name: true, sku: true, stock: true } }
          },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Error in listModifierGroups:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب مجموعات التعديل' });
  }
};

exports.createModifierGroup = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();
    const { name, nameEn, selectionType, isRequired, minSelection, maxSelection, sortOrder, options = [] } = req.body;

    const group = await prisma.productModifierGroup.create({
      data: {
        companyId,
        name,
        nameEn,
        selectionType: selectionType || 'SINGLE',
        isRequired: !!isRequired,
        minSelection: minSelection || 0,
        maxSelection: maxSelection || 1,
        sortOrder: sortOrder || 0,
        options: {
          create: options.map((opt, idx) => ({
            name: opt.name,
            nameEn: opt.nameEn || null,
            additionalPrice: opt.additionalPrice || 0,
            rawProductId: opt.rawProductId || null,
            rawQuantity: opt.rawQuantity || null,
            isDefault: !!opt.isDefault,
            sortOrder: opt.sortOrder !== undefined ? opt.sortOrder : idx
          }))
        }
      },
      include: {
        options: true
      }
    });

    res.json({ success: true, data: group, message: 'تم إنشاء مجموعة التعديل بنجاح' });
  } catch (error) {
    console.error('Error in createModifierGroup:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل إنشاء مجموعة التعديل' });
  }
};

exports.updateModifierGroup = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const { name, nameEn, selectionType, isRequired, minSelection, maxSelection, sortOrder, options = [] } = req.body;

    const existing = await prisma.productModifierGroup.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'مجموعة التعديل غير موجودة' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.productModifierOption.deleteMany({
        where: { groupId: id }
      });

      return await tx.productModifierGroup.update({
        where: { id },
        data: {
          name,
          nameEn,
          selectionType,
          isRequired: !!isRequired,
          minSelection,
          maxSelection,
          sortOrder,
          options: {
            create: options.map((opt, idx) => ({
              name: opt.name,
              nameEn: opt.nameEn || null,
              additionalPrice: opt.additionalPrice || 0,
              rawProductId: opt.rawProductId || null,
              rawQuantity: opt.rawQuantity || null,
              isDefault: !!opt.isDefault,
              sortOrder: opt.sortOrder !== undefined ? opt.sortOrder : idx
            }))
          }
        },
        include: {
          options: true
        }
      });
    });

    res.json({ success: true, data: updated, message: 'تم تحديث مجموعة التعديل بنجاح' });
  } catch (error) {
    console.error('Error in updateModifierGroup:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل تحديث مجموعة التعديل' });
  }
};

exports.deleteModifierGroup = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.productModifierGroup.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'مجموعة التعديل غير موجودة' });
    }

    await prisma.productModifierGroup.delete({
      where: { id }
    });

    res.json({ success: true, message: 'تم حذف مجموعة التعديل بنجاح' });
  } catch (error) {
    console.error('Error in deleteModifierGroup:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل حذف مجموعة التعديل' });
  }
};

// ==========================================
// 4. CLOUD TABLE TABS CONTROLLERS
// ==========================================

const cafeTableService = require('../services/cafeTableService');

exports.listTableTabs = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const tabs = await cafeTableService.listActiveTabs(companyId);
    res.json({ success: true, data: tabs });
  } catch (error) {
    console.error('Error in listTableTabs:', error);
    res.status(500).json({ success: false, message: error.message || 'حدث خطأ أثناء جلب الطاولات المعلقة' });
  }
};

exports.saveTableTab = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const tab = await cafeTableService.saveOrUpdateTab({
      ...req.body,
      companyId,
      openedBy: userId
    });
    res.json({ success: true, data: tab, message: 'تم حفظ شيك الطاولة بنجاح' });
  } catch (error) {
    console.error('Error in saveTableTab:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل حفظ شيك الطاولة' });
  }
};

exports.fireTableKot = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    await cafeTableService.markKotFired(companyId, id);
    res.json({ success: true, message: 'تم إرسال تذكرة التحضير للبار والمطبخ بنجاح' });
  } catch (error) {
    console.error('Error in fireTableKot:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل إرسال تذكرة البار' });
  }
};

exports.closeTableTab = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    await cafeTableService.closeTab(companyId, id);
    res.json({ success: true, message: 'تم إغلاق شيك الطاولة بنجاح' });
  } catch (error) {
    console.error('Error in closeTableTab:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل إغلاق شيك الطاولة' });
  }
};

exports.deleteTableTab = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    await cafeTableService.deleteTab(companyId, id);
    res.json({ success: true, message: 'تم حذف شيك الطاولة بنجاح' });
  } catch (error) {
    console.error('Error in deleteTableTab:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل حذف شيك الطاولة' });
  }
};

// ==========================================
// 5. OPERATIONAL WASTE & SPOILAGE CONTROLLERS
// ==========================================

const wasteLogService = require('../services/wasteLogService');

exports.recordOperationalWaste = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const waste = await wasteLogService.recordWaste({
      ...req.body,
      companyId,
      loggedBy: userId
    });
    res.json({ success: true, data: waste, message: 'تم تسجيل الهدر التشغيلي وخصم المخزون بنجاح' });
  } catch (error) {
    console.error('Error in recordOperationalWaste:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل تسجيل الهدر' });
  }
};

exports.listOperationalWaste = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { page, limit, reason, warehouseId } = req.query;
    const result = await wasteLogService.listWasteLogs(companyId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      reason,
      warehouseId
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in listOperationalWaste:', error);
    res.status(500).json({ success: false, message: error.message || 'حدث خطأ أثناء جلب سجلات الهدر' });
  }
};

