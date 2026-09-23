const courierService = require('../../services/courierService');

describe('Courier Service Module Unit Tests', () => {
  it('should export all essential courier management functions', () => {
    expect(typeof courierService.listCouriers).toBe('function');
    expect(typeof courierService.getCourierById).toBe('function');
    expect(typeof courierService.createCourier).toBe('function');
    expect(typeof courierService.updateCourier).toBe('function');
    expect(typeof courierService.deleteCourier).toBe('function');
    expect(typeof courierService.createDeliveryRun).toBe('function');
    expect(typeof courierService.listDeliveryRuns).toBe('function');
    expect(typeof courierService.getDeliveryRunById).toBe('function');
    expect(typeof courierService.updateDeliveryRunShipment).toBe('function');
    expect(typeof courierService.settleDeliveryRun).toBe('function');
    expect(typeof courierService.getCourierDashboardSummary).toBe('function');
  });
});
