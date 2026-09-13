/**
 * @file adVerificationService.test.js
 * @description Unit tests for Hermes-Grade Verification Evidence Gate
 */

const adVerificationService = require('../../services/adVerificationService');

describe('AdVerificationService - Hermes Evidence Gate Test Suite', () => {
  const companyId = 'tenant_evidence_alpha_1';

  test('blocks publishing if adAccountId is missing', async () => {
    const result = await adVerificationService.verifyCampaignPublish(companyId, {
      productName: 'كوتشي Dash',
      adAccountId: '',
      dailyBudget: 500,
    });

    expect(result.verified).toBe(false);
    expect(result.blockers.some(b => b.includes('حساب إعلانات غير محدد'))).toBe(true);
    expect(result.evidence.checksum).toBeDefined();
  });

  test('blocks publishing if budget is below minimum (50 EGP)', async () => {
    const result = await adVerificationService.verifyCampaignPublish(companyId, {
      productName: 'كوتشي Dash',
      adAccountId: 'act_123456789',
      dailyBudget: 20,
    });

    expect(result.verified).toBe(false);
    expect(result.blockers.some(b => b.includes('أقل من الحد الأدنى'))).toBe(true);
  });

  test('blocks publishing if budget exceeds ceiling (50,000 EGP)', async () => {
    const result = await adVerificationService.verifyCampaignPublish(companyId, {
      productName: 'كوتشي Dash',
      adAccountId: 'act_123456789',
      dailyBudget: 150000,
    });

    expect(result.verified).toBe(false);
    expect(result.blockers.some(b => b.includes('تتجاوز سقف الأمان'))).toBe(true);
  });

  test('approves publishing with valid credentials and budget', async () => {
    const result = await adVerificationService.verifyCampaignPublish(companyId, {
      productName: 'كوتشي Dash',
      adAccountId: 'act_123456789',
      dailyBudget: 500,
      pixelId: '1989842325284174',
    });

    expect(result.verified).toBe(true);
    expect(result.blockers.length).toBe(0);
    expect(result.evidence.action).toBe('CAMPAIGN_PUBLISH');
    expect(result.evidence.checksum).toHaveLength(64); // SHA-256
  });

  test('blocks budget update with excessive jump > 300% without flag', async () => {
    const result = await adVerificationService.verifyBudgetUpdate(companyId, {
      campaignId: '120212345678',
      currentDailyBudget: 500,
      newDailyBudget: 3000, // 600% jump
      allowHighJump: false,
    });

    expect(result.verified).toBe(false);
    expect(result.blockers.some(b => b.includes('قفزة ميزانية حادة'))).toBe(true);
  });

  test('approves budget update when within ratio or with allowHighJump', async () => {
    const resultNormal = await adVerificationService.verifyBudgetUpdate(companyId, {
      campaignId: '120212345678',
      currentDailyBudget: 500,
      newDailyBudget: 750, // 150% jump (fine)
    });
    expect(resultNormal.verified).toBe(true);

    const resultHigh = await adVerificationService.verifyBudgetUpdate(companyId, {
      campaignId: '120212345678',
      currentDailyBudget: 500,
      newDailyBudget: 3000,
      allowHighJump: true,
    });
    expect(resultHigh.verified).toBe(true);
  });
});
