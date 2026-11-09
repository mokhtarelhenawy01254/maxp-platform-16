const {
  normalizeArabicText,
  generateArabicSpellingVariants,
  getSynonymsAndVariants,
  buildProductSearchFilter,
} = require('../arabicSearchUtils');

describe('arabicSearchUtils', () => {
  describe('normalizeArabicText', () => {
    test('normalizes hamzas (أ, إ, آ, ٱ -> ا)', () => {
      expect(normalizeArabicText('أبيض')).toBe('ابيض');
      expect(normalizeArabicText('إسكوتش')).toBe('اسكوتش');
      expect(normalizeArabicText('آخر')).toBe('اخر');
    });

    test('normalizes taa marbuta (ة -> ه)', () => {
      expect(normalizeArabicText('لمسة')).toBe('لمسه');
      expect(normalizeArabicText('قطعة')).toBe('قطعه');
    });

    test('normalizes yaa / alef maqsura (ى -> ي)', () => {
      expect(normalizeArabicText('كوتشى')).toBe('كوتشي');
      expect(normalizeArabicText('رمادى')).toBe('رمادي');
    });

    test('removes tashkeel (diacritics)', () => {
      expect(normalizeArabicText('حِذَاءٌ')).toBe('حذاء');
      expect(normalizeArabicText('سْنِيكَرْز')).toBe('سنيكرز');
    });

    test('removes tatweel / kashida', () => {
      expect(normalizeArabicText('كـوتـشـي')).toBe('كوتشي');
    });

    test('trims and lowercases', () => {
      expect(normalizeArabicText('   SNEAKER  أبيض   ')).toBe('sneaker ابيض');
    });
  });

  describe('getSynonymsAndVariants', () => {
    test('expands "حذاء" to include synonyms (كوتشي, سنيكرز, شوز, sneaker, etc.)', () => {
      const variants = getSynonymsAndVariants('حذاء');
      expect(variants).toContain('حذاء');
      expect(variants).toContain('كوتشي');
      expect(variants).toContain('سنيكرز');
      expect(variants).toContain('شوز');
      expect(variants).toContain('sneaker');
      expect(variants).toContain('shoes');
    });

    test('expands "ابيض" to match "أبيض" and vice-versa', () => {
      const variantsFromUnaccented = getSynonymsAndVariants('ابيض');
      expect(variantsFromUnaccented).toContain('أبيض');
      expect(variantsFromUnaccented).toContain('ابيض');

      const variantsFromAccented = getSynonymsAndVariants('أبيض');
      expect(variantsFromAccented).toContain('ابيض');
      expect(variantsFromAccented).toContain('أبيض');
    });

    test('preserves exact searches for "سنيكرز" and "كوتشي"', () => {
      const sneakerVariants = getSynonymsAndVariants('سنيكرز');
      expect(sneakerVariants).toContain('سنيكرز');

      const kotshyVariants = getSynonymsAndVariants('كوتشي');
      expect(kotshyVariants).toContain('كوتشي');
    });
  });

  describe('buildProductSearchFilter', () => {
    test('returns null for empty or non-string queries', () => {
      expect(buildProductSearchFilter('')).toBeNull();
      expect(buildProductSearchFilter(null)).toBeNull();
      expect(buildProductSearchFilter('   ')).toBeNull();
    });

    test('builds OR clause containing name, description, sku, category, productVariants', () => {
      const filter = buildProductSearchFilter('حذاء');
      expect(filter).toBeDefined();
      expect(filter.OR).toBeDefined();
      expect(Array.isArray(filter.OR)).toBe(true);

      const fieldNames = new Set();
      filter.OR.forEach((cond) => {
        Object.keys(cond).forEach((k) => fieldNames.add(k));
      });

      expect(fieldNames.has('name')).toBe(true);
      expect(fieldNames.has('description')).toBe(true);
      expect(fieldNames.has('sku')).toBe(true);
      expect(fieldNames.has('category')).toBe(true);
      expect(fieldNames.has('productVariants')).toBe(true);
    });

    test('builds AND clause for multi-word search (e.g. "كوتشي ابيض")', () => {
      const filter = buildProductSearchFilter('كوتشي ابيض');
      expect(filter).toBeDefined();
      expect(filter.AND).toBeDefined();
      expect(filter.AND.length).toBe(2);
      expect(filter.AND[0].OR).toBeDefined();
      expect(filter.AND[1].OR).toBeDefined();
    });
  });
});
