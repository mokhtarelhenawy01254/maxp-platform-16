const shippingProviderService = require("../../services/shippingProviderService");

describe("shippingProviderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("ensures the temporary demo carriers for a company", async () => {
    const prisma = {
      shippingCompany: {
        upsert: jest.fn(async ({ create }) => ({
          id: `carrier-${create.providerKey}`,
          ...create,
        })),
      },
    };

    const carriers = await shippingProviderService.ensureDemoShippingCompanies(
      prisma,
      "company-1",
    );

    expect(carriers).toHaveLength(3);
    expect(carriers.map((carrier) => carrier.providerKey)).toEqual([
      "BOSTA_DEMO",
      "MYLERZ_DEMO",
      "ARAMEX_DEMO",
    ]);
    expect(prisma.shippingCompany.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.shippingCompany.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_slug: {
            companyId: "company-1",
            slug: "bosta-demo",
          },
        },
      }),
    );
  });

  test("creates a deterministic demo shipment reference and label", async () => {
    const prisma = {
      shipment: {
        update: jest.fn(async ({ data }) => ({
          id: "shipment-1",
          ...data,
        })),
      },
    };
    const shipment = {
      id: "shipment-1",
      companyId: "company-1",
      merchantOrderId: "merchant-order-1",
      trackingNumber: null,
      externalShipmentId: null,
      labelUrl: null,
      serviceLevel: null,
      cost: null,
      metadata: null,
      destinationCity: "Cairo",
      shippingCompany: {
        id: "carrier-1",
        name: "Bosta Demo",
        providerKey: "BOSTA_DEMO",
        integrationMode: "DEMO",
        settings: JSON.stringify({
          autoCreateShipments: true,
          serviceLevel: "Next-day demo",
        }),
      },
    };

    const updated = await shippingProviderService.createProviderShipment(
      prisma,
      shipment,
    );

    expect(updated.trackingNumber).toMatch(/^BOSTA-/);
    expect(updated.externalShipmentId).toMatch(/^BOSTA-SHIP-/);
    expect(updated.labelUrl).toContain("/labels/bosta/");
    expect(prisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "shipment-1" },
        data: expect.objectContaining({
          carrierType: "BOSTA_DEMO",
          status: "CREATED",
        }),
      }),
    );
  });

  test("does not create live Turbo shipments without explicit confirmation", async () => {
    const prisma = {
      shipment: {
        update: jest.fn(async ({ data }) => ({
          id: "shipment-2",
          ...data,
        })),
      },
    };
    const shipment = {
      id: "shipment-2",
      companyId: "company-1",
      merchantOrderId: "merchant-order-2",
      trackingNumber: null,
      externalShipmentId: null,
      labelUrl: null,
      serviceLevel: null,
      cost: null,
      metadata: null,
      shippingCompany: {
        id: "carrier-2",
        name: "Turbo",
        providerKey: "TURBO",
        integrationMode: "LIVE",
        settings: JSON.stringify({
          autoCreateShipments: true,
        }),
      },
    };

    const updated = await shippingProviderService.createProviderShipment(
      prisma,
      shipment,
    );
    const metadata = JSON.parse(updated.metadata);

    expect(updated.trackingNumber).toBeUndefined();
    expect(metadata.providerSkipReason).toBe(
      "LIVE_CREATE_REQUIRES_EXPLICIT_CONFIRMATION",
    );
    expect(prisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          carrierType: "TURBO",
        }),
      }),
    );
  });
});
