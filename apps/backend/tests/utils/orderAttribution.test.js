const {
  sanitizeOrderAttribution,
  extractAttributionFromCheckoutData,
} = require('../../utils/orderAttribution');

describe('utils/orderAttribution', () => {
  test('sanitizes a full attribution object', () => {
    const result = sanitizeOrderAttribution({
      source: 'facebook',
      medium: 'paid_social',
      platform: 'FACEBOOK',
      campaignName: '╪│┘ê╪º┘å ╪╡┘è┘ü',
      campaignId: '238475612',
      adSetId: 'ads-1',
      adId: 'ad-1',
      rawParams: { utm_source: 'facebook' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        platform: 'facebook',
        source: 'facebook',
        medium: 'paid_social',
        campaignName: '╪│┘ê╪º┘å ╪╡┘è┘ü',
        campaignId: '238475612',
      }),
    );
  });

  test('accepts a JSON string input', () => {
    const result = sanitizeOrderAttribution(
      JSON.stringify({ source: 'instagram', medium: 'cpc' }),
    );
    expect(result.source).toBe('instagram');
  });

  test('falls back to utm_source/utm_medium raw params', () => {
    const result = sanitizeOrderAttribution({
      utm_source: 'tiktok',
      utm_medium: 'cpc',
    });
    expect(result.source).toBe('tiktok');
    expect(result.medium).toBe('cpc');
  });

  test('returns null for invalid input', () => {
    expect(sanitizeOrderAttribution(null)).toBeNull();
    expect(sanitizeOrderAttribution('not-json')).toBeNull();
    expect(sanitizeOrderAttribution([])).toBeNull();
  });

  test('infers direct/none when no source', () => {
    const result = sanitizeOrderAttribution({});
    expect(result.source).toBe('direct');
    expect(result.medium).toBe('none');
  });

  describe('Audience Network (Meta)', () => {
    test('preserves explicit audience_network source with facebook platform', () => {
      const result = sanitizeOrderAttribution({
        source: 'audience_network',
        referrer: 'https://l.facebook.com/l.php?u=x',
      });
      expect(result.source).toBe('audience_network');
      expect(result.platform).toBe('facebook');
    });

    test('detects raw utm_source=audience_network', () => {
      const result = sanitizeOrderAttribution({
        utm_source: 'audience_network',
        referrer: 'https://l.facebook.com/l.php?u=x',
      });
      expect(result.source).toBe('audience_network');
      expect(result.platform).toBe('facebook');
    });

    test('detects medium=an on a facebook source', () => {
      const result = sanitizeOrderAttribution({
        source: 'facebook',
        medium: 'an',
        fbclid: 'x',
      });
      expect(result.source).toBe('audience_network');
    });

    test('detects an.facebook.com referrer', () => {
      const result = sanitizeOrderAttribution({
        source: 'facebook',
        referrer: 'https://an.facebook.com/click',
      });
      expect(result.source).toBe('audience_network');
    });

    test('does not misclassify a regular l.facebook.com referrer', () => {
      const result = sanitizeOrderAttribution({
        source: 'facebook',
        referrer: 'https://l.facebook.com/l.php?u=x',
      });
      expect(result.source).toBe('facebook');
    });

    test('does not affect non-facebook sources', () => {
      const result = sanitizeOrderAttribution({ source: 'google', gclid: 'g' });
      expect(result.source).toBe('google');
    });
  });

  describe('extractAttributionFromCheckoutData', () => {
    test('reads attribution from a JSON string checkoutData', () => {
      const result = extractAttributionFromCheckoutData(
        JSON.stringify({
          guestName: 'x',
          phone: '010',
          attribution: { source: 'tiktok', medium: 'paid_social', campaignName: 'tt' },
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ source: 'tiktok', campaignName: 'tt' }),
      );
    });

    test('reads attribution from an object checkoutData', () => {
      const result = extractAttributionFromCheckoutData({
        customerName: 'y',
        attribution: { source: 'google', gclid: 'g1' },
      });
      expect(result).toEqual(expect.objectContaining({ source: 'google', gclid: 'g1' }));
    });

    test('supports campaignAttribution / orderAttribution alias keys', () => {
      const byCampaign = extractAttributionFromCheckoutData({
        campaignAttribution: { source: 'facebook' },
      });
      expect(byCampaign.source).toBe('facebook');

      const byOrder = extractAttributionFromCheckoutData({
        orderAttribution: { source: 'direct' },
      });
      expect(byOrder.source).toBe('direct');
    });

    test('returns null when no attribution present', () => {
      expect(extractAttributionFromCheckoutData('{"name":"z"}')).toBeNull();
      expect(extractAttributionFromCheckoutData(null)).toBeNull();
    });
  });
});
