jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/bookingPatientDocumentsController');

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
    })
  };
  return response;
};

describe('bookingPatientDocumentsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatientDocuments', () => {
    test('returns documents for a patient in the company, ordered by uploadedAt desc', async () => {
      const mockPrisma = {
        patient: {
          findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'c1', firstName: '╪ú╪¡┘à╪»' })
        },
        patientDocument: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'doc-1', patientId: 'p1', documentType: 'PRESCRIPTION', name: '┘ê╪╡┘ü╪⌐', fileData: 'data:image/png;base64,xxx', mimeType: 'image/png', uploadedAt: '2026-01-02T00:00:00Z', patient: { firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è' } },
            { id: 'doc-2', patientId: 'p1', documentType: 'IMAGE', name: '╪ú╪┤╪╣╪⌐', fileData: 'data:image/png;base64,yyy', mimeType: 'image/png', uploadedAt: '2026-01-01T00:00:00Z', patient: { firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è' } }
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.getPatientDocuments({ user: { companyId: 'c1' }, params: { patientId: 'p1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.patient.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', companyId: 'c1' } });
      expect(mockPrisma.patientDocument.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1', patientId: 'p1' },
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { uploadedAt: 'desc' }
      });
      expect(res.payload.data).toHaveLength(2);
      expect(res.payload.data[0].patient.firstName).toBe('╪ú╪¡┘à╪»');
    });

    test('returns 404 when the patient does not belong to the company', async () => {
      getSharedPrismaClient.mockReturnValue({
        patient: { findFirst: jest.fn().mockResolvedValue(null) }
      });

      const res = createResponse();
      await controller.getPatientDocuments({ user: { companyId: 'c1' }, params: { patientId: 'other' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getPatientDocuments({ user: {}, params: { patientId: 'p1' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('addPatientDocument', () => {
    test('creates a document with default type OTHER when type is missing', async () => {
      const mockPrisma = {
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'c1' }) },
        patientDocument: {
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'doc-1', ...data }))
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.addPatientDocument(
        { user: { companyId: 'c1', firstName: '┘à╪¡┘à╪»', lastName: '╪¡╪│┘å' }, body: { patientId: 'p1', name: '┘ê╪╡┘ü╪⌐ ╪╖╪¿┘è╪⌐', fileData: 'data:application/pdf;base64,abc' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.patientDocument.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ companyId: 'c1', patientId: 'p1', documentType: 'OTHER', uploadedBy: '┘à╪¡┘à╪» ╪¡╪│┘å' })
      }));
    });

    test('validates documentType against the allowed types', async () => {
      getSharedPrismaClient.mockReturnValue({
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'c1' }) }
      });

      const res = createResponse();
      await controller.addPatientDocument(
        { user: { companyId: 'c1' }, body: { patientId: 'p1', documentType: 'XRAY' } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('accepts a valid documentType', async () => {
      const mockPrisma = {
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'c1' }) },
        patientDocument: { create: jest.fn().mockResolvedValue({ id: 'doc-1', documentType: 'PRESCRIPTION' }) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.addPatientDocument(
        { user: { companyId: 'c1' }, body: { patientId: 'p1', documentType: 'prescription', name: '┘ê╪╡┘ü╪⌐' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.patientDocument.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ documentType: 'PRESCRIPTION' })
      }));
    });

    test('requires patientId', async () => {
      const res = createResponse();
      await controller.addPatientDocument({ user: { companyId: 'c1' }, body: { name: '┘à╪│╪¬┘å╪»' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('returns 404 when the patient does not belong to the company', async () => {
      getSharedPrismaClient.mockReturnValue({
        patient: { findFirst: jest.fn().mockResolvedValue(null) }
      });

      const res = createResponse();
      await controller.addPatientDocument({ user: { companyId: 'c1' }, body: { patientId: 'other', documentType: 'IMAGE' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });

    test('rejects fileData over the 5MB cap', async () => {
      getSharedPrismaClient.mockReturnValue({
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'c1' }) }
      });

      const oversized = 'data:image/png;base64,' + 'a'.repeat(5 * 1024 * 1024 + 1);
      const res = createResponse();
      await controller.addPatientDocument(
        { user: { companyId: 'c1' }, body: { patientId: 'p1', documentType: 'IMAGE', fileData: oversized } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('rejects non-string fileData', async () => {
      getSharedPrismaClient.mockReturnValue({
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'c1' }) }
      });

      const res = createResponse();
      await controller.addPatientDocument(
        { user: { companyId: 'c1' }, body: { patientId: 'p1', fileData: { url: 'http://x' } } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.addPatientDocument({ user: {}, body: { patientId: 'p1' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('deletePatientDocument', () => {
    test('hard deletes a document scoped to the company', async () => {
      const mockPrisma = {
        patientDocument: {
          findFirst: jest.fn().mockResolvedValue({ id: 'doc-1', companyId: 'c1', patientId: 'p1' }),
          delete: jest.fn().mockResolvedValue({ id: 'doc-1' })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.deletePatientDocument({ user: { companyId: 'c1' }, params: { id: 'doc-1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.patientDocument.findFirst).toHaveBeenCalledWith({ where: { id: 'doc-1', companyId: 'c1' } });
      expect(mockPrisma.patientDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });

    test('returns 404 for a document from another company', async () => {
      getSharedPrismaClient.mockReturnValue({
        patientDocument: { findFirst: jest.fn().mockResolvedValue(null) }
      });

      const res = createResponse();
      await controller.deletePatientDocument({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.deletePatientDocument({ user: {}, params: { id: 'doc-1' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });
});
