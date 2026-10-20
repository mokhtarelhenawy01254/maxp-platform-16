const {
  extractAttribution,
  extractTotalQuantity,
  extractDeliveredAt,
  extractCollectedCodAmount,
  extractRejectionReason,
  formatExternalOrderListRow,
  formatExternalOrderDetail,
} = require('../utils/externalOrderPayload');

describe('externalOrderPayload', () => {
  describe('(أ) أوردر عليه metadata كاملة — Attribution Extraction', () => {
    it('correctly extracts all 11 attribution keys from standard nested attribution', () => {
      const metadata = {
        attribution: {
          utm_source: 'facebook',
          utm_medium: 'paid_social',
          utm_campaign: 'summer_promo_2026',
          utm_term: 'running_shoes',
          utm_content: 'carousel_ad_3',
          campaignId: 'cmp_1001',
          adSetId: 'adset_2002',
          adId: 'ad_3003',
          fbclid: 'fb_click_token_999',
          gclid: 'gclid_google_token_888',
        },
        couponCode: 'SAVE20',
      };

      const result = extractAttribution(metadata);

      expect(result).toEqual({
        utmSource: 'facebook',
        utmMedium: 'paid_social',
        utmCampaign: 'summer_promo_2026',
        utmTerm: 'running_shoes',
        utmContent: 'carousel_ad_3',
        campaignId: 'cmp_1001',
        adSetId: 'adset_2002',
        adId: 'ad_3003',
        fbclid: 'fb_click_token_999',
        gclid: 'gclid_google_token_888',
        couponCode: 'SAVE20',
      });
    });

    it('correctly extracts attribution from JSON string serialized metadata', () => {
      const metaJson = JSON.stringify({
        sessionDetails: {
          trafficSource: {
            source: 'tiktok',
            medium: 'video',
            campaignName: 'viral_october',
            campaignId: 'tt_camp_777',
            adSetId: 'tt_adset_666',
            adId: 'tt_ad_555',
          },
        },
        coupon: { code: 'TIKTOK15' },
      });

      const result = extractAttribution(metaJson);

      expect(result).toEqual({
        utmSource: 'tiktok',
        utmMedium: 'video',
        utmCampaign: 'viral_october',
        utmTerm: null,
        utmContent: null,
        campaignId: 'tt_camp_777',
        adSetId: 'tt_adset_666',
        adId: 'tt_ad_555',
        fbclid: null,
        gclid: null,
        couponCode: 'TIKTOK15',
      });
    });

    it('correctly resolves camelCase properties if present', () => {
      const metadata = {
        attribution: {
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'search_brand',
          utmTerm: 'maxp shoes',
          utmContent: 'headline_1',
          campaignId: 'g_camp_111',
          adSetId: 'g_adgroup_222',
          adId: 'g_ad_333',
          gclid: 'g_click_xyz',
          couponCode: 'BRAND10',
        },
      };

      const result = extractAttribution(metadata);

      expect(result.utmSource).toBe('google');
      expect(result.utmMedium).toBe('cpc');
      expect(result.utmCampaign).toBe('search_brand');
      expect(result.utmTerm).toBe('maxp shoes');
      expect(result.utmContent).toBe('headline_1');
      expect(result.campaignId).toBe('g_camp_111');
      expect(result.adSetId).toBe('g_adgroup_222');
      expect(result.adId).toBe('g_ad_333');
      expect(result.gclid).toBe('g_click_xyz');
      expect(result.couponCode).toBe('BRAND10');
    });
  });

  describe('(ب) أوردر بدون metadata — Safe Null Fallbacks', () => {
    it('returns all nulls when metadata is null', () => {
      const result = extractAttribution(null);
      expect(result).toEqual({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        campaignId: null,
        adSetId: null,
        adId: null,
        fbclid: null,
        gclid: null,
        couponCode: null,
      });
    });

    it('returns all nulls when metadata is undefined', () => {
      const result = extractAttribution(undefined);
      expect(result).toEqual({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        campaignId: null,
        adSetId: null,
        adId: null,
        fbclid: null,
        gclid: null,
        couponCode: null,
      });
    });

    it('returns all nulls when metadata is empty string or empty object', () => {
      expect(extractAttribution('')).toEqual({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        campaignId: null,
        adSetId: null,
        adId: null,
        fbclid: null,
        gclid: null,
        couponCode: null,
      });
      expect(extractAttribution({})).toEqual({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        campaignId: null,
        adSetId: null,
        adId: null,
        fbclid: null,
        gclid: null,
        couponCode: null,
      });
    });

    it('does not throw and returns all nulls for malformed JSON string', () => {
      const result = extractAttribution('{"invalid json: true');
      expect(result).toEqual({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        campaignId: null,
        adSetId: null,
        adId: null,
        fbclid: null,
        gclid: null,
        couponCode: null,
      });
    });
  });

  describe('(ج) أوردر بمرتجع — Rejection Reason Extraction', () => {
    it('extracts rejectionReason from ReturnRequest.rejectionReason', () => {
      const order = {
        status: 'RETURNED',
        returnRequests: [
          {
            rejectionReason: 'العميل رفض الاستلام بسبب المقاس',
            reasonId: 'r-size',
          },
        ],
      };
      expect(extractRejectionReason(order)).toBe('العميل رفض الاستلام بسبب المقاس');
    });

    it('falls back to ReturnRequest.returnReason.reason if rejectionReason is empty', () => {
      const order = {
        status: 'RETURNED',
        returnRequests: [
          {
            rejectionReason: null,
            returnReason: { reason: 'منتج غير مطابق للصورة' },
          },
        ],
      };
      expect(extractRejectionReason(order)).toBe('منتج غير مطابق للصورة');
    });

    it('falls back to ReturnRequest.reasonId if no textual reason exists', () => {
      const order = {
        status: 'RETURNED',
        returnRequests: [
          {
            rejectionReason: null,
            reasonId: 'REASON_DAMAGED_PACKAGE',
          },
        ],
      };
      expect(extractRejectionReason(order)).toBe('REASON_DAMAGED_PACKAGE');
    });

    it('falls back to customStatusCode when order is CANCELLED with no ReturnRequest', () => {
      const order = {
        status: 'CANCELLED',
        customStatusCode: 'CANCELLED_BY_CUSTOMER_EXPENSIVE',
        returnRequests: [],
      };
      expect(extractRejectionReason(order)).toBe('CANCELLED_BY_CUSTOMER_EXPENSIVE');
    });

    it('returns null for normal delivered orders with no return request', () => {
      const order = {
        status: 'DELIVERED',
        customStatusCode: null,
        returnRequests: [],
      };
      expect(extractRejectionReason(order)).toBeNull();
    });

    it('returns null for pending orders with no return request', () => {
      const order = {
        status: 'PENDING',
        customStatusCode: 'PENDING_CONFIRMATION',
        returnRequests: [],
      };
      expect(extractRejectionReason(order)).toBeNull();
    });
  });

  describe('totalQuantity Extraction', () => {
    it('sums the quantities of all order items', () => {
      const items = [
        { quantity: 2 },
        { quantity: 1 },
        { quantity: 3 },
      ];
      expect(extractTotalQuantity(items)).toBe(6);
    });

    it('returns 0 when order items array is empty or missing', () => {
      expect(extractTotalQuantity([])).toBe(0);
      expect(extractTotalQuantity(null)).toBe(0);
      expect(extractTotalQuantity(undefined)).toBe(0);
    });

    it('handles string numbers safely', () => {
      const items = [{ quantity: '4' }, { quantity: '2' }];
      expect(extractTotalQuantity(items)).toBe(6);
    });
  });

  describe('deliveredAt and collectedCodAmount Extraction', () => {
    it('uses Shipment.collectedAt when available', () => {
      const order = {
        shipments: [
          {
            collectedAt: new Date('2026-10-15T12:00:00.000Z'),
            collectedAmount: 650.5,
          },
        ],
        statusHistory: [
          { status: 'DELIVERED', createdAt: new Date('2026-10-14T08:00:00.000Z') },
        ],
      };

      expect(extractDeliveredAt(order)).toBe('2026-10-15T12:00:00.000Z');
      expect(extractCollectedCodAmount(order)).toBe(650.5);
    });

    it('falls back to latest DELIVERED status transition when shipment has no collectedAt', () => {
      const order = {
        shipments: [
          {
            collectedAt: null,
            collectedAmount: null,
          },
        ],
        statusHistory: [
          { status: 'SHIPPED', createdAt: new Date('2026-10-10T10:00:00.000Z') },
          { status: 'DELIVERED', createdAt: new Date('2026-10-12T14:30:00.000Z') },
        ],
      };

      expect(extractDeliveredAt(order)).toBe('2026-10-12T14:30:00.000Z');
      expect(extractCollectedCodAmount(order)).toBeNull();
    });

    it('returns null for deliveredAt and collectedCodAmount when not delivered', () => {
      const order = {
        shipments: [],
        statusHistory: [
          { status: 'PENDING', createdAt: new Date('2026-10-01T10:00:00.000Z') },
          { status: 'CONFIRMED', createdAt: new Date('2026-10-02T10:00:00.000Z') },
        ],
      };

      expect(extractDeliveredAt(order)).toBeNull();
      expect(extractCollectedCodAmount(order)).toBeNull();
    });
  });

  describe('Row and Detail Formats', () => {
    it('formats external order list row with confirmedAt and all new fields', () => {
      const raw = {
        id: 'ord_101',
        orderNumber: 'ORD-101',
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        subtotal: 500,
        shipping: 50,
        discount: 0,
        total: 550,
        currency: 'EGP',
        customerName: 'فاطمة حسن',
        customerPhone: '01123456789',
        city: 'الجيزة',
        governorate: 'الجيزة',
        confirmedAt: new Date('2026-10-11T09:00:00.000Z'),
        createdAt: new Date('2026-10-10T08:00:00.000Z'),
        orderItems: [{ quantity: 3 }],
        shipments: [{ collectedAt: new Date('2026-10-14T10:00:00.000Z'), collectedAmount: 550 }],
        metadata: { attribution: { utm_source: 'instagram', campaignId: 'cmp_ig_1' } },
        returnRequests: [],
      };

      const formatted = formatExternalOrderListRow(raw);

      expect(formatted.id).toBe('ord_101');
      expect(formatted.orderNumber).toBe('ORD-101');
      expect(formatted.totalQuantity).toBe(3);
      expect(formatted.deliveredAt).toBe('2026-10-14T10:00:00.000Z');
      expect(formatted.collectedCodAmount).toBe(550);
      expect(formatted.attribution.utmSource).toBe('instagram');
      expect(formatted.attribution.campaignId).toBe('cmp_ig_1');
      expect(formatted.attribution.utmMedium).toBeNull();
      expect(formatted.rejectionReason).toBeNull();
      expect(formatted.confirmedAt).toEqual(raw.confirmedAt);
    });

    it('formats external order detail preserving items array format and appending new fields', () => {
      const raw = {
        id: 'ord_202',
        orderNumber: 'ORD-202',
        status: 'PENDING',
        customStatusCode: null,
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 200,
        tax: 0,
        shipping: 30,
        discount: 10,
        total: 220,
        currency: 'EGP',
        customerName: 'علي كمال',
        customerPhone: '01234567890',
        customerEmail: 'ali@example.com',
        city: 'الإسكندرية',
        governorate: 'الإسكندرية',
        notes: 'ملاحظة',
        confirmedAt: null,
        createdAt: new Date('2026-10-18T10:00:00.000Z'),
        updatedAt: new Date('2026-10-18T10:05:00.000Z'),
        orderItems: [
          { id: 'item_1', productId: 'p1', quantity: 2, price: 100, productName: 'تيشيرت' },
        ],
        shipments: [],
        statusHistory: [],
        metadata: null,
        returnRequests: [],
      };

      const formatted = formatExternalOrderDetail(raw);

      expect(formatted.id).toBe('ord_202');
      expect(formatted.items).toHaveLength(1);
      expect(formatted.items[0]).toEqual({
        id: 'item_1',
        productId: 'p1',
        quantity: 2,
        price: 100,
        productName: 'تيشيرت',
      });
      expect(formatted.totalQuantity).toBe(2);
      expect(formatted.deliveredAt).toBeNull();
      expect(formatted.collectedCodAmount).toBeNull();
      expect(formatted.attribution.utmSource).toBeNull();
      expect(formatted.rejectionReason).toBeNull();
      expect(formatted.confirmedAt).toBeNull();
    });
  });
});
