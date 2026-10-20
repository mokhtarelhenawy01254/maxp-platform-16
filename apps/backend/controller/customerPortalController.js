/**
 * Customer Portal Controller (Wave 8)
 *
 * Handles public client-facing requests to /api/v1/customer-portal/*
 * Authenticated purely via high-entropy query/header token.
 */

const CustomerPortalService = require('../services/customerPortalService');

class CustomerPortalController {
  static extractToken(req) {
    let token =
      req.query.token ||
      req.headers['x-customer-portal-token'] ||
      req.headers['x-portal-token'] ||
      req.headers['x-access-token'];

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    return String(token || '').trim();
  }

  /**
   * GET /api/v1/customer-portal/context?token=
   */
  static async getContext(req, res) {
    try {
      const token = CustomerPortalController.extractToken(req);
      if (!token) {
        return res.status(403).json({
          success: false,
          error: 'رمز الدخول لبوابة العميل مطلوب',
        });
      }

      const data = await CustomerPortalService.getContext(token);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 403).json({
        success: false,
        error: err.message || 'رابط البوابة غير صالح أو انتهت صلاحيته',
      });
    }
  }

  /**
   * GET /api/v1/customer-portal/order?token=
   */
  static async getOrder(req, res) {
    try {
      const token = CustomerPortalController.extractToken(req);
      if (!token) {
        return res.status(403).json({
          success: false,
          error: 'رمز الدخول لبوابة العميل مطلوب',
        });
      }

      const data = await CustomerPortalService.getOrderDetails(token);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 403).json({
        success: false,
        error: err.message || 'رابط البوابة غير صالح أو انتهت صلاحيته',
      });
    }
  }
}

module.exports = CustomerPortalController;
