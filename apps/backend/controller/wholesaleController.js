const { wholesaleService } = require('../services/wholesaleService');

const wholesaleController = {
  // Price Lists
  async listPriceLists(req, res) {
    try {
      const result = await wholesaleService.listPriceLists({ companyId: req.user.companyId, ...req.query });
      res.json({ success: true, ...result });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async getPriceList(req, res) {
    try {
      const data = await wholesaleService.getPriceList(req.params.id, req.user.companyId);
      if (!data) return res.status(404).json({ success: false, error: 'Price list not found' });
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async createPriceList(req, res) {
    try {
      const data = await wholesaleService.createPriceList({ ...req.body, companyId: req.user.companyId }, req.user.id);
      res.status(201).json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async updatePriceList(req, res) {
    try {
      await wholesaleService.updatePriceList(req.params.id, req.user.companyId, req.body);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async deletePriceList(req, res) {
    try {
      await wholesaleService.deletePriceList(req.params.id, req.user.companyId);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },

  // Price List Items
  async addPriceListItem(req, res) {
    try {
      const data = await wholesaleService.addPriceListItem(req.params.id, req.user.companyId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async removePriceListItem(req, res) {
    try {
      await wholesaleService.removePriceListItem(req.params.itemId, req.user.companyId);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },

  // Wholesale Customers
  async listWholesaleCustomers(req, res) {
    try {
      const result = await wholesaleService.listWholesaleCustomers({ companyId: req.user.companyId, ...req.query });
      res.json({ success: true, ...result });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async getWholesaleCustomer(req, res) {
    try {
      const data = await wholesaleService.getWholesaleCustomer(req.params.id, req.user.companyId);
      if (!data) return res.status(404).json({ success: false, error: 'Wholesale customer not found' });
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async createWholesaleCustomer(req, res) {
    try {
      const data = await wholesaleService.createWholesaleCustomer({ ...req.body, companyId: req.user.companyId });
      res.status(201).json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async updateWholesaleCustomer(req, res) {
    try {
      await wholesaleService.updateWholesaleCustomer(req.params.id, req.user.companyId, req.body);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },

  // Price List Assignment
  async assignPriceList(req, res) {
    try {
      const data = await wholesaleService.assignPriceListToCustomer(req.body.customerId, req.body.priceListId, req.user.companyId);
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async removePriceListAssignment(req, res) {
    try {
      await wholesaleService.removePriceListFromCustomer(req.params.customerId, req.params.priceListId);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },

  // Transactions
  async recordTransaction(req, res) {
    try {
      const data = await wholesaleService.recordTransaction({ ...req.body, companyId: req.user.companyId });
      res.status(201).json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
  async getTransactions(req, res) {
    try {
      const prisma = require('../services/sharedDatabase').getSharedPrismaClient();
      const data = await prisma.wholesaleTransaction.findMany({
        where: { wholesaleCustomerId: req.params.customerId, companyId: req.user.companyId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(req.query.limit) || 50,
      });
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },

  // Statement
  async generateStatement(req, res) {
    try {
      const data = await wholesaleService.generateStatement(req.params.customerId, req.user.companyId, req.query.periodStart, req.query.periodEnd);
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },

  // Dashboard
  async dashboard(req, res) {
    try {
      const data = await wholesaleService.dashboard(req.user.companyId);
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },

  // Reports
  async debtAgingReport(req, res) {
    try {
      const data = await wholesaleService.debtAgingReport(req.user.companyId);
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  },
};

module.exports = wholesaleController;
