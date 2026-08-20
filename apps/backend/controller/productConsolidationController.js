const productConsolidationService = require('../services/productConsolidationService');

const listDuplicateGroups = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const groups = await productConsolidationService.listDuplicateGroups({ companyId });
    return res.json({
      success: true,
      data: groups,
      message: `تم جلب ${groups.length} مجموعة مكررة`,
    });
  } catch (error) {
    console.error('❌ [listDuplicateGroups] Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المجموعات المكررة' });
  }
};

const consolidate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const userId = req.user?.id;
    const userName = req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.email || null;

    const { name, description, sourceProductIds, variantSelections, originalsAction, categoryId, newSlug } = req.body;

    const result = await productConsolidationService.consolidateProducts({
      companyId,
      userId,
      userName,
      name,
      description,
      sourceProductIds,
      variantSelections,
      originalsAction,
      categoryId,
      newSlug,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: `تم إنشاء المنتج "${name}" ودمج ${result.variants.length} منتج كمتغيرات بنجاح`,
    });
  } catch (error) {
    console.error('❌ [consolidate] Error:', error);
    return res.status(400).json({ success: false, message: error.message || 'حدث خطأ أثناء الدمج' });
  }
};

module.exports = {
  listDuplicateGroups,
  consolidate,
};