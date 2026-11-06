/**
 * TICKET-2026-11-06-RBAC-01 — F-01 & F-03 (controller layer).
 *
 *  - F-01: خطأ الدور الممنوع من employeeService يتحول إلى 403 في الـ controller.
 *  - F-03: AGENT لا يستلم baseSalary / nationalId / phone من GET /hr/employees،
 *          مع بقاء شكل الاستجابة كما هو للمصرح لهم.
 */
jest.mock('../../services/hr', () => ({
  employeeService: {
    getEmployees: jest.fn(),
    createEmployee: jest.fn(),
    updateEmployee: jest.fn(),
  },
  departmentService: {},
  attendanceService: {},
  leaveService: {},
  payrollService: {},
  documentService: {},
  salaryHistoryService: {},
  performanceService: {},
  trainingService: {},
  warningService: {},
  promotionService: {},
  shiftService: {},
  benefitService: {},
  goalService: {},
  feedbackService: {},
  resignationService: {},
  policyService: {},
  permissionService: {},
  advanceService: {},
  recruitmentService: {},
}));

const { UnauthorizedError } = require('../../utils/hrErrors');
const { employeeService } = require('../../services/hr');
const hrController = require('../../controller/hrController');

const createResponseMock = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
  send(payload) {
    this.payload = payload;
    return this;
  },
});

const employeeFixture = () => ({
  id: 'u1',
  firstName: 'Sara',
  lastName: 'Ali',
  email: 'sara@example.com',
  phone: '01000000000',
  mobile: '01000000000',
  nationalId: '29001010101010',
  baseSalary: 15000,
  contractType: 'FULL_TIME',
  hireDate: '2024-01-01',
});

const callGetEmployees = async (role) => {
  employeeService.getEmployees.mockResolvedValue({
    employees: [employeeFixture()],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });

  const req = { user: { id: 'caller-1', companyId: 'company-1', role }, query: {} };
  const res = createResponseMock();
  await hrController.getEmployees(req, res);
  return res;
};

describe('hrController employee security (F-01 / F-03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /hr/employees hides salary, national id and phone from AGENT', async () => {
    const res = await callGetEmployees('AGENT');

    expect(res.statusCode).toBe(200);
    const [employee] = res.payload.employees;
    expect(employee.baseSalary).toBeUndefined();
    expect(employee.nationalId).toBeUndefined();
    expect(employee.phone).toBeUndefined();
    expect(employee.mobile).toBeUndefined();
    expect(employee.firstName).toBe('Sara');
    expect(res.payload.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  test('GET /hr/employees keeps the full payload for MANAGER (shape stable)', async () => {
    const res = await callGetEmployees('MANAGER');

    expect(res.statusCode).toBe(200);
    expect(res.payload.employees[0]).toEqual(employeeFixture());
  });

  test('POST /hr/employees maps a forbidden role error to 403', async () => {
    employeeService.createEmployee.mockRejectedValue(
      new UnauthorizedError('غير مصرح بتعيين الدور "SUPER_ADMIN" من مسار إدارة الموظفين')
    );

    const res = createResponseMock();
    await hrController.createEmployee(
      {
        user: { id: 'manager-1', companyId: 'company-1', role: 'MANAGER' },
        body: { email: 'x@y.com', firstName: 'X', lastName: 'Y', role: 'SUPER_ADMIN' },
      },
      res
    );

    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
    expect(res.payload.code).toBe('UNAUTHORIZED');
  });
});
