jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));
jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: jest.fn(() => () => {}),
  requireRole: jest.fn((roles) => {
    const middleware = () => {};
    middleware.__roles = roles;
    return middleware;
  }),
}));
jest.mock('../../controller/bookingPriceListsController', () => ({
  getAllPriceLists: jest.fn(), createPriceList: jest.fn(), resolveServicePrice: jest.fn(),
  updatePriceList: jest.fn(), deletePriceList: jest.fn(), getPriceListItems: jest.fn(),
  setPriceListItem: jest.fn(), removePriceListItem: jest.fn(),
}));
jest.mock('../../controller/bookingInvoicesController', () => ({
  openCashierShift: jest.fn(), getCurrentCashierShift: jest.fn(), getCashierShiftBalance: jest.fn(),
  closeCashierShift: jest.fn(), getAllInvoices: jest.fn(), createInvoiceFromAppointment: jest.fn(),
  getInvoiceById: jest.fn(), createInvoice: jest.fn(), updateInvoice: jest.fn(),
  addPayment: jest.fn(), paybackPayment: jest.fn(), deleteInvoice: jest.fn(),
}));
jest.mock('../../controller/bookingPatientsController', () => ({
  getAllPatients: jest.fn(), getPatientFull: jest.fn(), getPatientById: jest.fn(),
  mergePatients: jest.fn(), createPatient: jest.fn(), updatePatient: jest.fn(), deletePatient: jest.fn(),
}));
jest.mock('../../controller/bookingOperationsController', () => ({
  getUnprintedLabels: jest.fn(), getPrintedLabels: jest.fn(), printLabel: jest.fn(),
  getDeliveries: jest.fn(), markReady: jest.fn(), markDelivered: jest.fn(),
  getTransactions: jest.fn(), logTransaction: jest.fn(),
}));
jest.mock('../../controller/bookingWorkflowController', () => ({
  updateBookingStatus: jest.fn(), updateReportStatus: jest.fn(), assignDoctor: jest.fn(),
  markDeliveredWithoutReport: jest.fn(), markResultDelivered: jest.fn(),
  receptionQueue: jest.fn(), doctorWorklist: jest.fn(), reportWorklist: jest.fn(),
}));
jest.mock('../../controller/bookingReferringPhysiciansController', () => ({
  getAllReferringPhysicians: jest.fn(), createReferringPhysician: jest.fn(),
  updateReferringPhysician: jest.fn(), deleteReferringPhysician: jest.fn(),
}));

const { requireRole } = require('../../utils/verifyToken');

const STAFF_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

const hasRoleGuard = (handles) =>
  handles.some((h) => Array.isArray(h && h.__roles) && JSON.stringify(h.__roles) === JSON.stringify(STAFF_ROLES));

const collectRoutes = (router) => {
  const routes = [];
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const method of Object.keys(layer.route.methods)) {
      routes.push({
        method: method.toUpperCase(),
        path: layer.route.path,
        handles: layer.route.stack.map((h) => h.handle),
      });
    }
  }
  return routes;
};

const expectGated = (routes, method, path) => {
  const route = routes.find((r) => r.method === method && r.path === path);
  expect(route).toBeDefined();
  expect(hasRoleGuard(route.handles)).toBe(true);
};

const expectNotGated = (routes, method, path) => {
  const route = routes.find((r) => r.method === method && r.path === path);
  expect(route).toBeDefined();
  expect(hasRoleGuard(route.handles)).toBe(false);
};

describe('booking routes — role gating of sensitive endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bookingPriceListsRoutes', () => {
    const routes = collectRoutes(require('../../routes/bookingPriceListsRoutes'));

    test('gates price-list writes (create/update/delete + item edits) to staff roles', () => {
      expectGated(routes, 'POST', '/');
      expectGated(routes, 'PUT', '/:id');
      expectGated(routes, 'DELETE', '/:id');
      expectGated(routes, 'PUT', '/:id/items/:serviceId');
      expectGated(routes, 'DELETE', '/:id/items/:serviceId');
    });

    test('leaves price-list reads open to any authenticated user', () => {
      expectNotGated(routes, 'GET', '/');
      expectNotGated(routes, 'GET', '/resolve/:serviceId');
      expectNotGated(routes, 'GET', '/:id/items');
    });
  });

  describe('bookingInvoicesRoutes', () => {
    const routes = collectRoutes(require('../../routes/bookingInvoicesRoutes'));

    test('gates invoice accounting writes and cashier shift open/close to staff roles', () => {
      expectGated(routes, 'POST', '/cashier-shifts');
      expectGated(routes, 'PUT', '/cashier-shifts/:id/close');
      expectGated(routes, 'POST', '/');
      expectGated(routes, 'PUT', '/:id');
      expectGated(routes, 'POST', '/:id/payments');
      expectGated(routes, 'POST', '/:id/payback');
      expectGated(routes, 'DELETE', '/:id');
      expectGated(routes, 'POST', '/from-appointment/:appointmentId');
    });

    test('leaves invoice reads open to any authenticated user', () => {
      expectNotGated(routes, 'GET', '/');
      expectNotGated(routes, 'GET', '/:id');
      expectNotGated(routes, 'GET', '/cashier-shifts/current');
      expectNotGated(routes, 'GET', '/cashier-shifts/balance');
    });
  });

  describe('bookingPatientsRoutes', () => {
    const routes = collectRoutes(require('../../routes/bookingPatientsRoutes'));

    test('gates patient merge to staff roles', () => {
      expectGated(routes, 'POST', '/:id/merge');
    });

    test('leaves patient CRUD and full-record reads open to any authenticated user', () => {
      expectNotGated(routes, 'GET', '/');
      expectNotGated(routes, 'GET', '/:id');
      expectNotGated(routes, 'GET', '/:id/full');
      expectNotGated(routes, 'POST', '/');
      expectNotGated(routes, 'PUT', '/:id');
      expectNotGated(routes, 'DELETE', '/:id');
    });
  });

  describe('bookingOperationsRoutes', () => {
    const routes = collectRoutes(require('../../routes/bookingOperationsRoutes'));

    test('gates label printing, delivery updates and audit-log writes to staff roles', () => {
      expectGated(routes, 'POST', '/labels');
      expectGated(routes, 'PUT', '/deliveries/:id/ready');
      expectGated(routes, 'PUT', '/deliveries/:id/delivered');
      expectGated(routes, 'POST', '/transactions');
    });

    test('leaves operations reads open to any authenticated user', () => {
      expectNotGated(routes, 'GET', '/labels/unprinted');
      expectNotGated(routes, 'GET', '/labels/printed');
      expectNotGated(routes, 'GET', '/deliveries');
      expectNotGated(routes, 'GET', '/transactions');
    });
  });

  describe('bookingWorkflowRoutes', () => {
    const routes = collectRoutes(require('../../routes/bookingWorkflowRoutes'));

    test('gates workflow status changes to staff roles', () => {
      expectGated(routes, 'PUT', '/appointments/:id/booking-status');
      expectGated(routes, 'PUT', '/appointments/:id/report-status');
      expectGated(routes, 'PUT', '/appointments/:id/assign-doctor');
      expectGated(routes, 'PUT', '/appointments/:id/delivered-without-report');
      expectGated(routes, 'PUT', '/appointments/:id/result-delivered');
    });

    test('leaves workflow queues open to any authenticated user', () => {
      expectNotGated(routes, 'GET', '/queues/reception');
      expectNotGated(routes, 'GET', '/queues/doctor');
      expectNotGated(routes, 'GET', '/queues/reports');
    });
  });

  describe('bookingReferringPhysiciansRoutes', () => {
    const routes = collectRoutes(require('../../routes/bookingReferringPhysiciansRoutes'));

    test('gates referring-physician writes to staff roles', () => {
      expectGated(routes, 'POST', '/');
      expectGated(routes, 'PUT', '/:id');
      expectGated(routes, 'DELETE', '/:id');
    });

    test('leaves referring-physician list open to any authenticated user', () => {
      expectNotGated(routes, 'GET', '/');
    });
  });
});
