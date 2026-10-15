/**
 * Accounting Module Controller
 * Handles HTTP requests for Chart of Accounts, Journal Entries, Fiscal Periods, Settings, and Reports.
 */

const AccountingService = require('../services/accountingService');

class AccountingController {
  // ==========================================================================
  // Accounts
  // ==========================================================================

  static async listAccounts(req, res) {
    try {
      const { companyId } = req.user;
      const accounts = await AccountingService.listAccounts(companyId, req.query);
      res.json({ success: true, data: accounts });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getAccountTree(req, res) {
    try {
      const { companyId } = req.user;
      const tree = await AccountingService.getAccountTree(companyId);
      res.json({ success: true, data: tree });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getAccountById(req, res) {
    try {
      const { companyId } = req.user;
      const account = await AccountingService.getAccountById(companyId, req.params.id);
      res.json({ success: true, data: account });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async createAccount(req, res) {
    try {
      const { companyId } = req.user;
      const account = await AccountingService.createAccount(companyId, req.body);
      res.status(201).json({ success: true, data: account, message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateAccount(req, res) {
    try {
      const { companyId } = req.user;
      const account = await AccountingService.updateAccount(companyId, req.params.id, req.body);
      res.json({ success: true, data: account, message: 'تم تحديث الحساب بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async deleteAccount(req, res) {
    try {
      const { companyId } = req.user;
      await AccountingService.deleteAccount(companyId, req.params.id);
      res.json({ success: true, message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Entries
  // ==========================================================================

  static async listEntries(req, res) {
    try {
      const { companyId } = req.user;
      const result = await AccountingService.listEntries(companyId, req.query);
      res.json({ success: true, data: result.entries, pagination: result.pagination });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getEntryById(req, res) {
    try {
      const { companyId } = req.user;
      const entry = await AccountingService.getEntryById(companyId, req.params.id);
      res.json({ success: true, data: entry });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async createEntry(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const entry = await AccountingService.createEntry(companyId, req.body, userId);
      res.status(201).json({
        success: true,
        data: entry,
        message: entry.status === 'POSTED' ? 'تم ترحيل قيد اليومية بنجاح' : 'تم حفظ مسودة قيد اليومية بنجاح',
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateEntry(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const entry = await AccountingService.updateEntry(companyId, req.params.id, req.body, userId);
      res.json({ success: true, data: entry, message: 'تم تحديث مسودة القيد بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async postEntry(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const entry = await AccountingService.postEntry(companyId, req.params.id, userId);
      res.json({ success: true, data: entry, message: 'تم ترحيل القيد بنجاح إلى الأستاذ العام' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async voidEntry(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const { reason } = req.body || {};
      const result = await AccountingService.voidEntry(companyId, req.params.id, userId, reason);
      res.json({
        success: true,
        data: result,
        message: 'تم إلغاء القيد وإنشاء قيد عكسي آلي بنجاح',
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Periods
  // ==========================================================================

  static async listPeriods(req, res) {
    try {
      const { companyId } = req.user;
      const periods = await AccountingService.listPeriods(companyId, req.query.year);
      res.json({ success: true, data: periods });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async openPeriod(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const { year, month } = req.body;
      if (!year || !month) {
        return res.status(400).json({ success: false, message: 'يجب تحديد السنة والشهر' });
      }
      const period = await AccountingService.openPeriod(companyId, year, month, userId);
      res.json({ success: true, data: period, message: `تم فتح الفترة المالية ${month}/${year} بنجاح` });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async closePeriod(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const { year, month } = req.body;
      if (!year || !month) {
        return res.status(400).json({ success: false, message: 'يجب تحديد السنة والشهر' });
      }
      const period = await AccountingService.closePeriod(companyId, year, month, userId);
      res.json({ success: true, data: period, message: `تم إقفال الفترة المالية ${month}/${year} بنجاح` });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Settings & Seed
  // ==========================================================================

  static async getSettings(req, res) {
    try {
      const { companyId } = req.user;
      const settings = await AccountingService.getSettings(companyId);
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async updateSettings(req, res) {
    try {
      const { companyId } = req.user;
      const settings = await AccountingService.updateSettings(companyId, req.body);
      res.json({ success: true, data: settings, message: 'تم حفظ إعدادات المحاسبة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async seedEgyptianCOA(req, res) {
    try {
      const { companyId } = req.user;
      const result = await AccountingService.seedEgyptianCOA(companyId);
      res.json({ success: true, data: result, message: result.message });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async createOpeningBalance(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const entry = await AccountingService.createOpeningBalance(companyId, req.body, userId);
      res.status(201).json({
        success: true,
        data: entry,
        message: 'تم ترحيل قيد الأرصدة الافتتاحية بنجاح',
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Reports
  // ==========================================================================

  static async getTrialBalance(req, res) {
    try {
      const { companyId } = req.user;
      const report = await AccountingService.getTrialBalance(companyId, req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getGeneralLedger(req, res) {
    try {
      const { companyId } = req.user;
      const report = await AccountingService.getGeneralLedger(companyId, req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getStatement(req, res) {
    try {
      const { companyId } = req.user;
      const query = {
        accountId: req.query.accountId,
        startDate: req.query.from || req.query.startDate,
        endDate: req.query.to || req.query.endDate,
      };
      const report = await AccountingService.getGeneralLedger(companyId, query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getProfitAndLoss(req, res) {
    try {
      const { companyId } = req.user;
      const report = await AccountingService.getProfitAndLoss(companyId, req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getBalanceSheet(req, res) {
    try {
      const { companyId } = req.user;
      const report = await AccountingService.getBalanceSheet(companyId, req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getVatReport(req, res) {
    try {
      const { companyId } = req.user;
      const report = await AccountingService.getVatReport(companyId, req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // 7. Auto-Posting Unposted Queue
  // ==========================================================================

  static async listUnpostedQueue(req, res) {
    try {
      const { companyId } = req.user;
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      const items = await AccountingAutoPostingService.listUnpostedQueue(companyId, req.query);
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async retryUnpostedEntry(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      const result = await AccountingAutoPostingService.retryUnpostedEntry(companyId, req.params.id, { userId });
      res.json({ success: true, data: result, message: 'تم إعادة معالجة القيد المعلق بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async retryAllUnposted(req, res) {
    try {
      const { companyId, id: userId } = req.user;
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      const result = await AccountingAutoPostingService.retryAllPending(companyId, { userId });
      res.json({ success: true, data: result, message: `تمت معالجة ${result.processed} من إجمالي ${result.total} قيد معلق` });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AccountingController;
