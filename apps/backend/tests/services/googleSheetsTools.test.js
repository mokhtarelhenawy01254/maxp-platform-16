/**
 * @module googleSheetsTools.test
 * @description Comprehensive unit tests for the hardened Google Sheets integration tools.
 * Covers URL parsing, in-memory caching, 2D array parsing, Arabic search normalization,
 * data leak prevention, and Apps Script redirect error immunity.
 */

// ─── Mock node-fetch before requiring any modules ────────────────────────────
const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);

// ─── Mock sharedDatabase to prevent transitive DB connections ────────────────
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({})),
}));

const XLSX = require('xlsx');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds a mock CSV string from a 2D array of rows (first row = headers).
 */
function buildCsvFromRows(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Creates a successful fetch Response mock returning CSV text.
 */
function mockCsvResponse(csvText) {
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve(csvText),
    headers: { get: () => 'text/csv' },
  });
}

/**
 * Creates a fetch Response mock returning JSON (for Apps Script).
 */
function mockJsonResponse(data, contentType = 'application/json') {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: { get: () => contentType },
  });
}

/**
 * Creates a fetch Response mock returning HTML (simulating Google redirect).
 */
function mockHtmlResponse(htmlBody = '<html><body>Moved Temporarily</body></html>') {
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve(htmlBody),
    json: () => { throw new SyntaxError('Unexpected token <'); },
    headers: { get: () => 'text/html' },
  });
}

// ─── Reload module between tests to reset internal cache ─────────────────────
let googleSheetsTools;

beforeEach(() => {
  jest.resetModules();
  mockFetch.mockReset();

  // Re-mock after resetModules
  jest.mock('node-fetch', () => mockFetch);
  jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn(() => ({})),
  }));

  googleSheetsTools = require('../../services/aiAgent/tools/googleSheetsTools');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: URL Parsing
// ═════════════════════════════════════════════════════════════════════════════

describe('Google Sheets URL Parsing', () => {
  test('parses standard spreadsheet edit URL', async () => {
    const csv = buildCsvFromRows([
      ['اسم المنتج', 'السعر'],
      ['تيشيرت قطن', '150'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit#gid=0' }
    );

    expect(result.totalFound).toBe(1);
    expect(result.products[0].name).toBe('تيشيرت قطن');
    // Verify the correct export URL was called
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('export?format=csv');
    expect(calledUrl).toContain('1aBcDeFgHiJkLmNoPqRsTuVwXyZ');
  });

  test('parses published /pubhtml link and converts to CSV export', async () => {
    const csv = buildCsvFromRows([
      ['name', 'price'],
      ['Blue Shirt', '200'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-abc123/pubhtml' }
    );

    expect(result.totalFound).toBe(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/pub?output=csv');
    expect(calledUrl).not.toContain('/pubhtml');
  });

  test('uses direct CSV URLs without transformation', async () => {
    const csv = buildCsvFromRows([
      ['name', 'price'],
      ['Direct Product', '100'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://example.com/my-catalog.csv' }
    );

    expect(result.totalFound).toBe(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://example.com/my-catalog.csv');
  });

  test('throws on invalid/empty URL', async () => {
    await expect(
      googleSheetsTools['googlesheets.searchProducts'].handler('comp_1', { sheetUrl: '' })
    ).rejects.toThrow('MISSING_SHEET_URL');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: In-Memory Cache
// ═════════════════════════════════════════════════════════════════════════════

describe('Google Sheets CSV Cache', () => {
  test('second call within 60s reuses cached CSV without network request', async () => {
    const csv = buildCsvFromRows([
      ['name', 'price'],
      ['Cached Product', '300'],
    ]);
    mockFetch.mockReturnValue(mockCsvResponse(csv));

    const url = 'https://docs.google.com/spreadsheets/d/CACHE_TEST_ID/edit';

    // First call fetches from network
    const result1 = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1', { sheetUrl: url }
    );
    expect(result1.totalFound).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const result2 = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1', { sheetUrl: url }
    );
    expect(result2.totalFound).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 fetch call
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: Index-Shift Immunity & First-Product Parsing
// ═════════════════════════════════════════════════════════════════════════════

describe('2D Array Parsing - Index Shift Immunity', () => {
  test('correctly reads all products even when some cells are empty', async () => {
    const csv = buildCsvFromRows([
      ['اسم المنتج', 'السعر', 'الكمية', 'الوصف', 'كود'],
      ['منتج كامل', '200', '10', 'وصف كامل', 'SKU-001'],
      ['منتج بدون وصف', '150', '5', '', ''],  // Empty description and SKU
      ['منتج بدون كود', '100', '3', 'وصف ثاني', ''],  // Empty SKU only
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1', { sheetUrl: 'https://docs.google.com/spreadsheets/d/INDEX_TEST/edit' }
    );

    expect(result.totalFound).toBe(3);

    // Verify first product has correct values (NOT shifted)
    expect(result.products[0]).toMatchObject({
      name: 'منتج كامل',
      price: 200,
      stock: 10,
      description: 'وصف كامل',
      sku: 'SKU-001',
    });

    // Verify second product with empty cells still has correct price (NOT shifted)
    expect(result.products[1]).toMatchObject({
      name: 'منتج بدون وصف',
      price: 150,
      stock: 5,
      description: '',
      sku: '',
    });

    // Third product
    expect(result.products[2]).toMatchObject({
      name: 'منتج بدون كود',
      price: 100,
      stock: 3,
      description: 'وصف ثاني',
    });
  });

  test('does NOT skip the first product in the sheet', async () => {
    const csv = buildCsvFromRows([
      ['name', 'price'],
      ['First Product', '100'],
      ['Second Product', '200'],
      ['Third Product', '300'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1', { sheetUrl: 'https://docs.google.com/spreadsheets/d/FIRST_PROD_TEST/edit' }
    );

    expect(result.totalFound).toBe(3);
    expect(result.products[0].name).toBe('First Product');
    expect(result.products[1].name).toBe('Second Product');
    expect(result.products[2].name).toBe('Third Product');
  });

  test('handles sheets with only header row gracefully', async () => {
    const csv = buildCsvFromRows([
      ['name', 'price', 'stock'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1', { sheetUrl: 'https://docs.google.com/spreadsheets/d/EMPTY_SHEET/edit' }
    );

    expect(result.totalFound).toBe(0);
    expect(result.products).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: Arabic Search Normalization
// ═════════════════════════════════════════════════════════════════════════════

describe('Arabic Search Normalization', () => {
  const arabicCatalogCsv = buildCsvFromRows([
    ['اسم المنتج', 'السعر', 'الكمية', 'الوصف'],
    ['تيشيرت أسود قطن', '250', '15', 'تيشيرت قطن طبيعي'],
    ['بنطلون جينز أزرق', '450', '8', 'بنطلون رجالي'],
    ['حذاء رياضة أبيض', '600', '20', 'كوتشي رياضي'],
    ['ساعة يد كلاسيكيه', '1200', '3', 'ساعه فاخره'],
  ]);

  test('finds products with different Alif forms (أسود vs اسود)', async () => {
    mockFetch.mockReturnValueOnce(mockCsvResponse(arabicCatalogCsv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://docs.google.com/spreadsheets/d/ARABIC_TEST/edit', searchQuery: 'اسود' }
    );

    expect(result.totalFound).toBe(1);
    expect(result.products[0].name).toBe('تيشيرت أسود قطن');
  });

  test('finds products with Teh Marbuta normalization (ة vs ه)', async () => {
    mockFetch.mockReturnValueOnce(mockCsvResponse(arabicCatalogCsv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://docs.google.com/spreadsheets/d/ARABIC_TEST/edit', searchQuery: 'ساعة' }
    );

    // Should match "ساعة يد كلاسيكيه" because ة normalizes to ه and "ساعه" in description also matches
    expect(result.totalFound).toBe(1);
    expect(result.products[0].name).toBe('ساعة يد كلاسيكيه');
  });

  test('searches across name, description, and category columns', async () => {
    mockFetch.mockReturnValueOnce(mockCsvResponse(arabicCatalogCsv));

    // "كوتشي" only exists in the description column, not in name
    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://docs.google.com/spreadsheets/d/ARABIC_TEST/edit', searchQuery: 'كوتشي' }
    );

    expect(result.totalFound).toBe(1);
    expect(result.products[0].name).toBe('حذاء رياضة أبيض');
  });

  test('returns all products when no search query is provided', async () => {
    mockFetch.mockReturnValueOnce(mockCsvResponse(arabicCatalogCsv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://docs.google.com/spreadsheets/d/ARABIC_TEST/edit' }
    );

    expect(result.totalFound).toBe(4);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: Data Leak Prevention (readProducts)
// ═════════════════════════════════════════════════════════════════════════════

describe('Data Leak Prevention - readProducts', () => {
  test('readProducts filters through parseProductsFromSheet, only exposing safe columns', async () => {
    const csv = buildCsvFromRows([
      ['اسم المنتج', 'السعر', 'سعر التكلفة', 'هامش الربح', 'الكمية'],
      ['منتج سري', '500', '200', '60%', '10'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.readProducts'].handler(
      'comp_1',
      { sheetUrl: 'https://docs.google.com/spreadsheets/d/LEAK_TEST/edit' }
    );

    expect(result.totalRows).toBe(1);
    const product = result.products[0];
    
    // Safe fields are present
    expect(product.name).toBe('منتج سري');
    expect(product.price).toBe(500);
    expect(product.stock).toBe(10);

    // Confidential fields are NOT present in the output
    expect(product).not.toHaveProperty('سعر التكلفة');
    expect(product).not.toHaveProperty('هامش الربح');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: Apps Script Order Submission Redirect Immunity
// ═════════════════════════════════════════════════════════════════════════════

describe('submitOrder - Apps Script Redirect & Error Handling', () => {
  test('handles normal JSON responses from Apps Script correctly', async () => {
    mockFetch.mockReturnValueOnce(mockJsonResponse({
      success: true,
      orderNumber: 'ORD-12345',
    }));

    const result = await googleSheetsTools['googlesheets.submitOrder'].handler(
      'comp_1',
      {
        appsScriptUrl: 'https://script.google.com/macros/s/ABC123/exec',
        customerName: 'أحمد محمد',
        customerPhone: '01012345678',
        productName: 'تيشيرت قطن',
        quantity: 2,
        price: 250,
      }
    );

    expect(result.success).toBe(true);
    expect(result.orderNumber).toBe('ORD-12345');
    expect(result.customerName).toBe('أحمد محمد');
    expect(result.total).toBe(500);
  });

  test('handles HTML redirect responses from Apps Script without crashing', async () => {
    mockFetch.mockReturnValueOnce(mockHtmlResponse(
      '<html><head><title>Moved</title></head><body>Moved Temporarily</body></html>'
    ));

    const result = await googleSheetsTools['googlesheets.submitOrder'].handler(
      'comp_1',
      {
        appsScriptUrl: 'https://script.google.com/macros/s/ABC123/exec',
        customerName: 'محمد علي',
        customerPhone: '01098765432',
        productName: 'بنطلون',
      }
    );

    // Should NOT crash, returns a structured failure with clear merchant guidance
    expect(result.success).toBe(false);
    expect(result.error).toBe('ORDER_SUBMISSION_FAILED');
    expect(result.errorMessage).toContain('HTML');
    expect(result.errorMessage).toContain('Web App');
  });

  test('handles plain text non-JSON responses gracefully', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('OK - order received'),
        headers: { get: () => 'text/plain' },
      })
    );

    const result = await googleSheetsTools['googlesheets.submitOrder'].handler(
      'comp_1',
      {
        appsScriptUrl: 'https://script.google.com/macros/s/ABC123/exec',
        customerName: 'سارة',
        customerPhone: '01055555555',
        productName: 'حقيبة',
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('ORDER_SUBMISSION_FAILED');
  });

  test('missing appsScriptUrl throws clear error', async () => {
    await expect(
      googleSheetsTools['googlesheets.submitOrder'].handler('comp_1', {
        customerName: 'أحمد',
        customerPhone: '010',
        productName: 'شيء',
      })
    ).rejects.toThrow('MISSING_APPS_SCRIPT_URL');
  });

  test('resolves appsScriptUrl from agent config when not provided directly', async () => {
    mockFetch.mockReturnValueOnce(mockJsonResponse({
      success: true,
      orderNumber: 'ORD-99999',
    }));

    const result = await googleSheetsTools['googlesheets.submitOrder'].handler(
      'comp_1',
      {
        customerName: 'خالد',
        customerPhone: '01011111111',
        productName: 'قميص',
      },
      { agent: { config: { ordersAppsScriptUrl: 'https://script.google.com/macros/s/FROM_CONFIG/exec' } } }
    );

    expect(result.success).toBe(true);
    expect(mockFetch.mock.calls[0][0]).toBe('https://script.google.com/macros/s/FROM_CONFIG/exec');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: Agent Config URL Resolution
// ═════════════════════════════════════════════════════════════════════════════

describe('Agent Config URL Resolution', () => {
  test('searchProducts uses productsSheetUrl from agent config when sheetUrl is not given', async () => {
    const csv = buildCsvFromRows([
      ['name', 'price'],
      ['Config Product', '999'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.searchProducts'].handler(
      'comp_1',
      {},
      { agent: { config: { productsSheetUrl: 'https://docs.google.com/spreadsheets/d/FROM_CONFIG/edit' } } }
    );

    expect(result.totalFound).toBe(1);
    expect(result.products[0].name).toBe('Config Product');
  });

  test('readProducts uses productsSheetUrl from agent config when sheetUrl is not given', async () => {
    const csv = buildCsvFromRows([
      ['name', 'price'],
      ['Admin Product', '111'],
    ]);
    mockFetch.mockReturnValueOnce(mockCsvResponse(csv));

    const result = await googleSheetsTools['googlesheets.readProducts'].handler(
      'comp_1',
      {},
      { agent: { config: { productsSheetUrl: 'https://docs.google.com/spreadsheets/d/ADMIN_CFG/edit' } } }
    );

    expect(result.totalRows).toBe(1);
    expect(result.products[0].name).toBe('Admin Product');
  });
});
