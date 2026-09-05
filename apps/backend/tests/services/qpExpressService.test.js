/**
 * Tests for QP Express Shipping Service
 */

const QpExpressCityMapper = require('../../services/qpExpress/qpExpressCityMapper');
const QpExpressShipmentService = require('../../services/qpExpress/qpExpressShipmentService');
const QpExpressTrackingService = require('../../services/qpExpress/qpExpressTrackingService');
const QpExpressService = require('../../services/qpExpressService');

describe('QpExpressCityMapper', () => {
  test('should resolve Egyptian cities by Arabic name', () => {
    expect(QpExpressCityMapper.getCityId('القاهرة')).toBe(1);
    expect(QpExpressCityMapper.getCityId('قاهرة')).toBe(1);
    expect(QpExpressCityMapper.getCityId('الإسكندرية')).toBe(2);
    expect(QpExpressCityMapper.getCityId('الجيزة')).toBe(3);
    expect(QpExpressCityMapper.getCityId('القليوبية')).toBe(4);
    expect(QpExpressCityMapper.getCityId('أسيوط')).toBe(26);
    expect(QpExpressCityMapper.getCityId('طنطا')).toBe(15); // Gharbia
    expect(QpExpressCityMapper.getCityId('المنصورة')).toBe(21); // Dakahlia
  });

  test('should resolve cities by English aliases', () => {
    expect(QpExpressCityMapper.getCityId('cairo')).toBe(1);
    expect(QpExpressCityMapper.getCityId('alexandria')).toBe(2);
    expect(QpExpressCityMapper.getCityId('giza')).toBe(3);
    expect(QpExpressCityMapper.getCityId('tanta')).toBe(15);
    expect(QpExpressCityMapper.getCityId('mansoura')).toBe(21);
    expect(QpExpressCityMapper.getCityId('aswan')).toBe(6);
  });

  test('should return correct city name for cityId', () => {
    expect(QpExpressCityMapper.getCityName(1)).toBe('قاهره');
    expect(QpExpressCityMapper.getCityName(2)).toBe('اسكندريه');
    expect(QpExpressCityMapper.getCityName(3)).toBe('جيزة');
  });

  test('should return all 29 supported cities', () => {
    const cities = QpExpressCityMapper.getAllCities();
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThanOrEqual(25);
    expect(cities.some(c => c.name === 'قاهره')).toBe(true);
  });
});

describe('QpExpressShipmentService', () => {
  const mockClient = {
    customerId: 8002,
    post: jest.fn(),
  };
  const shipmentService = new QpExpressShipmentService(mockClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should format shipment contents correctly', () => {
    const items = [
      { product: { title: 'فستان صيفي' }, color: 'أزرق', size: 'M', quantity: 2 },
      { title: 'طرحة حرير', quantity: 1 }
    ];
    const contents = shipmentService.formatShipmentContents(items);
    expect(contents).toContain('فستان صيفي (M - أزرق) × 2');
    expect(contents).toContain('طرحة حرير × 1');
  });

  test('should clean Egyptian phone numbers', () => {
    expect(shipmentService.cleanPhoneNumber('+201005784114')).toBe('01005784114');
    expect(shipmentService.cleanPhoneNumber('201005784114')).toBe('01005784114');
    expect(shipmentService.cleanPhoneNumber('011 5894 7208')).toBe('01158947208');
  });

  test('should format address properly', () => {
    const addrObj = {
      street: 'شارع النصر',
      building: 'عمارة 5',
      floor: '3',
      apartment: '12',
      area: 'المعادي',
      city: 'القاهرة'
    };
    const formatted = shipmentService.formatAddress(addrObj);
    expect(formatted).toContain('شارع النصر');
    expect(formatted).toContain('عمارة 5');
    expect(formatted).toContain('دور 3');
    expect(formatted).toContain('شقة 12');
  });

  test('should create shipment payload and call API', async () => {
    mockClient.post.mockResolvedValueOnce({
      serial: 21139999,
      Order_Delivery_Status: '1',
      total_amount: 650,
      total_fees: 65,
      city: 'قاهره',
      city_id: 1,
      notes: 'المعاينة في وجود المندوب',
    });

    const orderData = {
      orderId: 'cl123456',
      orderNumber: 'MAXP-5501',
      customerName: 'سارة أحمد',
      customerPhone: '01012345678',
      shippingAddress: 'شارع فيصل الرئيسي',
      city: 'الجيزة',
      totalAmount: 650,
      items: [{ title: 'حقيبة يد', quantity: 1 }],
      notes: 'المعاينة في وجود المندوب',
    };

    const result = await shipmentService.createShipment(orderData);

    expect(mockClient.post).toHaveBeenCalledWith(
      '/addorders/order/',
      expect.objectContaining({
        customer: 8002,
        full_name: 'سارة أحمد',
        phone: '01012345678',
        city: '3', // Giza id
        total_amount: 650,
        customer_serial: 'MAXP-5501',
      })
    );

    expect(result.success).toBe(true);
    expect(result.serial).toBe(21139999);
    expect(result.trackingNumber).toBe('21139999');
  });
});

describe('QpExpressTrackingService', () => {
  const mockClient = {
    get: jest.fn(),
  };
  const trackingService = new QpExpressTrackingService(mockClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should map status codes correctly', () => {
    expect(trackingService.mapStatus('1').code).toBe('PENDING');
    expect(trackingService.mapStatus('2').code).toBe('OUT_FOR_DELIVERY');
    expect(trackingService.mapStatus('3').code).toBe('DELIVERED');
    expect(trackingService.mapStatus('5').code).toBe('RETURNED');
  });

  test('should parse tracking response successfully', async () => {
    mockClient.get.mockResolvedValueOnce([
      {
        serial: 21138036,
        customer_serial: 'MAXP-1002',
        Order_Delivery_Status: '3',
        StatusNote: 'استلم ب 685',
        shipper: 'محمد مبارك',
        shipper_phone: '01060586747',
        city: 'اسيوط',
        full_name: 'ايمان حسين',
        phone: '01158947208',
        total_amount: '685.00',
        total_fees: '85.00',
        Collected_shipper: true,
      }
    ]);

    const result = await trackingService.trackShipment('21138036');

    expect(result.found).toBe(true);
    expect(result.serial).toBe(21138036);
    expect(result.status).toBe('DELIVERED');
    expect(result.statusNote).toBe('استلم ب 685');
    expect(result.driverName).toBe('محمد مبارك');
    expect(result.isCollectedFromShipper).toBe(true);
  });
});

describe('QpExpressService (Facade)', () => {
  test('should instantiate with default configuration', () => {
    const service = new QpExpressService();
    expect(service).toBeDefined();
    expect(service.getCities().length).toBeGreaterThan(0);
    expect(service.getCityId('القاهرة')).toBe(1);
  });
});
