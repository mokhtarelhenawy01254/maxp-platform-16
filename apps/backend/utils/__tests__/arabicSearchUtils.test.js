const {
  normalizeArabic,
  normalizeArabicText,
  generateArabicSpellingVariants,
  getSynonymsAndVariants,
  buildProductSearchFilter,
  matchesNormalizedProduct,
} = require('../arabicSearchUtils');

describe('arabicSearchUtils', () => {
  describe('normalizeArabic', () => {
    test('normalizes hamzas (أ, إ, آ, ٱ -> ا)', () => {
      expect(normalizeArabic('أبيض')).toBe('ابيض');
      expect(normalizeArabic('إسكوتش')).toBe('اسكوتش');
      expect(normalizeArabic('آخر')).toBe('اخر');
      expect(normalizeArabic('ٱبيض')).toBe('ابيض');
      expect(normalizeArabicText('أبيض')).toBe('ابيض');
    });

    test('normalizes taa marbuta (ة -> ه)', () => {
      expect(normalizeArabic('لمسة')).toBe('لمسه');
      expect(normalizeArabic('قطعة')).toBe('قطعه');
      expect(normalizeArabic('أحذية')).toBe('احذيه');
    });

    test('normalizes yaa / alef maqsura (ى -> ي) and hamza carriers (ؤ -> و, ئ -> ي)', () => {
      expect(normalizeArabic('كوتشى')).toBe('كوتشي');
      expect(normalizeArabic('رمادى')).toBe('رمادي');
      expect(normalizeArabic('فؤاد')).toBe('فواد');
      expect(normalizeArabic('نسائي')).toBe('نسايي');
    });

    test('removes tashkeel (diacritics)', () => {
      expect(normalizeArabic('حِذَاءٌ')).toBe('حذاء');
      expect(normalizeArabic('سْنِيكَرْز')).toBe('سنيكرز');
      expect(normalizeArabic('أَبْيَض')).toBe('ابيض');
    });

    test('removes tatweel / kashida', () => {
      expect(normalizeArabic('كـوتـشـي')).toBe('كوتشي');
    });

    test('trims, collapses spaces, and leaves plain English unaffected aside from case', () => {
      expect(normalizeArabic('   SNEAKER  أبيض   ')).toBe('sneaker ابيض');
      expect(normalizeArabic('sneaker')).toBe('sneaker');
    });

    test('makes ابيض identical to أبيض', () => {
      expect(normalizeArabic('ابيض')).toBe(normalizeArabic('أبيض'));
    });
  });

  describe('getSynonymsAndVariants', () => {
    test('expands "حذاء" to include shoe synonyms and combined variants (أحذية, كوتشي, سنيكرز, شوز, sneaker)', () => {
      const variants = getSynonymsAndVariants('حذاء');
      expect(variants).toContain('حذاء');
      expect(variants).toContain('أحذية');
      expect(variants).toContain('احذيه');
      expect(variants).toContain('كوتشي');
      expect(variants).toContain('سنيكرز');
      expect(variants).toContain('شوز');
      expect(variants).toContain('sneaker');
      expect(variants).toContain('shoes');
    });

    test('expands "ابيض" to match "أبيض" and "الأبيض" and vice-versa', () => {
      const variantsFromUnaccented = getSynonymsAndVariants('ابيض');
      expect(variantsFromUnaccented).toContain('أبيض');
      expect(variantsFromUnaccented).toContain('ابيض');
      expect(variantsFromUnaccented).toContain('الأبيض');

      const variantsFromAccented = getSynonymsAndVariants('أبيض');
      expect(variantsFromAccented).toContain('ابيض');
      expect(variantsFromAccented).toContain('أبيض');
      expect(variantsFromAccented).toContain('الابيض');
    });

    test('preserves specific searches for "سنيكرز", "كوتشي", and "sneaker" without cross-polluting', () => {
      const sneakerArVariants = getSynonymsAndVariants('سنيكرز');
      expect(sneakerArVariants).toContain('سنيكرز');
      expect(sneakerArVariants).not.toContain('كوتشي');

      const kotshyVariants = getSynonymsAndVariants('كوتشي');
      expect(kotshyVariants).toContain('كوتشي');
      expect(kotshyVariants).not.toContain('سنيكرز');

      const sneakerEnVariants = getSynonymsAndVariants('sneaker');
      expect(sneakerEnVariants).toContain('sneaker');
      expect(sneakerEnVariants).not.toContain('كوتشي');
    });
  });

  describe('buildProductSearchFilter', () => {
    test('returns null for empty or non-string queries', () => {
      expect(buildProductSearchFilter('')).toBeNull();
      expect(buildProductSearchFilter(null)).toBeNull();
      expect(buildProductSearchFilter('   ')).toBeNull();
    });

    test('builds OR clause containing name, description, tags, sku, category, productVariants', () => {
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
      expect(fieldNames.has('tags')).toBe(true);
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

  describe('matchesNormalizedProduct (both-sides normalization)', () => {
    const catalog = [
      { id: '1', name: 'حِذَاءٌ رياضي أَبْيَض', description: '', tags: 'أحذية', category: { name: 'أحذية' }, productVariants: [] },
      { id: '2', name: 'كوتشي أبيض سوان', description: 'خفيف', tags: 'كوتشى', category: { name: 'شوز' }, productVariants: [] },
      { id: '3', name: 'كـوتـشـي كلاسيك ابيض', description: '', tags: '', category: { name: 'أحذية' }, productVariants: [] },
      { id: '4', name: 'سنيكرز الأبيض', description: 'Swan Sneaker', tags: '', category: { name: 'أحذية' }, productVariants: [] },
      { id: '5', name: 'Swan Sneaker 11', description: 'حذاء خفيف أبيض', tags: 'sneaker', category: { name: 'Sneakers' }, productVariants: [] },
      { id: '6', name: 'Classic Sneaker Pro', description: 'ابيض', tags: '', category: { name: 'Shoes' }, productVariants: [] },
      { id: '7', name: 'جزمة جلد أسود', description: '', tags: 'أحذية', category: { name: 'جزمة' }, productVariants: [] },
      { id: '8', name: 'بوت شتوي', description: '', tags: 'أحذية', category: { name: 'أحذية' }, productVariants: [] },
      { id: '9', name: 'شوز أبيض يومي', description: '', tags: '', category: { name: 'أحذية' }, productVariants: [] },
      { id: '10', name: 'كوتشي ركض أبيض', description: '', tags: '', category: { name: 'كوتشي' }, productVariants: [] },
      { id: '11', name: 'كوتشي شبابي اسود', description: '', tags: '', category: { name: 'كوتشي' }, productVariants: [] },
      { id: '12', name: 'هاف بوت جلد أبيض', description: '', tags: '', category: { name: 'أحذية' }, productVariants: [] },
    ];

    test('search "حذاء" matches >= 10 shoe products regardless of diacritics/spelling', () => {
      const matches = catalog.filter((p) => matchesNormalizedProduct(p, 'حذاء'));
      expect(matches.length).toBeGreaterThanOrEqual(10);
    });

    test('search "ابيض" returns exact same results as "أبيض"', () => {
      const fromUnaccented = catalog.filter((p) => matchesNormalizedProduct(p, 'ابيض')).map((p) => p.id);
      const fromAccented = catalog.filter((p) => matchesNormalizedProduct(p, 'أبيض')).map((p) => p.id);
      expect(fromUnaccented.length).toBeGreaterThan(0);
      expect(fromUnaccented).toEqual(fromAccented);
    });

    test('search "سنيكرز", "كوتشي", and "sneaker" stay unaffected without cross-contamination', () => {
      const arSneaker = catalog.filter((p) => matchesNormalizedProduct(p, 'سنيكرز')).map((p) => p.id);
      const kotshy = catalog.filter((p) => matchesNormalizedProduct(p, 'كوتشي')).map((p) => p.id);
      const enSneaker = catalog.filter((p) => matchesNormalizedProduct(p, 'sneaker')).map((p) => p.id);

      expect(arSneaker).toEqual(['4']);
      expect(kotshy).toEqual(['2', '3', '10', '11']);
      expect(enSneaker).toEqual(['4', '5', '6']);
    });
  });
});
