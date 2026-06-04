const { isExpectedPublicCompanyFallbackRequest } = require('../../middleware/globalSecurity');

describe('globalSecurity public tracking fallback detection', () => {
  test('accepts public analytics tracking POST routes as expected fallback requests', () => {
    expect(
      isExpectedPublicCompanyFallbackRequest({
        method: 'POST',
        originalUrl: '/api/v1/analytics/track/store-visit',
      }),
    ).toBe(true);

    expect(
      isExpectedPublicCompanyFallbackRequest({
        method: 'POST',
        originalUrl: '/api/v1/analytics/track/product-view?source=storefront',
      }),
    ).toBe(true);

    expect(
      isExpectedPublicCompanyFallbackRequest({
        method: 'POST',
        originalUrl: '/api/v1/analytics/track/conversion',
      }),
    ).toBe(true);
  });

  test('rejects unrelated or non-POST requests', () => {
    expect(
      isExpectedPublicCompanyFallbackRequest({
        method: 'GET',
        originalUrl: '/api/v1/analytics/track/store-visit',
      }),
    ).toBe(false);

    expect(
      isExpectedPublicCompanyFallbackRequest({
        method: 'POST',
        originalUrl: '/api/v1/orders',
      }),
    ).toBe(false);
  });
});
