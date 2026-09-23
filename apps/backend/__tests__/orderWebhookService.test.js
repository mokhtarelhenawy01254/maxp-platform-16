const {
  generateSecret,
  signPayload,
  buildFullOrderPayload,
} = require('../services/orderWebhookService');
const crypto = require('crypto');

describe('OrderWebhookService', () => {
  describe('Secret Generation and HMAC-SHA256 Signing', () => {
    test('generateSecret returns a high-entropy secret starting with whsec_', () => {
      const secret = generateSecret();
      expect(typeof secret).toBe('string');
      expect(secret.startsWith('whsec_')).toBe(true);
      expect(secret.length).toBeGreaterThan(60);
    });

    test('signPayload correctly calculates HMAC-SHA256 hex digest', () => {
      const secret = 'test_secret_key_12345';
      const payload = JSON.stringify({ event: 'order.created', test: true });

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      const actualSignature = signPayload(payload, secret);
      expect(actualSignature).toBe(expectedSignature);
      expect(actualSignature).toMatch(/^[a-f0-9]{64}$/);
    });

    test('signPayload handles whsec_ prefix seamlessly', () => {
      const rawSecret = 'a1b2c3d4e5f6';
      const prefixedSecret = 'whsec_a1b2c3d4e5f6';
      const payload = '{"msg":"hello"}';

      const sig1 = signPayload(payload, rawSecret);
      const sig2 = signPayload(payload, prefixedSecret);

      expect(sig1).toBe(sig2);
    });
  });

  describe('Comprehensive Order Payload Assembly', () => {
    test('buildFullOrderPayload includes all customer, phone, address, item variants, pricing, and UTM/IP telemetry', () => {
      const dummyOrder = {
        id: 'ord_123456789',
        orderNumber: 'ORD-998877',
        status: 'PENDING',
        customStatusCode: 'NEW_ORDER',
        sourceType: 'storefront',
        orderSource: 'REGULAR',
        createdAt: new Date('2026-09-23T20:00:00Z'),
        updatedAt: new Date('2026-09-23T20:00:00Z'),
        subtotal: 1000,
        shipping: 50,
        discount: 100,
        tax: 0,
        total: 950,
        currency: 'EGP',
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        notes: 'يرجى الاتصال قبل الوصول على 01223344556',
        confirmationNotes: 'تم التأكيد هاتفياً',
        customerName: 'محمد أحمد علي',
        customerPhone: '01011223344',
        customerEmail: 'mohamed@example.com',
        customerAddress: 'شارع الهرم، الجيزة',
        shippingAddress: JSON.stringify({
          name: 'محمد أحمد علي',
          phone: '01011223344',
          secondaryPhone: '01155667788',
          street: 'شارع الهرم',
          building: '12 أ',
          floor: '5',
          apartment: '20',
          landmark: 'بجوار محطة مترو الجيزة',
          city: 'الهرم',
          governorate: 'الجيزة',
          country: 'EG',
        }),
        customer: {
          id: 'cust_001',
          firstName: 'محمد',
          lastName: 'أحمد علي',
          phone: '01011223344',
          phoneNormalized: '+201011223344',
          email: 'mohamed@example.com',
          notes: 'عميل دائم',
        },
        orderItems: [
          {
            id: 'item_1',
            productId: 'prod_99',
            productName: 'حذاء رياضي كلاسيك',
            productSku: 'SHOE-WHT-42',
            productImage: 'https://cdn.example.com/shoe.jpg',
            quantity: 1,
            price: 1000,
            total: 1000,
            basePrice: 650,
            merchantPrice: 750,
            productColor: 'أبيض',
            productSize: '42',
            productVariant: {
              id: 'var_88',
              color: 'أبيض',
              size: '42',
              sku: 'SHOE-WHT-42',
              attributes: { color: 'أبيض', size: '42' },
            },
          },
        ],
        metadata: JSON.stringify({
          couponCode: 'SALE100',
          discountReason: 'خصم عروض الخريف',
          attribution: {
            utm_source: 'tiktok',
            utm_medium: 'cpc',
            utm_campaign: 'autumn_launch',
            utm_content: 'video_clip_2',
            utm_term: 'sneakers',
            platform: 'tiktok',
            referrer: 'https://www.tiktok.com/',
            landingPath: '/products/shoe-classic',
            ttclid: 'tt_click_123',
            fbclid: null,
            adId: 'ad_987',
          },
          sessionDetails: {
            ip: '197.35.40.12',
            ipCity: 'Giza',
            ipGovernorate: 'Giza',
            ipCountry: 'EG',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            durationSeconds: 210,
            pagesVisited: [{ path: '/shop' }, { path: '/checkout' }],
            firstSeenAt: '2026-09-23T19:56:30Z',
          },
        }),
      };

      const dummyCompany = {
        id: 'comp_test',
        name: 'متجر سوان',
        slug: 'swan',
        currency: 'EGP',
      };

      const payload = buildFullOrderPayload({
        order: dummyOrder,
        company: dummyCompany,
        event: 'order.created',
      });

      expect(payload.event).toBe('order.created');
      expect(payload.company.id).toBe('comp_test');
      expect(payload.company.name).toBe('متجر سوان');

      // Order
      expect(payload.order.orderNumber).toBe('ORD-998877');
      expect(payload.order.status).toBe('PENDING');

      // Customer & Phones
      expect(payload.order.customer.name).toBe('محمد أحمد علي');
      expect(payload.order.customer.firstName).toBe('محمد');
      expect(payload.order.customer.phone).toBe('01011223344');
      expect(payload.order.customer.secondaryPhone).toBe('01155667788');
      expect(payload.order.customer.allPhones).toContain('01011223344');
      expect(payload.order.customer.allPhones).toContain('01155667788');
      expect(payload.order.customer.email).toBe('mohamed@example.com');

      // Shipping & Address
      expect(payload.order.shipping.street).toBe('شارع الهرم');
      expect(payload.order.shipping.building).toBe('12 أ');
      expect(payload.order.shipping.floor).toBe('5');
      expect(payload.order.shipping.apartment).toBe('20');
      expect(payload.order.shipping.governorate).toBe('الجيزة');
      expect(payload.order.shipping.shippingCost).toBe(50);

      // Financials
      expect(payload.order.financials.subtotal).toBe(1000);
      expect(payload.order.financials.shippingCost).toBe(50);
      expect(payload.order.financials.discountAmount).toBe(100);
      expect(payload.order.financials.total).toBe(950);
      expect(payload.order.financials.couponCode).toBe('SALE100');
      expect(payload.order.financials.discountReason).toBe('خصم عروض الخريف');

      // Items & Variants
      expect(payload.order.items.length).toBe(1);
      expect(payload.order.items[0].productName).toBe('حذاء رياضي كلاسيك');
      expect(payload.order.items[0].variant.color).toBe('أبيض');
      expect(payload.order.items[0].variant.size).toBe('42');
      expect(payload.order.items[0].basePrice).toBe(650);

      // Notes
      expect(payload.order.notes.customerNotes).toBe('يرجى الاتصال قبل الوصول على 01223344556');
      expect(payload.order.notes.confirmationNotes).toBe('تم التأكيد هاتفياً');

      // Attribution (UTM)
      expect(payload.order.attribution.utm_source).toBe('tiktok');
      expect(payload.order.attribution.utm_medium).toBe('cpc');
      expect(payload.order.attribution.utm_campaign).toBe('autumn_launch');
      expect(payload.order.attribution.ttclid).toBe('tt_click_123');

      // Telemetry (IP)
      expect(payload.order.telemetry.clientIp).toBe('197.35.40.12');
      expect(payload.order.telemetry.ipGovernorate).toBe('Giza');
      expect(payload.order.telemetry.durationSeconds).toBe(210);
    });
  });
});
