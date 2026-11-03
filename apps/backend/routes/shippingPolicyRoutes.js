const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const policyService = require('../services/shipping/policyService');

const POLICY_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'];

router.use(verifyToken.authenticateToken);

/**
 * GET /api/v1/shipping/policy
 * Returns company ShippingPolicySettings (or defaults)
 */
router.get(
  '/policy',
  verifyToken.requireRole(POLICY_ROLES),
  async (req, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'معرف الشركة غير متوفر' });
      }
      const policy = await policyService.getPolicy(companyId);
      return res.json({ success: true, data: policy });
    } catch (error) {
      console.error('[ShippingPolicyRoute] GET /policy error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب سياسة الشحن'
      });
    }
  }
);

/**
 * PUT /api/v1/shipping/policy
 * Partial update with whitelist validation
 */
router.put(
  '/policy',
  verifyToken.requireRole(POLICY_ROLES),
  async (req, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'معرف الشركة غير متوفر' });
      }
      const updated = await policyService.updatePolicy(companyId, req.body);
      return res.json({ success: true, data: updated, message: 'تم تحديث سياسة الشحن بنجاح' });
    } catch (error) {
      console.error('[ShippingPolicyRoute] PUT /policy error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء تحديث سياسة الشحن'
      });
    }
  }
);

module.exports = router;
