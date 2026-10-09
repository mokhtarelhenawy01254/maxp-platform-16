import { describe, it, expect } from 'vitest';
import {
  getPostPurchaseOfferConfig,
  resolvePostPurchaseTarget
} from '../utils/postPurchaseOffer';

describe('postPurchaseOffer helper', () => {
  describe('getPostPurchaseOfferConfig', () => {
    it('returns null when settings is null or undefined', () => {
      expect(getPostPurchaseOfferConfig(null)).toBeNull();
      expect(getPostPurchaseOfferConfig(undefined)).toBeNull();
    });

    it('extracts config from storefront.designTokens.postPurchaseOffer (live payload path)', () => {
      const settings = {
        storefront: {
          designTokens: {
            postPurchaseOffer: {
              enabled: true,
              productId: 'prod_aura_123',
              triggerCondition: 'all'
            }
          }
        }
      };
      const cfg = getPostPurchaseOfferConfig(settings);
      expect(cfg).not.toBeNull();
      expect(cfg?.enabled).toBe(true);
      expect(cfg?.productId).toBe('prod_aura_123');
    });

    it('extracts config from storefrontSettings.designTokens.postPurchaseOffer', () => {
      const settings = {
        storefrontSettings: {
          designTokens: {
            postPurchaseOffer: {
              enabled: true,
              productId: 'prod_dash_456',
              triggerCondition: 'specific_products'
            }
          }
        }
      };
      const cfg = getPostPurchaseOfferConfig(settings);
      expect(cfg).not.toBeNull();
      expect(cfg?.enabled).toBe(true);
      expect(cfg?.productId).toBe('prod_dash_456');
    });

    it('extracts config from fallback designTokens.postPurchaseOffer', () => {
      const settings = {
        designTokens: {
          postPurchaseOffer: {
            enabled: true,
            productId: 'prod_fallback_789'
          }
        }
      };
      const cfg = getPostPurchaseOfferConfig(settings);
      expect(cfg).not.toBeNull();
      expect(cfg?.productId).toBe('prod_fallback_789');
    });

    it('returns null when postPurchaseOffer is missing from all token locations', () => {
      const settings = {
        storefront: { designTokens: {} },
        storefrontSettings: { designTokens: {} }
      };
      expect(getPostPurchaseOfferConfig(settings)).toBeNull();
    });
  });

  describe('resolvePostPurchaseTarget', () => {
    it('returns /thank-you if offer is disabled', () => {
      const settings = {
        storefront: {
          designTokens: {
            postPurchaseOffer: {
              enabled: false,
              productId: 'prod_123'
            }
          }
        }
      };
      expect(resolvePostPurchaseTarget(settings)).toBe('/thank-you');
    });

    it('returns /thank-you if offer has no productId', () => {
      const settings = {
        storefront: {
          designTokens: {
            postPurchaseOffer: {
              enabled: true,
              productId: ''
            }
          }
        }
      };
      expect(resolvePostPurchaseTarget(settings)).toBe('/thank-you');
    });

    it('returns /order-offer when enabled for all products', () => {
      const settings = {
        storefront: {
          designTokens: {
            postPurchaseOffer: {
              enabled: true,
              productId: 'prod_aura_123',
              triggerCondition: 'all'
            }
          }
        }
      };
      expect(resolvePostPurchaseTarget(settings)).toBe('/order-offer');
      expect(resolvePostPurchaseTarget(settings, [{ productId: 'any_prod' }])).toBe('/order-offer');
    });

    it('returns /thank-you if triggerCondition is specific_products but trigger list is empty', () => {
      const settings = {
        storefront: {
          designTokens: {
            postPurchaseOffer: {
              enabled: true,
              productId: 'prod_aura_123',
              triggerCondition: 'specific_products',
              triggerProductIds: []
            }
          }
        }
      };
      expect(resolvePostPurchaseTarget(settings, [{ productId: 'any_prod' }])).toBe('/thank-you');
    });

    it('returns /order-offer when orderedItems contains a matching triggerProductId', () => {
      const settings = {
        storefront: {
          designTokens: {
            postPurchaseOffer: {
              enabled: true,
              productId: 'prod_aura_123',
              triggerCondition: 'specific_products',
              triggerProductIds: ['prod_dash_1', 'prod_dash_2']
            }
          }
        }
      };
      const items = [{ productId: 'other_prod' }, { productId: 'prod_dash_2' }];
      expect(resolvePostPurchaseTarget(settings, items)).toBe('/order-offer');
    });

    it('returns /thank-you when orderedItems contains NO matching triggerProductIds', () => {
      const settings = {
        storefront: {
          designTokens: {
            postPurchaseOffer: {
              enabled: true,
              productId: 'prod_aura_123',
              triggerCondition: 'specific_products',
              triggerProductIds: ['prod_dash_1']
            }
          }
        }
      };
      const items = [{ productId: 'unrelated_prod' }];
      expect(resolvePostPurchaseTarget(settings, items)).toBe('/thank-you');
      expect(resolvePostPurchaseTarget(settings, [])).toBe('/thank-you');
      expect(resolvePostPurchaseTarget(settings, null)).toBe('/thank-you');
    });
  });
});
