jest.mock('dotenv', () => ({ config: jest.fn() }), { virtual: true });
jest.mock('../../services/ensureLocalPostgres', () => ({ ensureLocalPostgres: jest.fn() }), { virtual: true });

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  }));
}, { virtual: true });

const {
  mapRegularOrderToSimple,
  stripPreparationTransientFields,
} = require('../../services/preparationQueueService');

describe('Preparation Queue Payload Size Measurement (Wave 2 Item 5)', () => {
  function generateRealisticOrder(index, metadataExtraBytes = 0) {
    const paddedIndex = String(index).padStart(5, '0');
    let extraBlob = '';
    if (metadataExtraBytes > 0) {
      extraBlob = 'x'.repeat(metadataExtraBytes);
    }

    return {
      id: `ord-uuid-${paddedIndex}`,
      orderNumber: `ORD-${paddedIndex}`,
      customerName: `أحمد محمد عبد الرحمن محمود ${index}`,
      customerPhone: `010${String(10000000 + index).slice(0, 8)}`,
      customerEmail: `customer_${index}@example.com`,
      customerAddress: `شقة ${index}، عمارة ${index % 50}، شارع النصر المتفرع من شارع الجمهورية، المعادي، القاهرة`,
      city: 'المعادي',
      governorate: 'القاهرة',
      total: 1250.50,
      subtotal: 1200.00,
      tax: 0,
      shipping: 50.50,
      status: 'PROCESSING',
      paymentStatus: 'pending',
      paymentMethod: 'CASH',
      shippingAddress: JSON.stringify({
        address: `شقة ${index}، عمارة ${index % 50}، شارع النصر، المعادي`,
        city: 'المعادي',
        governorate: 'القاهرة',
      }),
      orderItems: [
        {
          id: `item-1-${index}`,
          productId: `prod-100-${index % 20}`,
          variantId: `var-200-${index % 40}`,
          productName: `طقم فرش دواسات جلد فاخر للسيارات الموديلات الحديثة طراز رقم ${index % 10}`,
          price: 600,
          quantity: 1,
          total: 600,
          productColor: 'أسود مع تطريز أحمر',
          productSize: 'كبير',
          metadata: JSON.stringify({
            color: 'أسود مع تطريز أحمر',
            size: 'كبير',
            carModel: 'تويوتا كورولا 2024 فئة ثانية',
            customAttributes: {
              car_model: 'تويوتا كورولا 2024 فئة ثانية',
              year: '2024',
              transmission: 'أوتوماتيك',
            },
            customFields: {
              notes: 'يرجى التأكد من تطابق مقاسات الدواسة الخلفية',
            },
          }),
        },
        {
          id: `item-2-${index}`,
          productId: `prod-101-${index % 20}`,
          variantId: null,
          productName: `غطاء واقي لعجلة القيادة من السيليكون المانع للانزلاق مقاوم للحرارة`,
          price: 300,
          quantity: 2,
          total: 600,
          productColor: 'كربوني رمادي',
          productSize: 'قياسي',
          metadata: JSON.stringify({
            color: 'كربوني رمادي',
            size: 'قياسي',
          }),
        },
      ],
      shipments: [
        {
          id: `ship-${index}`,
          trackingNumber: `TRK-TURBO-${100000 + index}`,
          externalShipmentId: `EXT-${500000 + index}`,
          status: 'SHIPPED',
          carrierType: 'TURBO',
        },
      ],
      notes: `ملاحظات العميل: يرجى الاتصال قبل التوصيل بنصف ساعة للتأكد من وجود المستلم بالمنزل (رقم ${index})`,
      createdAt: new Date('2026-10-14T08:00:00Z'),
      updatedAt: new Date('2026-10-14T08:30:00Z'),
      orderInvoice: {
        printCount: 1,
        printedAt: new Date('2026-10-14T08:15:00Z'),
      },
      metadata: JSON.stringify({
        preparationStatus: 'PREPARING',
        preparationStatusUpdatedAt: '2026-10-14T08:10:00.000Z',
        source: 'storefront',
        utm_source: 'facebook_ads',
        utm_campaign: 'autumn_sale_2026',
        ipAddress: '156.204.120.45',
        device: 'iPhone 15 Pro Max Safari Mobile',
        walletPaymentProof: null,
        notesHistory: [
          { date: '2026-10-14T08:05:00Z', author: 'System', text: 'Order confirmed automatically' },
          { date: '2026-10-14T08:10:00Z', author: 'Warehouse Mgr', text: 'Moved to preparing queue' },
        ],
        extraPadding: extraBlob,
      }),
      isViewed: true,
      customStatusCode: null,
      sourceType: 'STOREFRONT',
      extractionMethod: 'WEB_FORM',
      orderSource: 'REGULAR',
      conversationId: null,
      conversation: null,
      affiliateId: null,
      affiliate: null,
      createdBy: 'sys-user-1',
      createdByName: 'متجر سوان الإلكتروني',
      createdByUser: null,
    };
  }

  test('measures exact payload size for 96 preparation orders (realistic standard workload)', () => {
    const rawOrders = [];
    for (let i = 1; i <= 96; i++) {
      rawOrders.push(generateRealisticOrder(i, 0));
    }

    const mappedOrders = rawOrders.map(o => mapRegularOrderToSimple(o));
    const paginatedOrders = mappedOrders.map(stripPreparationTransientFields);

    const fullApiResponse = {
      success: true,
      data: paginatedOrders,
      pagination: {
        total: 96,
        page: 1,
        limit: 96,
        pages: 1,
      },
      summary: {
        filteredTotal: 96,
        visibleTotal: 96,
        stageCounts: { ALL: 96, PREPARING: 96 },
        statusCounts: { PROCESSING: 96 },
        readyCount: 80,
        shortageCount: 16,
        shortageHoldCount: 0,
        onHoldPrepCount: 0,
        overdueShortageFollowUpCount: 0,
        overdueProblemFollowUpCount: 0,
        readyToShipCount: 0,
        allOverdueShortageFollowUpCount: 0,
        allOverdueProblemFollowUpCount: 0,
      },
      shortageOwnerOptions: ['أحمد أمين المخزن', 'محمود مسؤول النواقص'],
    };

    const jsonString = JSON.stringify(fullApiResponse);
    const byteLength = Buffer.byteLength(jsonString, 'utf8');
    const kbLength = (byteLength / 1024).toFixed(2);
    const mbLength = (byteLength / (1024 * 1024)).toFixed(3);

    console.log(`\n======================================================`);
    console.log(`📊 PREPARATION QUEUE (96 Orders) PAYLOAD SIZE:`);
    console.log(`   - Raw Bytes: ${byteLength.toLocaleString()} bytes`);
    console.log(`   - Size in KB: ${kbLength} KB`);
    console.log(`   - Size in MB: ${mbLength} MB`);
    console.log(`   - Average per Order: ${(byteLength / 96 / 1024).toFixed(2)} KB`);
    console.log(`   - Threshold Status: ${byteLength < 1024 * 1024 ? '✅ UNDER 1MB (No trimming needed)' : '⚠️ OVER 1MB (Trimming required)'}`);
    console.log(`======================================================\n`);

    expect(paginatedOrders.length).toBe(96);
    expect(byteLength).toBeGreaterThan(0);
  });

  test('measures stress-test payload with 5KB heavy metadata per order', () => {
    const rawOrders = [];
    for (let i = 1; i <= 96; i++) {
      rawOrders.push(generateRealisticOrder(i, 5000));
    }

    const mappedOrders = rawOrders.map(o => mapRegularOrderToSimple(o));
    const paginatedOrders = mappedOrders.map(stripPreparationTransientFields);

    const fullApiResponse = {
      success: true,
      data: paginatedOrders,
      pagination: { total: 96, page: 1, limit: 96, pages: 1 },
      summary: {},
      shortageOwnerOptions: [],
    };

    const jsonString = JSON.stringify(fullApiResponse);
    const byteLength = Buffer.byteLength(jsonString, 'utf8');
    const kbLength = (byteLength / 1024).toFixed(2);
    const mbLength = (byteLength / (1024 * 1024)).toFixed(3);

    console.log(`\n======================================================`);
    console.log(`📊 STRESS TEST (96 Orders with 5KB heavy metadata each):`);
    console.log(`   - Raw Bytes: ${byteLength.toLocaleString()} bytes`);
    console.log(`   - Size in KB: ${kbLength} KB`);
    console.log(`   - Size in MB: ${mbLength} MB`);
    console.log(`======================================================\n`);

    expect(paginatedOrders.length).toBe(96);
  });
});
