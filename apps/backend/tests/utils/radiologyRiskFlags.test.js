const { DEFAULT_RISK_FLAGS, getRadiologyRiskFlags, saveRadiologyRiskFlags } = require('../../utils/radiologyRiskFlags');

const createPrisma = (overrides = {}) => {
  const prisma = {
    radiologySetting: { findUnique: jest.fn(), upsert: jest.fn() },
    ...overrides,
  };
  return prisma;
};

describe('radiologyRiskFlags util', () => {
  test('returns defaults when no companyId', async () => {
    const prisma = createPrisma();
    const flags = await getRadiologyRiskFlags(prisma, null);
    expect(flags).toEqual(DEFAULT_RISK_FLAGS);
  });

  test('returns defaults when the radiologySetting model is missing (model-safe)', async () => {
    const prisma = {};
    const flags = await getRadiologyRiskFlags(prisma, 'company-1');
    expect(flags).toEqual(DEFAULT_RISK_FLAGS);
  });

  test('returns defaults when no settings row exists', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.findUnique.mockResolvedValue(null);
    const flags = await getRadiologyRiskFlags(prisma, 'company-1');
    expect(flags).toEqual(DEFAULT_RISK_FLAGS);
  });

  test('returns stored flags when the stored JSON is a valid array', async () => {
    const stored = [
      { value: 'pregnancy', label: '╪¡┘à┘ä', color: 'bg-pink-100' },
      { value: 'custom_1', label: '┘à╪ñ╪┤╪▒ ┘à╪«╪╡╪╡', color: 'bg-blue-100' },
    ];
    const prisma = createPrisma();
    prisma.radiologySetting.findUnique.mockResolvedValue({ value: JSON.stringify(stored) });
    const flags = await getRadiologyRiskFlags(prisma, 'company-1');
    expect(flags).toEqual(stored);
  });

  test('falls back to defaults on invalid stored JSON', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.findUnique.mockResolvedValue({ value: 'not-json{{' });
    const flags = await getRadiologyRiskFlags(prisma, 'company-1');
    expect(flags).toEqual(DEFAULT_RISK_FLAGS);
  });

  test('falls back to defaults when the stored value is not an array', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.findUnique.mockResolvedValue({ value: JSON.stringify({ value: 'x', label: 'y' }) });
    const flags = await getRadiologyRiskFlags(prisma, 'company-1');
    expect(flags).toEqual(DEFAULT_RISK_FLAGS);
  });

  test('cleans stored flags and drops entries missing value/label', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.findUnique.mockResolvedValue({
      value: JSON.stringify([{ value: 'ok', label: '╪│┘ä┘è┘à', color: 'bg-red-100' }, { value: '', label: '╪¿╪»┘ê┘å ┘é┘è┘à╪⌐' }, { label: '╪¿╪»┘ê┘å ┘à╪╣╪▒┘ü' }]),
    });
    const flags = await getRadiologyRiskFlags(prisma, 'company-1');
    expect(flags).toEqual([{ value: 'ok', label: '╪│┘ä┘è┘à', color: 'bg-red-100' }]);
  });

  test('saveRadiologyRiskFlags persists a deduplicated cleaned array', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.upsert.mockResolvedValue({});
    const saved = await saveRadiologyRiskFlags(prisma, 'company-1', [
      { value: 'a', label: '╪ú', color: 'bg-red-100' },
      { value: 'a', label: '┘à┘â╪▒╪▒', color: 'bg-blue-100' },
      { value: 'b', label: '╪¿', color: 'bg-green-100' },
    ]);
    expect(saved).toEqual([
      { value: 'a', label: '╪ú', color: 'bg-red-100' },
      { value: 'b', label: '╪¿', color: 'bg-green-100' },
    ]);
    expect(prisma.radiologySetting.upsert).toHaveBeenCalledWith({
      where: { companyId_key: { companyId: 'company-1', key: 'riskFlags' } },
      update: { value: JSON.stringify(saved) },
      create: { companyId: 'company-1', key: 'riskFlags', value: JSON.stringify(saved) },
    });
  });

  test('saveRadiologyRiskFlags drops invalid entries and falls back color to the first default', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.upsert.mockResolvedValue({});
    const saved = await saveRadiologyRiskFlags(prisma, 'company-1', [
      { value: 'x', label: '╪Ñ┘â╪│', color: '' },
      { value: '', label: '╪¿╪»┘ê┘å ┘é┘è┘à╪⌐' },
      null,
      'junk',
      { value: 'y' },
    ]);
    expect(saved).toEqual([{ value: 'x', label: '╪Ñ┘â╪│', color: DEFAULT_RISK_FLAGS[0].color }]);
  });

  test('saveRadiologyRiskFlags throws when the radiologySetting model is missing', async () => {
    await expect(saveRadiologyRiskFlags({}, 'company-1', [])).rejects.toThrow('radiologySetting');
  });
});
