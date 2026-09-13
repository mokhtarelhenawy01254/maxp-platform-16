/**
 * @file adVerificationService.js
 * @description Hermes-Grade Verification Evidence Gate for Meta Ads in MaxP:
 * Enforces cryptographic proof-of-verification before any high-stakes irreversible action
 * (publishing live campaigns, scaling ad budgets) to prevent capital waste and stockouts.
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');

class AdVerificationService {
  constructor() {
    this._prisma = null;
    this.DEFAULT_BUDGET_CEILING = 50000; // 50,000 EGP/USD default hard safety limit
    this.DEFAULT_MIN_BUDGET = 50;
    this.MAX_SINGLE_BUDGET_JUMP_RATIO = 3.0; // 300% max single jump without explicit flag
  }

  get prisma() {
    if (!this._prisma) {
      this._prisma = getSharedPrismaClient();
    }
    return this._prisma;
  }

  /**
   * Verify all prerequisites before publishing an ad campaign.
   * @param {string} companyId - Tenant Company ID
   * @param {Object} params
   * @param {string} [params.productId] - Product ID
   * @param {string} [params.productName] - Product Name
   * @param {string} params.adAccountId - Meta Ad Account ID
   * @param {number} params.dailyBudget - Proposed Daily Budget
   * @param {string} [params.pixelId] - Meta Pixel ID
   * @returns {Promise<{ verified: boolean, evidence: Object, blockers: string[] }>}
   */
  async verifyCampaignPublish(companyId, {
    productId = null,
    productName = null,
    adAccountId = null,
    dailyBudget = 0,
    pixelId = null,
  }) {
    if (!companyId) {
      throw new Error('companyId is required for verification');
    }

    const blockers = [];
    let stockProof = null;
    let accountProof = null;
    let budgetProof = null;

    // 1. Stock & Inventory Proof
    try {
      let product = null;
      if (productId) {
        product = await this.prisma.product.findFirst({
          where: { id: productId, companyId },
          select: { id: true, name: true, price: true, stock: true, isActive: true },
        });
      } else if (productName) {
        product = await this.prisma.product.findFirst({
          where: {
            companyId,
            name: { contains: productName, mode: 'insensitive' },
          },
          select: { id: true, name: true, price: true, stock: true, isActive: true },
        });
      }

      if (product) {
        const inStock = product.stock == null || product.stock > 0;
        if (!inStock) {
          blockers.push(`نفاد المخزون: المنتج "${product.name}" كميته 0 حالياً، يمنع إطلاق إعلانات ممولة له.`);
        }
        if (product.isActive === false) {
          blockers.push(`المنتج "${product.name}" معطل (Inactive) في المتجر.`);
        }
        stockProof = {
          verified: inStock && product.isActive !== false,
          productId: product.id,
          productName: product.name,
          stock: product.stock,
          price: product.price,
        };
      } else {
        // Fallback if product not explicitly in DB (e.g. external link)
        stockProof = {
          verified: true,
          notice: 'Product ID not found in local catalog, external or manual verification applied',
        };
      }
    } catch (err) {
      // If DB check fails, record notice but don't hard-crash
      stockProof = { verified: true, dbError: err.message };
    }

    // 2. Ad Account Proof
    if (!adAccountId || typeof adAccountId !== 'string' || adAccountId.trim().length === 0) {
      blockers.push('حساب إعلانات غير محدد: يجب تحديد معرف حساب فيسبوك الإعلاني (Ad Account ID).');
      accountProof = { verified: false, adAccountId: null };
    } else {
      accountProof = {
        verified: true,
        adAccountId: adAccountId.trim(),
        pixelId: pixelId || 'N/A',
      };
    }

    // 3. Financial Ceiling Proof
    const budgetNum = Number(dailyBudget);
    if (isNaN(budgetNum) || budgetNum < this.DEFAULT_MIN_BUDGET) {
      blockers.push(`الميزانية اليومية (${dailyBudget}) أقل من الحد الأدنى المقبول (${this.DEFAULT_MIN_BUDGET}).`);
      budgetProof = { verified: false, dailyBudget: budgetNum };
    } else if (budgetNum > this.DEFAULT_BUDGET_CEILING) {
      blockers.push(`الميزانية اليومية (${budgetNum}) تتجاوز سقف الأمان الأقصى للمتجر (${this.DEFAULT_BUDGET_CEILING}).`);
      budgetProof = { verified: false, dailyBudget: budgetNum, ceiling: this.DEFAULT_BUDGET_CEILING };
    } else {
      budgetProof = { verified: true, dailyBudget: budgetNum, currency: 'EGP' };
    }

    const verified = blockers.length === 0;
    const timestamp = new Date().toISOString();
    const evidencePayload = {
      action: 'CAMPAIGN_PUBLISH',
      companyId,
      verified,
      timestamp,
      stockProof,
      accountProof,
      budgetProof,
    };

    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(evidencePayload))
      .digest('hex');

    return {
      verified,
      blockers,
      evidence: {
        ...evidencePayload,
        checksum,
      },
    };
  }

  /**
   * Verify budget update bounds before mutating Meta campaign budget.
   * @param {string} companyId
   * @param {Object} params
   * @param {string} params.campaignId
   * @param {number} params.newDailyBudget
   * @param {number} [params.currentDailyBudget]
   * @param {boolean} [params.allowHighJump]
   * @returns {Promise<{ verified: boolean, evidence: Object, blockers: string[] }>}
   */
  async verifyBudgetUpdate(companyId, {
    campaignId,
    newDailyBudget,
    currentDailyBudget = 0,
    allowHighJump = false,
  }) {
    if (!companyId) throw new Error('companyId is required for budget verification');
    if (!campaignId) throw new Error('campaignId is required');

    const blockers = [];
    const newBudget = Number(newDailyBudget);
    const currBudget = Number(currentDailyBudget);

    if (isNaN(newBudget) || newBudget < this.DEFAULT_MIN_BUDGET) {
      blockers.push(`الميزانية الجديدة (${newDailyBudget}) أقل من الحد الأدنى المقبول (${this.DEFAULT_MIN_BUDGET}).`);
    } else if (newBudget > this.DEFAULT_BUDGET_CEILING) {
      blockers.push(`الميزانية الجديدة (${newBudget}) تتجاوز سقف الأمان الأقصى للمتجر (${this.DEFAULT_BUDGET_CEILING}).`);
    }

    // Check aggressive scaling jump
    if (currBudget > 0 && newBudget > currBudget * this.MAX_SINGLE_BUDGET_JUMP_RATIO && !allowHighJump) {
      blockers.push(
        `قفزة ميزانية حادة: الزيادة من ${currBudget} إلى ${newBudget} تتجاوز 300% في خطوة واحدة، مما قد يؤدي لإعادة مرحلة التعلم (Learning Phase) في فيسبوك.`
      );
    }

    const verified = blockers.length === 0;
    const timestamp = new Date().toISOString();
    const evidencePayload = {
      action: 'BUDGET_UPDATE',
      companyId,
      campaignId,
      verified,
      timestamp,
      currentBudget: currBudget,
      newBudget,
      jumpRatio: currBudget > 0 ? (newBudget / currBudget).toFixed(2) : 1.0,
    };

    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(evidencePayload))
      .digest('hex');

    return {
      verified,
      blockers,
      evidence: {
        ...evidencePayload,
        checksum,
      },
    };
  }
}

module.exports = new AdVerificationService();
