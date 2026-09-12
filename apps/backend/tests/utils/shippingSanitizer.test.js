const {
  toAsciiDigits,
  cleanPhoneNumber,
  isValidEgyptianPhone,
  extractPhonesFromText,
  resolveBestPhoneNumbers,
  cleanCustomerName,
  deeplyUnwrapJson,
  cleanShippingAddress,
  cleanShippingNotes,
  isGenericOrInternalIdentifier,
  formatShipmentContents,
  detectGovernorateFromText,
} = require('../../utils/shippingSanitizer');

describe('Universal Shipping Sanitizer Unit Tests', () => {
  describe('toAsciiDigits & cleanPhoneNumber', () => {
    test('converts Arabic-Indic numerals (٠-٩) to ASCII', () => {
      expect(cleanPhoneNumber('٠١٠١١٥٤٥٢٧٤')).toBe('01011545274');
    });

    test('normalizes +20, 0020, and 20 prefix', () => {
      expect(cleanPhoneNumber('+201123456789')).toBe('01123456789');
      expect(cleanPhoneNumber('00201223456789')).toBe('01223456789');
      expect(cleanPhoneNumber('201523456789')).toBe('01523456789');
    });

    test('fixes 10-digit number missing leading 0', () => {
      expect(cleanPhoneNumber('1011545274')).toBe('01011545274');
    });

    test('validates standard Egyptian phone', () => {
      expect(isValidEgyptianPhone('01011545274')).toBe(true);
      expect(isValidEgyptianPhone('0100654546')).toBe(false); // only 10 digits
    });
  });

  describe('extractPhonesFromText & resolveBestPhoneNumbers', () => {
    test('extracts phone numbers from address and strips them', () => {
      const raw = 'غربيه قطور شارع الفرن الالي بجوار عطارة المصطفي \n\n01112595225';
      const { cleanedText, phones } = extractPhonesFromText(raw);
      expect(phones).toContain('01112595225');
      expect(cleanedText).not.toContain('01112595225');
      expect(cleanedText).toContain('قطور');
    });

    test('promotes valid 11-digit phone from address when primary is 10 digits', () => {
      const primary = '0100654546'; // 10 digits (invalid)
      const address = 'غربيه قطور شارع الفرن الالي \n0100654546\n01112595225'; // has valid 11 digits
      const res = resolveBestPhoneNumbers(primary, null, address);
      expect(res.primaryPhone).toBe('01112595225');
      expect(res.secondaryPhone).toBe('0100654546');
    });
  });

  describe('cleanCustomerName', () => {
    test('strips trailing chat numbers like "هبه ماجد 0"', () => {
      expect(cleanCustomerName('هبه ماجد ٠')).toBe('هبه ماجد');
      expect(cleanCustomerName('هبه ماجد 0')).toBe('هبه ماجد');
    });

    test('strips embedded phone and chat timestamp', () => {
      expect(cleanCustomerName('أحمد محمد\n١٠:٥٣ ص')).toBe('أحمد محمد');
      expect(cleanCustomerName('سارة محمود 01012345678')).toBe('سارة محمود');
    });
  });

  describe('cleanShippingAddress', () => {
    test('unwraps double-nested JSON strings from chatbot orders', () => {
      const doubleNested = JSON.stringify({
        address: JSON.stringify({
          address: '٤ عمارات الشمس حي السفارات',
          building: '٤',
          area: 'مدينه نصر'
        })
      });
      const cleaned = cleanShippingAddress(doubleNested);
      expect(cleaned).toContain('4 عمارات الشمس حي السفارات');
      expect(cleaned).not.toContain('{');
      expect(cleaned).not.toContain('}');
    });

    test('cleans timestamps and trailing phones even when area is joined', () => {
      const addrObj = {
        governorate: 'الغربية',
        city: 'الغربية',
        area: 'الغربية',
        address: 'غربيه قطور شارع الفرن الالي بجوار عطارة المصطفي \n\n01112595225'
      };
      const cleaned = cleanShippingAddress(addrObj);
      expect(cleaned).not.toContain('01112595225');
      expect(cleaned).toContain('قطور شارع الفرن الالي');
    });

    test('strips customer name from start of address if duplicated', () => {
      const addr = 'شيماء السيد \nالدقهليه بلقاس العزبه الحمرا \n01010528171';
      const cleaned = cleanShippingAddress(addr, null, 'شيماء السيد');
      expect(cleaned).toBe('الدقهليه بلقاس العزبه الحمرا');
    });
  });

  describe('cleanShippingNotes', () => {
    test('filters out internal audit notes', () => {
      expect(cleanShippingNotes('Bulk status update')).toContain('المعاينة في وجود المندوب');
      expect(cleanShippingNotes('طلب تلقائي من المحادثة\nمعرف المحادثة: cmt123')).toContain('المعاينة في وجود المندوب');
      expect(cleanShippingNotes('Auto-transition to shipped')).toContain('المعاينة في وجود المندوب');
    });

    test('retains real customer delivery notes and appends secondaryPhone', () => {
      const result = cleanShippingNotes('الاتصال قبل الوصول بساعة', undefined, '01112595225');
      expect(result).toContain('الاتصال قبل الوصول بساعة');
      expect(result).toContain('هاتف بديل: 01112595225');
    });
  });

  describe('isGenericOrInternalIdentifier & formatShipmentContents', () => {
    test('identifies internal and generic identifiers', () => {
      expect(isGenericOrInternalIdentifier('منتج غير محدد')).toBe(true);
      expect(isGenericOrInternalIdentifier('AUTO-1789083823768')).toBe(true);
      expect(isGenericOrInternalIdentifier('إعلان جديد بهدف المبيعات')).toBe(true);
      expect(isGenericOrInternalIdentifier('إعلان جديد بهدف التفاعل')).toBe(true);
      expect(isGenericOrInternalIdentifier('بيجامة الفيونكة')).toBe(false);
    });

    test('does not leak AUTO- sku or generic campaign name to shipment contents', () => {
      const items = [
        {
          productName: null,
          productSku: 'AUTO-1789083823768',
          quantity: 1,
        }
      ];
      const metadata = {
        attribution: { campaignName: 'إعلان جديد بهدف التفاعل' }
      };
      const result = formatShipmentContents(items, metadata);
      expect(result).not.toContain('AUTO-');
      expect(result).not.toContain('إعلان جديد');
      expect(result).toBe('منتجات متنوعة × 1');
    });

    test('formats items with size and color correctly', () => {
      const items = [
        {
          productName: 'بيجامة الفيونكة',
          productSize: 'بيج سايز',
          productColor: 'نبيتي',
          quantity: 2
        }
      ];
      expect(formatShipmentContents(items)).toBe('بيجامة الفيونكة (بيج سايز - نبيتي) × 2');
    });
  });

  describe('detectGovernorateFromText', () => {
    test('detects Egyptian governorate from address text', () => {
      expect(detectGovernorateFromText('غربيه قطور شارع الفرن الالي')).toBe('الغربية');
      expect(detectGovernorateFromText('الاصلاح - البلينا - سوهاج')).toBe('سوهاج');
      expect(detectGovernorateFromText('٢٥ متفرع من ١٦ الفلكي')).toBe('الإسكندرية');
    });
  });
});
