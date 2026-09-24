// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  captureStorefrontAttribution,
  clearStoredStorefrontAttribution,
  getOrderAttributionPayload,
  getStoredStorefrontAttribution,
} from '../utils/orderAttribution';

describe('orderAttribution multi-tenant isolation', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('captures and isolates ad attribution per tenant companyId', () => {
    // 1. Visit Store A with Meta ad parameters
    window.history.replaceState(
      {},
      '',
      '/?utm_source=facebook&utm_medium=paid&utm_campaign=store_a_sale&fbclid=fb_click_aaa',
    );
    const storeAAttr = captureStorefrontAttribution('company-A');
    expect(storeAAttr?.source).toBe('facebook');
    expect(storeAAttr?.campaignName).toBe('store_a_sale');
    expect(storeAAttr?.fbclid).toBe('fb_click_aaa');

    // 2. Visit Store B on same domain/origin with different campaign
    window.history.replaceState(
      {},
      '',
      '/?utm_source=tiktok&utm_medium=cpc&utm_campaign=store_b_promo&ttclid=tt_click_bbb',
    );
    const storeBAttr = captureStorefrontAttribution('company-B');
    expect(storeBAttr?.source).toBe('tiktok');
    expect(storeBAttr?.campaignName).toBe('store_b_promo');
    expect(storeBAttr?.ttclid).toBe('tt_click_bbb');

    // 3. Verify getOrderAttributionPayload strictly separates Company A and Company B
    const payloadA = getOrderAttributionPayload('company-A');
    expect(payloadA?.source).toBe('facebook');
    expect(payloadA?.campaignName).toBe('store_a_sale');

    const payloadB = getOrderAttributionPayload('company-B');
    expect(payloadB?.source).toBe('tiktok');
    expect(payloadB?.campaignName).toBe('store_b_promo');

    // 4. Clearing Store A attribution leaves Store B intact
    clearStoredStorefrontAttribution('company-A');
    expect(getStoredStorefrontAttribution('company-A')).toBeNull();
    expect(getStoredStorefrontAttribution('company-B')?.campaignName).toBe('store_b_promo');
  });
});
