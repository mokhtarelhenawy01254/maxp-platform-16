jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { notifyStudyDelivery } = require('../../utils/radiologyDeliveryNotify');

describe('radiologyDeliveryNotify (best-effort)', () => {
  test('never throws and returns empty results for a study without phone/physician', async () => {
    const study = { id: 's1', companyId: 'c1', patientName: '┘à╪▒┘è╪╢' };
    const prisma = {};
    const results = await notifyStudyDelivery(prisma, study, { companyId: 'c1' });
    expect(results).toEqual({ patientPdf: null, physicianText: null });
  });

  test('handles missing prisma gracefully', async () => {
    const results = await notifyStudyDelivery(null, { id: 's1' }, { companyId: 'c1' });
    expect(results).toEqual({ patientPdf: null, physicianText: null });
  });

  test('skips PDF when patient phone is missing', async () => {
    const study = { id: 's1', companyId: 'c1', patientName: '┘à╪▒┘è╪╢', report: { reportText: '┘å╪╡' } };
    const results = await notifyStudyDelivery({}, study, { companyId: 'c1' });
    expect(results.patientPdf).toBeNull();
  });
});
