let mockPrisma;

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
  }
});

const createPrismaMock = () => ({
  company: {
    findUnique: jest.fn()
  },
  governorate: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn()
  },
  product: {
    findMany: jest.fn()
  },
  shippingMethod: {
    findMany: jest.fn()
  },
  governorateAlias: {
    findFirst: jest.fn(),
    upsert: jest.fn()
  },
  shippingZone: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  shippingZoneGovernorate: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn()
  }
});

const buildGovernorate = (code, overrides = {}) => ({
  id: `${code}-id`,
  code,
  nameAr: overrides.nameAr || code,
  nameEn: overrides.nameEn || code,
  isActive: true,
  aliases: overrides.aliases || []
});

const buildMissingTableError = (table) => {
  const error = new Error(`The table \`${table}\` does not exist in the current database.`);
  error.code = "P2021";
  return error;
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation())
}));

const shippingZoneController = require("../../controller/shippingZoneController");

describe("shippingZoneController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();

    mockPrisma.governorate.upsert.mockImplementation(async ({ where, create, update }) => ({
      id: `${where.code}-id`,
      code: where.code,
      nameAr: update?.nameAr || create?.nameAr || where.code,
      nameEn: update?.nameEn || create?.nameEn || where.code,
      isActive: true
    }));

    mockPrisma.governorate.findFirst.mockImplementation(async ({ where }) => {
      if (where?.OR) {
        const codeEntry = where.OR.find((entry) => entry.code);
        const idEntry = where.OR.find((entry) => entry.id);

        if (codeEntry?.code === "cairo" || idEntry?.id === "cairo-id") {
          return buildGovernorate("cairo", {
            nameAr: "القاهرة",
            nameEn: "Cairo",
            aliases: [
              { alias: "القاهرة" },
              { alias: "cairo" }
            ]
          });
        }

        return null;
      }

      if (where?.code) {
        if (where.code === "cairo") {
          return buildGovernorate("cairo", {
            nameAr: "القاهرة",
            nameEn: "Cairo"
          });
        }

        return buildGovernorate(where.code, {
          nameAr: where.code,
          nameEn: where.code
        });
      }

      return null;
    });

    mockPrisma.governorateAlias.findFirst.mockResolvedValue(null);
    mockPrisma.governorateAlias.upsert.mockResolvedValue({});
    mockPrisma.company.findUnique.mockResolvedValue({ settings: "{}" });
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.shippingMethod.findMany.mockResolvedValue([]);
    mockPrisma.shippingZoneGovernorate.upsert.mockResolvedValue({});
    mockPrisma.shippingZoneGovernorate.deleteMany.mockResolvedValue({ count: 0 });
  });

  test("createShippingZone serializes governorates and pricing tiers to match the Prisma schema", async () => {
    const createdZoneRecord = {
      id: "zone-1",
      name: "القاهرة",
      governorates: "[\"القاهرة\",\"cairo\"]",
      price: 0,
      pricingTiers: "[{\"minWeight\":0,\"maxWeight\":5,\"price\":60}]",
      deliveryTime: "1-2 يوم",
      deliveryTimeType: "custom",
      freeShippingThreshold: null,
      isActive: true,
      companyId: "company-1"
    };

    mockPrisma.shippingZone.create.mockImplementation(async ({ data }) => ({
      ...createdZoneRecord,
      ...data
    }));

    mockPrisma.shippingZone.findMany.mockResolvedValue([createdZoneRecord]);
    mockPrisma.shippingZone.findFirst.mockResolvedValue({
      ...createdZoneRecord,
      governorateMappings: [
        {
          governorate: buildGovernorate("cairo", {
            nameAr: "القاهرة",
            nameEn: "Cairo"
          })
        }
      ]
    });

    const req = {
      user: { companyId: "company-1" },
      body: {
        name: "القاهرة",
        governorateIds: ["cairo"],
        governorates: ["القاهرة"],
        pricingType: "tiered",
        pricingTiers: [{ minWeight: 0, maxWeight: 5, price: 60 }],
        deliveryTime: "1-2 يوم",
        deliveryTimeType: "custom",
        isActive: true
      }
    };
    const res = createResponseMock();

    await shippingZoneController.createShippingZone(req, res);

    expect(res.statusCode).toBe(201);

    const prismaPayload = mockPrisma.shippingZone.create.mock.calls[0][0].data;
    expect(prismaPayload).not.toHaveProperty("governorateIds");
    expect(JSON.parse(prismaPayload.governorates)).toEqual(
      expect.arrayContaining(["القاهرة", "Cairo", "cairo"])
    );
    expect(prismaPayload.pricingTiers).toBe("[{\"minWeight\":0,\"maxWeight\":5,\"price\":60}]");

    expect(res.payload.data.governorates).toEqual(["القاهرة", "cairo"]);
    expect(res.payload.data.governorateIds).toEqual(["cairo"]);
    expect(res.payload.data.pricingTiers).toEqual([{ minWeight: 0, maxWeight: 5, price: 60 }]);
  });

  test("getShippingZones returns normalized arrays and canonical governorate ids for the frontend", async () => {
    mockPrisma.shippingZone.findMany.mockResolvedValue([
      {
        id: "zone-1",
        name: "القاهرة",
        governorates: "[\"القاهرة\",\"cairo\"]",
        price: "75.5",
        pricingType: "tiered",
        pricingTiers: "[{\"minWeight\":0,\"maxWeight\":5,\"price\":75.5}]",
        deliveryTime: "1-2 يوم",
        deliveryTimeType: "custom",
        freeShippingThreshold: "150",
        isActive: true,
        companyId: "company-1",
        governorateMappings: [
          {
            governorate: buildGovernorate("cairo", {
              nameAr: "القاهرة",
              nameEn: "Cairo"
            })
          }
        ]
      }
    ]);

    const req = {
      user: { companyId: "company-1" }
    };
    const res = createResponseMock();

    await shippingZoneController.getShippingZones(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0]).toMatchObject({
      governorates: ["القاهرة", "cairo"],
      governorateIds: ["cairo"],
      pricingTiers: [{ minWeight: 0, maxWeight: 5, price: 75.5 }],
      price: 75.5,
      freeShippingThreshold: 150,
      canonicalGovernorates: [
        expect.objectContaining({
          code: "cairo",
          nameAr: "القاهرة"
        })
      ]
    });
  });

  test("createShippingZone falls back to seed governorates when canonical storage is unavailable", async () => {
    mockPrisma.governorate = undefined;
    mockPrisma.governorateAlias = undefined;
    mockPrisma.shippingZoneGovernorate = undefined;

    mockPrisma.shippingZone.create.mockImplementation(async ({ data }) => ({
      id: "zone-fallback",
      ...data
    }));

    mockPrisma.shippingZone.findFirst.mockResolvedValue({
      id: "zone-fallback",
      name: "القاهرة",
      governorates: "[\"القاهرة\",\"Cairo\",\"cairo\"]",
      price: 99,
      pricingType: "flat",
      pricingTiers: null,
      deliveryTime: "1-2 يوم",
      deliveryTimeType: "custom",
      freeShippingThreshold: null,
      isActive: true,
      companyId: "company-1"
    });

    const req = {
      user: { companyId: "company-1" },
      body: {
        name: "القاهرة",
        governorateIds: ["cairo"],
        governorates: ["القاهرة"],
        pricingType: "flat",
        price: 99,
        deliveryTime: "1-2 يوم",
        deliveryTimeType: "custom",
        isActive: true
      }
    };
    const res = createResponseMock();

    await shippingZoneController.createShippingZone(req, res);

    expect(res.statusCode).toBe(201);
    expect(
      JSON.parse(mockPrisma.shippingZone.create.mock.calls[0][0].data.governorates)
    ).toEqual(expect.arrayContaining(["القاهرة", "Cairo", "cairo"]));
    expect(res.payload.data.governorateIds).toEqual(["cairo"]);
  });

  test("calculatePublicShippingCost falls back to stored zone governorates when canonical tables are missing", async () => {
    mockPrisma.governorate.upsert.mockRejectedValue(
      buildMissingTableError("public.governorates")
    );
    mockPrisma.governorateAlias.findFirst.mockRejectedValue(
      buildMissingTableError("public.governorate_aliases")
    );
    mockPrisma.shippingZoneGovernorate.findFirst.mockRejectedValue(
      buildMissingTableError("public.shipping_zone_governorates")
    );
    mockPrisma.shippingZone.findMany.mockResolvedValue([
      {
        id: "zone-giza",
        name: "الجيزة",
        governorates: "[\"الجيزة\",\"Giza\",\"giza\"]",
        price: "80",
        pricingType: "flat",
        pricingTiers: null,
        deliveryTime: "2-3 يوم",
        deliveryTimeType: "custom",
        freeShippingThreshold: null,
        isActive: true,
        companyId: "company-1"
      }
    ]);

    const req = {
      params: { companyId: "company-1" },
      query: { governorate: "Giza" }
    };
    const res = createResponseMock();

    await shippingZoneController.calculatePublicShippingCost(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toMatchObject({
      zoneId: "zone-giza",
      price: 80,
      governorate: "الجيزة"
    });
    expect(res.payload.data.methods).toEqual([
      expect.objectContaining({
        id: "zone-giza",
        price: 80,
        governorate: "الجيزة"
      })
    ]);
  });

  test("calculatePublicShippingCost treats a shipping-class-matched method as the final shopper-facing price", async () => {
    mockPrisma.governorate.upsert.mockRejectedValue(
      buildMissingTableError("public.governorates")
    );
    mockPrisma.governorateAlias.findFirst.mockRejectedValue(
      buildMissingTableError("public.governorate_aliases")
    );
    mockPrisma.shippingZoneGovernorate.findFirst.mockRejectedValue(
      buildMissingTableError("public.shipping_zone_governorates")
    );
    mockPrisma.shippingZone.findMany.mockResolvedValue([
      {
        id: "zone-alex",
        name: "الإسكندرية",
        governorates: "[\"الإسكندرية\",\"Alexandria\",\"alexandria\"]",
        price: "145",
        pricingType: "flat",
        pricingTiers: null,
        deliveryTime: "2-3 يوم",
        deliveryTimeType: "custom",
        freeShippingThreshold: null,
        isActive: true,
        companyId: "company-1"
      }
    ]);
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        metadata: JSON.stringify({ shippingClass: "women" }),
        productVariants: []
      }
    ]);
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: JSON.stringify({
        shippingClassFees: {
          women: 80
        },
        shippingClasses: [
          {
            key: "women",
            label: "تايم هاند"
          }
        ]
      })
    });
    mockPrisma.shippingMethod.findMany.mockResolvedValue([
      {
        id: "method-time-hand",
        zoneId: "zone-alex",
        title: "تايم هاند",
        type: "flat_rate",
        isEnabled: true,
        sortOrder: 0,
        settings: JSON.stringify({
          cost: 65
        })
      }
    ]);

    const req = {
      params: { companyId: "company-1" },
      body: {
        governorate: "Alexandria",
        items: [
          {
            productId: "product-1",
            quantity: 1
          }
        ]
      }
    };
    const res = createResponseMock();

    await shippingZoneController.calculatePublicShippingCost(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toMatchObject({
      zoneId: "zone-alex",
      price: 65,
      basePrice: 65,
      shippingClassSurcharge: 0,
      governorate: "الإسكندرية"
    });
    expect(res.payload.data.methods).toEqual([
      expect.objectContaining({
        id: "method-time-hand",
        title: "تايم هاند",
        cost: 65,
        price: 65,
        basePrice: 65,
        shippingClassSurcharge: 0,
        matchedShippingClassKey: "women",
        matchedShippingClassLabel: "تايم هاند",
        governorate: "الإسكندرية"
      })
    ]);
  });

  test("calculatePublicShippingCost still applies shipping class surcharge when no enabled method matches the selected class label", async () => {
    mockPrisma.governorate.upsert.mockRejectedValue(
      buildMissingTableError("public.governorates")
    );
    mockPrisma.governorateAlias.findFirst.mockRejectedValue(
      buildMissingTableError("public.governorate_aliases")
    );
    mockPrisma.shippingZoneGovernorate.findFirst.mockRejectedValue(
      buildMissingTableError("public.shipping_zone_governorates")
    );
    mockPrisma.shippingZone.findMany.mockResolvedValue([
      {
        id: "zone-alex",
        name: "الإسكندرية",
        governorates: "[\"الإسكندرية\",\"Alexandria\",\"alexandria\"]",
        price: "145",
        pricingType: "flat",
        pricingTiers: null,
        deliveryTime: "2-3 يوم",
        deliveryTimeType: "custom",
        freeShippingThreshold: null,
        isActive: true,
        companyId: "company-1"
      }
    ]);
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        metadata: JSON.stringify({ shippingClass: "women" }),
        productVariants: []
      }
    ]);
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: JSON.stringify({
        shippingClassFees: {
          women: 80
        },
        shippingClasses: [
          {
            key: "women",
            label: "شحن نسائي"
          }
        ]
      })
    });
    mockPrisma.shippingMethod.findMany.mockResolvedValue([
      {
        id: "method-standard",
        zoneId: "zone-alex",
        title: "شحن قياسي",
        type: "flat_rate",
        isEnabled: true,
        sortOrder: 0,
        settings: JSON.stringify({
          cost: 65
        })
      }
    ]);

    const req = {
      params: { companyId: "company-1" },
      body: {
        governorate: "Alexandria",
        items: [
          {
            productId: "product-1",
            quantity: 1
          }
        ]
      }
    };
    const res = createResponseMock();

    await shippingZoneController.calculatePublicShippingCost(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toMatchObject({
      zoneId: "zone-alex",
      price: 145,
      basePrice: 65,
      shippingClassSurcharge: 80,
      governorate: "الإسكندرية"
    });
    expect(res.payload.data.methods).toEqual([
      expect.objectContaining({
        id: "method-standard",
        title: "شحن قياسي",
        cost: 145,
        price: 145,
        basePrice: 65,
        shippingClassSurcharge: 80,
        matchedShippingClassKey: null,
        matchedShippingClassLabel: null,
        governorate: "الإسكندرية"
      })
    ]);
  });

  test('calculatePublicShippingCost caches syncCanonicalShippingData and skips redundant syncs on repeated calls', async () => {
    shippingZoneController.resetCanonicalShippingSyncCache();
    mockPrisma.governorate.count = jest.fn().mockResolvedValue(27);
    mockPrisma.shippingZone.findMany.mockResolvedValue([
      {
        id: 'zone-cairo',
        companyId: 'company-cached',
        name: 'Cairo Zone',
        price: 50,
        deliveryTime: '2 days',
        governorates: '["Cairo"]',
        governorateIds: '[]',
        governorateMappings: []
      }
    ]);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-cached', settings: null });
    mockPrisma.shippingMethod.findMany.mockResolvedValue([]);

    const req = {
      params: { companyId: 'company-cached' },
      query: {},
      body: { governorate: 'Cairo' }
    };

    // First call: runs sync and populates cache
    const res1 = createResponseMock();
    await shippingZoneController.calculatePublicShippingCost(req, res1);
    expect(res1.statusCode).toBe(200);

    const callCountAfterFirst = mockPrisma.shippingZone.findMany.mock.calls.length;

    // Second call: should hit cache and skip sync
    const res2 = createResponseMock();
    await shippingZoneController.calculatePublicShippingCost(req, res2);
    expect(res2.statusCode).toBe(200);

    // findMany was called only once more for reading zones (not for sync)
    expect(mockPrisma.shippingZone.findMany.mock.calls.length).toBe(callCountAfterFirst + 1);
  });
});
