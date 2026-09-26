jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  getSharedPrismaClientAsync: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  getPolicies,
  updatePolicies,
  normalizeLabPoliciesInput,
  setWorkTypeStages,
  getWorkTypeStages,
} = require('../../controller/dentalPolicyController');
const dentalLabController = require('../../controller/dentalLabController');
const {
  getLabPolicies,
  isTechnicianOnDuty,
  selectTechnicianForAssignment,
  runGlobalDentalEscalation,
  runEscalationCheck,
} = require('../../services/dentalAssignmentService');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    }),
  };
  return response;
};

describe('Dental Lab Policies, Strategies, and Automation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Policy Key Normalization & Backward Compatibility', () => {
    test('normalizes legacy UI keys into canonical engine keys', () => {
      const legacyInput = {
        assignment: {
          mode: 'AUTO',
          strategy: 'LEAST_LOAD',
          respectWorkingDays: false,
          respectDailyCap: true,
          dailyCapPerTechnician: 10,
        },
        escalation: {
          enabled: true,
          escalationHours: 36,
          notifyOwnerOnOverdue: true,
        },
        dueDate: {
          defaultLeadDays: 4,
          urgentReductionPercent: 40,
        },
      };

      const normalized = normalizeLabPoliciesInput(legacyInput);

      expect(normalized.assignment.mode).toBe('AUTO');
      expect(normalized.assignment.strategy).toBe('LEAST_LOADED');
      expect(normalized.assignment.respectSchedule).toBe(false);
      expect(normalized.assignment.dailyCapPerTechnician).toBe(10);
      expect(normalized.escalation.afterHoursInStage).toBe(36);
      expect(normalized.escalation.notify).toBe(true);
      expect(normalized.dueDate.defaultLeadDays).toBe(4);
      expect(normalized.dueDate.urgentRule).toBe('PERCENT');
      expect(normalized.dueDate.urgentValue).toBe(40);
    });

    test('accepts canonical engine keys directly without alteration', () => {
      const canonicalInput = {
        assignment: {
          mode: 'SUGGEST',
          strategy: 'ROUND_ROBIN',
          respectSchedule: true,
          stageScope: 'STAGE',
        },
        escalation: {
          enabled: true,
          afterHoursInStage: 48,
          target: 'BACKUP_ROLE',
          maxLevels: 2,
        },
        dueDate: {
          fromWorkType: true,
          urgentRule: 'DAYS',
          urgentValue: 2,
          minDays: 1,
        },
      };

      const normalized = normalizeLabPoliciesInput(canonicalInput);

      expect(normalized.assignment.strategy).toBe('ROUND_ROBIN');
      expect(normalized.assignment.respectSchedule).toBe(true);
      expect(normalized.escalation.afterHoursInStage).toBe(48);
      expect(normalized.dueDate.urgentRule).toBe('DAYS');
      expect(normalized.dueDate.urgentValue).toBe(2);
    });

    test('getPolicies returns canonical keys with compatibility aliases', async () => {
      const mockPrisma = {
        dentalSetting: {
          findFirst: jest.fn().mockResolvedValue({
            key: 'labPolicies',
            value: JSON.stringify({
              assignment: { mode: 'AUTO', strategy: 'LEAST_LOADED', respectSchedule: true },
              escalation: { enabled: true, afterHoursInStage: 24 },
              dueDate: { urgentRule: 'PERCENT', urgentValue: 50 },
            }),
          }),
          findMany: jest.fn().mockResolvedValue([
            {
              key: 'labPolicies',
              value: JSON.stringify({
                assignment: { mode: 'AUTO', strategy: 'LEAST_LOADED', respectSchedule: true },
                escalation: { enabled: true, afterHoursInStage: 24 },
                dueDate: { urgentRule: 'PERCENT', urgentValue: 50 },
              }),
            },
          ]),
        },
        treasuryAccount: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const req = { user: { companyId: 'comp-1' } };
      const res = createResponse();

      await getPolicies(req, res);

      expect(res.statusCode).toBe(200);
      const policies = res.payload.data.policies;
      expect(policies.assignment.strategy).toBe('LEAST_LOADED');
      expect(policies.escalation.afterHoursInStage).toBe(24);
      // Compatibility aliases
      expect(policies.escalation.escalationHours).toBe(24);
      expect(policies.assignment.respectWorkingDays).toBe(true);
    });
  });

  describe('2. Assignment Strategy Active Execution', () => {
    const createPrismaForStrategy = (strategyName) => ({
      dentalSetting: {
        findFirst: jest.fn().mockResolvedValue({
          key: 'labPolicies',
          value: JSON.stringify({
            assignment: {
              mode: 'AUTO',
              strategy: strategyName,
              respectSchedule: false,
            },
          }),
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      dentalTechnician: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'tech-1',
            companyId: 'comp-1',
            name: 'Ahmed',
            role: 'CERAMIST',
            isActive: true,
          },
          {
            id: 'tech-2',
            companyId: 'comp-1',
            name: 'Mahmoud',
            role: 'CERAMIST',
            isActive: true,
          },
          {
            id: 'tech-3',
            companyId: 'comp-1',
            name: 'Youssef',
            role: 'GENERAL_TECHNICIAN',
            isActive: true,
          },
        ]),
      },
      dentalCaseStage: {
        count: jest.fn().mockImplementation(({ where }) => {
          if (where.assigneeId === 'tech-1') return Promise.resolve(5); // load 5
          if (where.assigneeId === 'tech-2') return Promise.resolve(2); // load 2
          if (where.assigneeId === 'tech-3') return Promise.resolve(1); // load 1
          return Promise.resolve(0);
        }),
      },
      dentalCaseAssignment: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.technicianId === 'tech-1') return Promise.resolve({ assignedAt: new Date('2026-09-24T10:00:00Z') }); // older idle
          if (where.technicianId === 'tech-2') return Promise.resolve({ assignedAt: new Date('2026-09-26T08:00:00Z') }); // more recent
          if (where.technicianId === 'tech-3') return Promise.resolve({ assignedAt: new Date('2026-09-25T12:00:00Z') });
          return Promise.resolve(null);
        }),
        count: jest.fn().mockResolvedValue(0),
      },
    });

    test('LEAST_LOADED strategy selects candidate with lowest active load matching role', async () => {
      const prisma = createPrismaForStrategy('LEAST_LOADED');
      const result = await selectTechnicianForAssignment(prisma, 'comp-1', { requiredRole: 'CERAMIST' });

      expect(result.selectedTechnician).not.toBeNull();
      // Between tech-1 (load 5) and tech-2 (load 2), tech-2 has least load
      expect(result.selectedTechnician.id).toBe('tech-2');
      expect(result.appliedStrategy).toBe('LEAST_LOADED');
    });

    test('ROUND_ROBIN strategy selects candidate with oldest lastAssignedAt', async () => {
      const prisma = createPrismaForStrategy('ROUND_ROBIN');
      const result = await selectTechnicianForAssignment(prisma, 'comp-1', { requiredRole: 'CERAMIST' });

      expect(result.selectedTechnician).not.toBeNull();
      // tech-1 lastAssignedAt was Sept 24, tech-2 was Sept 26 -> tech-1 is picked by round robin
      expect(result.selectedTechnician.id).toBe('tech-1');
      expect(result.appliedStrategy).toBe('ROUND_ROBIN');
    });

    test('BY_ROLE_MATCH strictly prioritizes exact role match over general technician', async () => {
      const prisma = createPrismaForStrategy('BY_ROLE_MATCH');
      const result = await selectTechnicianForAssignment(prisma, 'comp-1', { requiredRole: 'CERAMIST' });

      expect(result.selectedTechnician).not.toBeNull();
      // Must be CERAMIST (tech-2 or tech-1), never tech-3 (GENERAL_TECHNICIAN) despite tech-3 having lower load
      expect(result.selectedTechnician.role).toBe('CERAMIST');
      expect(result.selectedTechnician.id).toBe('tech-2'); // among CERAMISTs, least loaded
    });
  });

  describe('3. Scheduled Escalation & PostgreSQL Advisory Lock', () => {
    test('runGlobalDentalEscalation acquires advisory lock 847291 and executes idempotently', async () => {
      const mockPrisma = {
        company: {
          findMany: jest.fn().mockResolvedValue([{ id: 'comp-100', name: 'Al-Amal Lab' }]),
        },
        dentalSetting: {
          findFirst: jest.fn().mockResolvedValue({
            key: 'labPolicies',
            value: JSON.stringify({
              escalation: { enabled: true, afterHoursInStage: 24, target: 'BACKUP_ROLE' },
            }),
          }),
        },
        $queryRaw: jest.fn()
          .mockResolvedValueOnce([{ acquired: true }]) // Lock acquisition
          .mockResolvedValueOnce([{ acquired: true }]), // Lock release
      };

      const result = await runGlobalDentalEscalation(mockPrisma);

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(result.skippedDueToLock).toBe(false);
      expect(result.companiesChecked).toBe(1);
    });

    test('runGlobalDentalEscalation gracefully skips when secondary cluster instance cannot acquire lock', async () => {
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValueOnce([{ acquired: false }]),
      };

      const result = await runGlobalDentalEscalation(mockPrisma);

      expect(result.skippedDueToLock).toBe(true);
      expect(result.escalatedStagesCount).toBe(0);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Technician Schedule & Cap Management', () => {
    test('updateTechnician saves workingDays, dailyCap, and backupTechnicianId', async () => {
      const existingTech = {
        id: 'tech-10',
        companyId: 'comp-1',
        name: 'Sameh',
        role: 'CAD_DESIGNER',
        userId: 'usr-10',
      };
      const backupTech = {
        id: 'tech-20',
        companyId: 'comp-1',
        name: 'Hassan',
        role: 'CAD_DESIGNER',
      };

      const mockPrisma = {
        dentalTechnician: {
          findFirst: jest.fn()
            .mockResolvedValueOnce(existingTech) // self lookup
            .mockResolvedValueOnce(backupTech), // backup tech validation lookup
          update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...existingTech, ...data })),
        },
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const req = {
        user: { companyId: 'comp-1', role: 'OWNER' },
        params: { id: 'tech-10' },
        body: {
          workingDays: [0, 1, 2, 3, 4],
          dailyCap: 8,
          backupTechnicianId: 'tech-20',
        },
      };
      const res = createResponse();

      await dentalLabController.updateTechnician(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.dentalTechnician.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tech-10' },
          data: expect.objectContaining({
            workingDays: [0, 1, 2, 3, 4],
            dailyCap: 8,
            backupTechnicianId: 'tech-20',
          }),
        })
      );
    });

    test('updateTechnician rejects setting self as backupTechnicianId', async () => {
      const existingTech = {
        id: 'tech-10',
        companyId: 'comp-1',
        name: 'Sameh',
        role: 'CAD_DESIGNER',
      };

      const mockPrisma = {
        dentalTechnician: {
          findFirst: jest.fn().mockResolvedValue(existingTech),
        },
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const req = {
        user: { companyId: 'comp-1', role: 'OWNER' },
        params: { id: 'tech-10' },
        body: {
          backupTechnicianId: 'tech-10', // self!
        },
      };
      const res = createResponse();

      await dentalLabController.updateTechnician(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toContain('لا يمكن تعيين الفني كبديل لنفسه');
    });
  });

  describe('5. Work Type urgentLeadTimeDays & Stage Templates', () => {
    test('createWorkType persists urgentLeadTimeDays', async () => {
      const mockPrisma = {
        dentalWorkType: {
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'wt-1', ...data })),
        },
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const req = {
        user: { companyId: 'comp-1' },
        body: {
          name: 'Zirconia Crown',
          category: 'CROWN',
          leadTimeDays: 4,
          urgentLeadTimeDays: 1,
          price: 650,
        },
      };
      const res = createResponse();

      await dentalLabController.createWorkType(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.dentalWorkType.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadTimeDays: 4,
            urgentLeadTimeDays: 1,
          }),
        })
      );
    });

    test('setWorkTypeStages persists custom stages with requiredRole, slaHours, and stageWage', async () => {
      const mockTx = {
        workTypeStageTemplate: {
          deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tmpl-' + Math.random(), ...data })),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation((fn) => fn(mockTx)),
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const req = {
        user: { companyId: 'comp-1' },
        params: { id: 'wt-1' },
        body: {
          stages: [
            { name: 'الاستلام', requiredRole: 'RECEPTION_LOGISTICS', slaHours: 12, stageWage: 0 },
            { name: 'التصميم CAD', requiredRole: 'CAD_DESIGNER', slaHours: 24, stageWage: 25 },
            { name: 'الطباعة والتفريز', requiredRole: 'CERAMIST', slaHours: 36, stageWage: 40 },
          ],
        },
      };
      const res = createResponse();

      await setWorkTypeStages(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockTx.workTypeStageTemplate.deleteMany).toHaveBeenCalledWith({ where: { workTypeId: 'wt-1' } });
      expect(mockTx.workTypeStageTemplate.create).toHaveBeenCalledTimes(3);
      expect(mockTx.workTypeStageTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'التصميم CAD',
            requiredRole: 'CAD_DESIGNER',
            slaHours: 24,
            stageWage: 25,
          }),
        })
      );
    });
  });

  describe('8. Technician Exceptional Vacations & Scheduling', () => {
    test('isTechnicianOnDuty marks technician off-duty during vacation period', () => {
      const tech = {
        id: 'tech-vac-1',
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        vacations: [
          {
            startDate: '2026-10-01',
            endDate: '2026-10-05',
            reason: 'راحة سنوية',
          },
        ],
      };

      // Inside vacation window: 2026-10-03
      const checkInside = isTechnicianOnDuty(tech, new Date('2026-10-03T12:00:00Z'));
      expect(checkInside.onDuty).toBe(false);
      expect(checkInside.reason).toContain('إجازة استثنائية: راحة سنوية');

      // Boundary vacation start: 2026-10-01
      const checkStart = isTechnicianOnDuty(tech, new Date('2026-10-01T08:00:00Z'));
      expect(checkStart.onDuty).toBe(false);

      // Boundary vacation end: 2026-10-05
      const checkEnd = isTechnicianOnDuty(tech, new Date('2026-10-05T18:00:00Z'));
      expect(checkEnd.onDuty).toBe(false);

      // Outside vacation window: 2026-10-06
      const checkOutside = isTechnicianOnDuty(tech, new Date('2026-10-06T10:00:00Z'));
      expect(checkOutside.onDuty).toBe(true);
      expect(checkOutside.reason).toBe('متاح للعمل');
    });

    test('selectTechnicianForAssignment skips technician on vacation when respectSchedule is true', async () => {
      const targetDate = new Date('2026-10-03T10:00:00Z');
      const mockPrisma = {
        dentalSetting: {
          findFirst: jest.fn().mockResolvedValue({
            key: 'labPolicies',
            value: JSON.stringify({
              assignment: {
                mode: 'AUTO',
                strategy: 'LEAST_LOADED',
                respectSchedule: true,
              },
            }),
          }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        dentalTechnician: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'tech-on-vacation',
              companyId: 'comp-1',
              name: 'Vacation Tech',
              role: 'CAD_DESIGNER',
              workingDays: [0, 1, 2, 3, 4, 5, 6],
              vacations: [{ startDate: '2026-10-01', endDate: '2026-10-05', reason: 'مؤتمر' }],
              isActive: true,
            },
            {
              id: 'tech-available',
              companyId: 'comp-1',
              name: 'Available Tech',
              role: 'CAD_DESIGNER',
              workingDays: [0, 1, 2, 3, 4, 5, 6],
              vacations: [],
              isActive: true,
            },
          ]),
        },
        dentalCaseStage: {
          count: jest.fn().mockResolvedValue(0),
        },
        dentalCaseAssignment: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      const result = await selectTechnicianForAssignment(mockPrisma, 'comp-1', {
        requiredRole: 'CAD_DESIGNER',
        date: targetDate,
      });

      expect(result.selectedTechnician).not.toBeNull();
      expect(result.selectedTechnician.id).toBe('tech-available');
      expect(result.offDuty.some((c) => c.tech.id === 'tech-on-vacation' && c.reason.includes('إجازة استثنائية'))).toBe(true);
    });

    test('updateTechnician sanitizes vacations payload and filters invalid date ranges', async () => {
      const mockPrisma = {
        dentalTechnician: {
          findFirst: jest.fn().mockResolvedValue({ id: 'tech-1', companyId: 'comp-1' }),
          update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tech-1', companyId: 'comp-1', ...data })),
        },
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const req = {
        user: { companyId: 'comp-1', role: 'ADMIN' },
        params: { id: 'tech-1' },
        body: {
          name: 'Ahmed Tech',
          vacations: [
            { startDate: '2026-10-01T12:00:00Z', endDate: '2026-10-05T00:00:00Z', reason: 'سفر ' },
            { startDate: '2026-11-10', endDate: '2026-11-05', reason: 'تاريخ معكوس - يجب استبعاده' },
            { startDate: '', endDate: '2026-12-01', reason: 'بداية فارغة' },
          ],
        },
      };
      const res = createResponse();

      await dentalLabController.updateTechnician(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.dentalTechnician.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vacations: [
              {
                startDate: '2026-10-01',
                endDate: '2026-10-05',
                reason: 'سفر',
              },
            ],
          }),
        })
      );
    });
  });
});

