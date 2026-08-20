const {
  FALLBACK_GOVERNMENTS,
  GOVERNORATE_MAP,
  CITY_TO_GOVERNMENT_MAP,
  TURBO_STATUS_CODE_MAP,
  STATUS_ALIAS_MAP,
  GUEST_ORDER_STATUS_MAP,
  CACHE_TTL
} = require('../turbo/constants');

const {
  cleanLocationName,
  parseShippingAddress,
  getShippingAddressFields,
  getAddressCompletenessScore,
  getBestShippingAddressFields,
  extractCleanStreetAddress,
  normalizeGuestShippingAddress
} = require('../turbo/addressParser');

const {
  getTurboGovernorateName,
  findGovernmentByCity
} = require('../turbo/governorateMapper');

const {
  isTurboConfigurationError,
  translateTurboErrorToArabic,
  getTurboErrorMessage,
  isShipmentNotFoundError
} = require('../turbo/errorHandler');

const {
  calculateTotalWeight,
  getNumericInvoiceNumber,
  normalizeShipmentSearchKeys,
  formatOrderForTurbo
} = require('../turbo/orderFormatter');

const {
  validateOrderForTurbo
} = require('../turbo/shipmentValidator');

describe('constants', () => {
  test('FALLBACK_GOVERNMENTS has 27 entries', () => {
    expect(FALLBACK_GOVERNMENTS).toHaveLength(27);
  });

  test('FALLBACK_GOVERNMENTS contains ╪º┘ä┘é╪º┘ç╪▒╪⌐', () => {
    expect(FALLBACK_GOVERNMENTS.find(g => g.name === '╪º┘ä┘é╪º┘ç╪▒╪⌐')).toBeTruthy();
  });

  test('GOVERNORATE_MAP maps cairo to ╪º┘ä┘é╪º┘ç╪▒╪⌐', () => {
    expect(GOVERNORATE_MAP['cairo']).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
  });

  test('GOVERNORATE_MAP maps 1 to ╪º┘ä┘é╪º┘ç╪▒╪⌐', () => {
    expect(GOVERNORATE_MAP['1']).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
  });

  test('CITY_TO_GOVERNMENT_MAP maps ╪º┘ä┘à┘å╪╡┘ê╪▒╪⌐ to ╪º┘ä╪»┘é┘ç┘ä┘è╪⌐', () => {
    expect(CITY_TO_GOVERNMENT_MAP['╪º┘ä┘à┘å╪╡┘ê╪▒╪⌐']).toBe('╪º┘ä╪»┘é┘ç┘ä┘è╪⌐');
  });

  test('TURBO_STATUS_CODE_MAP maps 7 to delivered', () => {
    expect(TURBO_STATUS_CODE_MAP['7']).toBe('delivered');
  });

  test('TURBO_STATUS_CODE_MAP maps 6 to cancelled', () => {
    expect(TURBO_STATUS_CODE_MAP['6']).toBe('cancelled');
  });

  test('STATUS_ALIAS_MAP aliases status_7 to delivered', () => {
    expect(STATUS_ALIAS_MAP['status_7']).toBe('delivered');
  });

  test('GUEST_ORDER_STATUS_MAP has DELIVERED', () => {
    expect(GUEST_ORDER_STATUS_MAP['DELIVERED']).toBe('DELIVERED');
  });

  test('CACHE_TTL is 1 hour', () => {
    expect(CACHE_TTL).toBe(3600000);
  });
});

describe('addressParser', () => {
  describe('cleanLocationName', () => {
    test('removes numeric prefix with colon', () => {
      expect(cleanLocationName('4021:╪¡╪»╪º╪ª┘é ╪º┘ä╪º┘ç╪▒╪º┘à')).toBe('╪¡╪»╪º╪ª┘é ╪º┘ä╪º┘ç╪▒╪º┘à');
    });

    test('returns empty string for null/undefined', () => {
      expect(cleanLocationName(null)).toBe('');
      expect(cleanLocationName(undefined)).toBe('');
    });

    test('preserves clean name', () => {
      expect(cleanLocationName('╪º┘ä┘é╪º┘ç╪▒╪⌐')).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });
  });

  describe('parseShippingAddress', () => {
    test('parses valid JSON string', () => {
      const result = parseShippingAddress('{"street":"10 St","city":"Giza"}');
      expect(result).toEqual({ street: '10 St', city: 'Giza' });
    });

    test('returns null for non-JSON string', () => {
      expect(parseShippingAddress('Giza')).toBeNull();
    });

    test('returns null for empty input', () => {
      expect(parseShippingAddress(null)).toBeNull();
    });

    test('returns object as-is', () => {
      const obj = { street: 'test' };
      expect(parseShippingAddress(obj)).toBe(obj);
    });

    test('returns null for array', () => {
      expect(parseShippingAddress(['a', 'b'])).toBeNull();
    });
  });

  describe('getShippingAddressFields', () => {
    test('extracts fields from structured address', () => {
      const result = getShippingAddressFields({ street: '10 St', city: 'Giza', governorate: '╪º┘ä╪¼┘è╪▓╪⌐' });
      expect(result.primaryAddress).toBe('10 St');
      expect(result.city).toBe('Giza');
      expect(result.governorate).toBe('╪º┘ä╪¼┘è╪▓╪⌐');
    });

    test('handles plain string fallback', () => {
      const result = getShippingAddressFields('╪╣┘å┘ê╪º┘å ╪¿╪│┘è╪╖');
      expect(result.formattedAddress).toBe('╪╣┘å┘ê╪º┘å ╪¿╪│┘è╪╖');
    });
  });

  describe('getAddressCompletenessScore', () => {
    test('returns 0 for empty fields', () => {
      expect(getAddressCompletenessScore({})).toBe(0);
    });

    test('returns higher score for fields with street data', () => {
      const score = getAddressCompletenessScore({
        formattedAddress: '10 St, Giza',
        parsedAddress: { street: '10 St' },
        city: 'Giza'
      });
      expect(score).toBeGreaterThan(500);
    });
  });

  describe('getBestShippingAddressFields', () => {
    test('prefers the more complete address', () => {
      const result = getBestShippingAddressFields('Giza', { street: '10 St', city: 'Giza' });
      expect(result).toBeTruthy();
      expect(result.sourceValue.street).toBe('10 St');
    });
  });

  describe('extractCleanStreetAddress', () => {
    test('cleans phone numbers from address', () => {
      const fields = { formattedAddress: '10 St 01012345678', primaryAddress: '10 St' };
      const result = extractCleanStreetAddress(fields);
      expect(result).not.toContain('01012345678');
    });

    test('returns cleaned address', () => {
      const fields = { formattedAddress: '15 St, District 5', primaryAddress: '15 St' };
      expect(extractCleanStreetAddress(fields)).toBe('15 St, District 5');
    });

    test('removes governorate names from street text', () => {
      const fields = { formattedAddress: '10 St, ╪º┘ä┘é╪º┘ç╪▒╪⌐, Giza' };
      const result = extractCleanStreetAddress(fields);
      expect(result).not.toContain('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });

    test('removes customer name from address', () => {
      const fields = { formattedAddress: '╪ú╪¡┘à╪» ┘à╪¡┘à╪» 10 St' };
      const result = extractCleanStreetAddress(fields, '', { customerName: '╪ú╪¡┘à╪» ┘à╪¡┘à╪»' });
      expect(result).toBe('10 St');
    });
  });

  describe('normalizeGuestShippingAddress', () => {
    test('parses JSON string', () => {
      const result = normalizeGuestShippingAddress('{"street":"10 St","city":"Giza"}');
      expect(result.customerAddress).toBe('10 St');
      expect(result.city).toBe('Giza');
    });

    test('extracts address from object', () => {
      const result = normalizeGuestShippingAddress({ street: '10 St', city: 'Giza' });
      expect(result.customerAddress).toContain('10 St');
    });

    test('returns empty for null', () => {
      const result = normalizeGuestShippingAddress(null);
      expect(result.customerAddress).toBe('');
    });
  });
});

describe('governorateMapper', () => {
  describe('getTurboGovernorateName', () => {
    test('maps cairo to ╪º┘ä┘é╪º┘ç╪▒╪⌐', () => {
      expect(getTurboGovernorateName('cairo')).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });

    test('maps 1 to ╪º┘ä┘é╪º┘ç╪▒╪⌐', () => {
      expect(getTurboGovernorateName('1')).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });

    test('maps ╪º┘ä┘é╪º┘ç╪▒╪⌐ to ╪º┘ä┘é╪º┘ç╪▒╪⌐', () => {
      expect(getTurboGovernorateName('╪º┘ä┘é╪º┘ç╪▒╪⌐')).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });

    test('returns null for empty input', () => {
      expect(getTurboGovernorateName('')).toBeNull();
    });

    test('maps alex to ╪º┘ä╪Ñ╪│┘â┘å╪»╪▒┘è╪⌐', () => {
      expect(getTurboGovernorateName('alex')).toBe('╪º┘ä╪Ñ╪│┘â┘å╪»╪▒┘è╪⌐');
    });
  });

  describe('findGovernmentByCity', () => {
    const governments = [
      { id: '1', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' },
      { id: '2', name: '╪º┘ä╪¼┘è╪▓╪⌐' },
      { id: '7', name: '╪º┘ä╪»┘é┘ç┘ä┘è╪⌐' },
    ];

    test('finds government for city via mapping', () => {
      expect(findGovernmentByCity('╪º┘ä┘à┘å╪╡┘ê╪▒╪⌐', governments)).toBe('╪º┘ä╪»┘é┘ç┘ä┘è╪⌐');
    });

    test('returns default for empty city', () => {
      expect(findGovernmentByCity('', governments)).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });

    test('falls back to getTurboGovernorateName when no governments list', () => {
      expect(findGovernmentByCity('cairo')).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });
  });
});

describe('errorHandler', () => {
  describe('isTurboConfigurationError', () => {
    test('detects Turbo is not enabled', () => {
      expect(isTurboConfigurationError(new Error('Turbo is not enabled for this company'))).toBe(true);
    });

    test('detects API key not configured', () => {
      expect(isTurboConfigurationError(new Error('Turbo API key is not configured'))).toBe(true);
    });

    test('returns false for other errors', () => {
      expect(isTurboConfigurationError(new Error('Database error'))).toBe(false);
    });
  });

  describe('translateTurboErrorToArabic', () => {
    test('translates Company ID error', () => {
      expect(translateTurboErrorToArabic('Company ID is required')).toBe('┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à╪╖┘ä┘ê╪¿');
    });

    test('translates auth key error', () => {
      expect(translateTurboErrorToArabic('Invalid authentication_key')).toBe('┘à┘ü╪¬╪º╪¡ ╪º┘ä┘Ç API ╪º┘ä╪«╪º╪╡ ╪¿╪┤╪▒┘â╪⌐ ╪¬╪▒╪¿┘ê ╪║┘è╪▒ ╪╡╪¡┘è╪¡ ╪ú┘ê ┘à┘å╪¬┘ç┘è ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐');
    });

    test('returns default for empty input', () => {
      expect(translateTurboErrorToArabic('')).toBe('╪¡╪»╪½ ╪«╪╖╪ú ╪║┘è╪▒ ┘à╪¬┘ê┘é╪╣ ╪ú╪½┘å╪º╪í ╪º┘ä╪¬┘ê╪º╪╡┘ä ┘à╪╣ ╪¬╪▒╪¿┘ê');
    });

    test('wraps unknown error with prefix', () => {
      expect(translateTurboErrorToArabic('Unknown error')).toBe('╪«╪╖╪ú ┘ü┘è ╪º┘ä╪┤╪¡┘å: Unknown error');
    });
  });

  describe('getTurboErrorMessage', () => {
    test('extracts error_msg from response', () => {
      const err = { response: { data: { error_msg: 'API error' } } };
      expect(getTurboErrorMessage(err)).toBe('API error');
    });

    test('falls back to error.message', () => {
      const err = new Error('Direct error');
      expect(getTurboErrorMessage(err)).toBe('Direct error');
    });
  });

  describe('isShipmentNotFoundError', () => {
    test('matches "shipment not found"', () => {
      expect(isShipmentNotFoundError('Shipment not found')).toBe(true);
    });

    test('matches "shipments not found"', () => {
      expect(isShipmentNotFoundError('Shipments not found')).toBe(true);
    });

    test('does not match other errors', () => {
      expect(isShipmentNotFoundError('API error')).toBe(false);
    });
  });
});

describe('orderFormatter', () => {
  describe('calculateTotalWeight', () => {
    test('calculates total weight from items', () => {
      const items = [{ weight: 2, quantity: 3 }];
      expect(calculateTotalWeight(items)).toBe(6);
    });

    test('returns default weight of 1 for empty items', () => {
      expect(calculateTotalWeight([])).toBe(1);
    });

    test('returns default for null', () => {
      expect(calculateTotalWeight(null)).toBe(1);
    });
  });

  describe('getNumericInvoiceNumber', () => {
    test('extracts numbers from ORD- format', () => {
      expect(getNumericInvoiceNumber('ORD-839842-557')).toBe(839842557);
    });

    test('returns 0 for non-numeric', () => {
      expect(getNumericInvoiceNumber('abc')).toBe(0);
    });

    test('uses fallback when orderNumber is empty', () => {
      expect(getNumericInvoiceNumber('', '123')).toBe(123);
    });
  });

  describe('normalizeShipmentSearchKeys', () => {
    test('normalizes array of keys', () => {
      expect(normalizeShipmentSearchKeys(['CODE-123', null, 'BAR-999', ''])).toEqual(['CODE-123', 'BAR-999']);
    });

    test('wraps single value in array', () => {
      expect(normalizeShipmentSearchKeys('00012345')).toEqual(['00012345']);
    });

    test('removes duplicates', () => {
      expect(normalizeShipmentSearchKeys(['a', 'a', 'b'])).toEqual(['a', 'b']);
    });
  });

  describe('formatOrderForTurbo', () => {
    test('formats basic order with customer and items', () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        customerName: '╪ú╪¡┘à╪»',
        customerPhone: '01000000000',
        shippingAddress: '10 Main St',
        city: 'Giza',
        total: 500,
        shipping: 50,
        paymentMethod: 'CASH'
      };
      const customer = { firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '01000000000' };
      const items = [{ name: 'Product A', quantity: 2, price: 250 }];

      const result = formatOrderForTurbo(order, customer, items);
      expect(result.orderNumber).toBe('ORD-001');
      expect(result.customerName).toBe('╪ú╪¡┘à╪»');
      expect(result.customerPhone).toBe('01000000000');
      expect(result.paymentMethod).toBe('CASH');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productName).toBe('Product A');
    });

    test('handles guest orders with guestName', () => {
      const order = {
        id: 'guest-1',
        orderNumber: 'GST-001',
        guestName: '┘à╪¡┘à╪»',
        guestPhone: '01111111111',
        shippingAddress: '20 Second St',
        city: 'Cairo',
        total: 300,
        shipping: 30
      };

      const result = formatOrderForTurbo(order, null, []);
      expect(result.customerName).toBe('┘à╪¡┘à╪»');
      expect(result.customerPhone).toBe('01111111111');
    });

    test('handles null/undefined items gracefully', () => {
      const order = {
        id: 'order-2',
        orderNumber: 'ORD-002',
        customerName: 'Test',
        customerPhone: '01222222222',
        total: 100,
        shipping: 10
      };

      const result = formatOrderForTurbo(order, {}, null);
      expect(result.items).toEqual([]);
    });
  });
});

describe('shipmentValidator', () => {
  test('returns valid for complete order', () => {
    const order = { customerName: '╪ú╪¡┘à╪»', shippingAddress: '10 St', city: 'Giza' };
    const orderData = {
      customerName: '╪ú╪¡┘à╪»',
      customerPhone: '01000000000',
      shippingAddress: '10 Main St',
      governorate: '╪º┘ä╪¼┘è╪▓╪⌐',
      items: [{ name: 'P1', quantity: 1, price: 100 }]
    };
    expect(validateOrderForTurbo(order, orderData)).toEqual({ isValid: true });
  });

  test('detects missing customer name', () => {
    const result = validateOrderForTurbo({}, { shippingAddress: '10 St', governorate: '╪º┘ä╪¼┘è╪▓╪⌐', items: [{ name: 'P1' }] });
    expect(result.isValid).toBe(false);
    expect(result.missingFields.some(f => f.includes('╪º╪│┘à'))).toBe(true);
  });

  test('detects missing phone', () => {
    const result = validateOrderForTurbo(
      { customerName: '╪ú╪¡┘à╪»', shippingAddress: '10 St', city: 'Giza' },
      { customerName: '╪ú╪¡┘à╪»', shippingAddress: '10 St', governorate: '╪º┘ä╪¼┘è╪▓╪⌐', items: [{ name: 'P1' }] }
    );
    expect(result.isValid).toBe(false);
    expect(result.missingFields.some(f => f.includes('╪¬┘ä┘è┘ü┘ê┘å'))).toBe(true);
  });

  test('detects missing governorate', () => {
    const result = validateOrderForTurbo(
      { customerName: '╪ú╪¡┘à╪»', shippingAddress: '10 St' },
      { customerName: '╪ú╪¡┘à╪»', customerPhone: '01000000000', shippingAddress: '10 St', items: [{ name: 'P1' }] }
    );
    expect(result.isValid).toBe(false);
    expect(result.missingFields.some(f => f.includes('┘à╪¡╪º┘ü╪╕╪⌐'))).toBe(true);
  });

  test('detects empty items', () => {
    const result = validateOrderForTurbo(
      { customerName: '╪ú╪¡┘à╪»', shippingAddress: '10 St', city: 'Giza' },
      { customerName: '╪ú╪¡┘à╪»', customerPhone: '01000000000', shippingAddress: '10 St', governorate: '╪º┘ä╪¼┘è╪▓╪⌐', items: [] }
    );
    expect(result.isValid).toBe(false);
    expect(result.missingFields.some(f => f.includes('╪ú╪╡┘å╪º┘ü'))).toBe(true);
  });
});
