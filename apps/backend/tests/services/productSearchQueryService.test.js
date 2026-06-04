const {
  buildProductSearchCandidates,
  scoreProductMatch,
  parseImageList,
} = require('../../services/aiAgent/utils/productSearchQueryService');
const { parseSearchQuery } = require('../../services/aiAgent/utils/queryUnderstandingParser');
const { getToolDescriptions } = require('../../services/aiAgent/agentToolRegistry');

describe('productSearchQueryService', () => {
  test('expands Arabic transliteration into searchable product phrases', () => {
    const candidates = buildProductSearchCandidates('كوتشي اسود في ابيض بلاتفورم سنيكرز');

    expect(candidates).toContain('platform sneakers');
    expect(candidates).toContain('sneakers');
  });

  test('ranks matching catalog product above unrelated products', () => {
    const query = 'كوتشي اسود في ابيض بلاتفورم سنيكرز';
    const matching = scoreProductMatch({ name: 'Platform Sneakers', sku: 'PLAT-001' }, query);
    const unrelated = scoreProductMatch({ name: 'Classic Loafers', sku: 'LOAF-001' }, query);

    expect(matching).toBeGreaterThan(unrelated);
    expect(matching).toBeGreaterThan(0);
  });

  test('parses primary and JSON image lists into unique URLs', () => {
    expect(parseImageList('/a.jpg', '["/b.jpg","/a.jpg"]')).toEqual(['/a.jpg', '/b.jpg']);
  });

  test('can render customer prompt tool descriptions without parameter schema text', () => {
    const descriptions = getToolDescriptions(['product.search'], { includeParameters: false });

    expect(descriptions).toContain('product.search');
    expect(descriptions).not.toContain('parameters:');
    expect(descriptions).not.toContain('query:');
  });

  test('canonicalizes model-classified Arabic product attribute slots', () => {
    const queryLarge = parseSearchQuery('عايز اللون الاسود مقاس لارج', {
      productColor: 'الاسود',
      productSize: 'لارج',
    });
    expect(queryLarge.size).toBe('L');
    expect(queryLarge.color).toBe('black');

    const queryMedium = parseSearchQuery('بدلة مقاس ميديوم', { productSize: 'ميديوم' });
    expect(queryMedium.size).toBe('M');

    const querySmall = parseSearchQuery('قميص سمول', { productSize: 'سمول' });
    expect(querySmall.size).toBe('S');

    const queryExtraLarge = parseSearchQuery('جاكيت مقاس اكس لارج', { productSize: 'اكس لارج' });
    expect(queryExtraLarge.size).toBe('XL');
  });
});
