jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/bookingInvoicesController');

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

const baseReq = {
  user: { id: 'user-1', companyId: 'company-1', firstName: 'محمد', lastName: 'علي' }
};

describe('bookingInvoicesController — clinic cashier & payments', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      patient: { findFirst: jest.fn() },
      medicalInvoice: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
      medicalPayment: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      cashierShift: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      appointment: { update: jest.fn() },
      transactionLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  describe('createInvoice', () => {
    test('rejects discount > 0 without a reason', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100, discount: 20 } };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('سبب الخصم مطلوب');
      expect(prisma.medicalInvoice.create).not.toHaveBeenCalled();
    });

    test('rejects additionAmount > 0 without a reason', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100, additionAmount: 10 } };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('سبب الإضافة مطلوب');
    });

    test('rejects invalid expenseSplit', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100, expenseSplit: 'WEIRD' } };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('تقسيم المصاريف غير صالح');
    });

    test('rejects initialPayment greater than net', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100, discount: 20, discountReason: 'عرض خاص', initialPayment: 90 } };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الدفعة الأولى أكبر من الصافي');
    });

    test('rejects an appointmentId from another company (no cross-tenant appointment write)', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100, appointmentId: 'appt-foreign' } };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.findFirst = jest.fn().mockResolvedValue(null);

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الموعد غير موجود');
      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
        where: { id: 'appt-foreign', companyId: 'company-1' },
        select: { id: true },
      });
      expect(prisma.medicalInvoice.create).not.toHaveBeenCalled();
    });

    test('rejects a non-finite total (Infinity)', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: Infinity } };

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('المبلغ غير صالح');
      expect(prisma.medicalInvoice.create).not.toHaveBeenCalled();
    });

    test('creates invoice with discount/addition/insurance and computes net + remaining', async () => {
      const req = {
        ...baseReq,
        body: {
          patientId: 'patient-1', total: 100, discount: 20, discountReason: 'عرض خاص',
          additionAmount: 10, additionReason: 'خدمة إضافية',
          insuranceAmount: 30, expenseSplit: 'BOTH', insuranceCompanyId: 'ins-1',
          ticketNumber: 'T-99', method: 'VODAFONE_CASH', initialPayment: 50,
        },
      };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.medicalInvoice.count.mockResolvedValue(0);
      prisma.medicalInvoice.create.mockImplementation(async ({ data }) => ({
        id: 'inv-1', ...data, createdAt: new Date(), updatedAt: new Date(),
      }));
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.appointment.update.mockResolvedValue({});

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountReason: 'عرض خاص',
            additionAmount: 10,
            additionReason: 'خدمة إضافية',
            insuranceAmount: 30,
            expenseSplit: 'BOTH',
            insuranceCompanyId: 'ins-1',
            ticketNumber: 'T-99',
            amountPaid: 50,
            status: 'PARTIAL',
          }),
        })
      );
      expect(prisma.medicalPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 50, method: 'VODAFONE_CASH', cashierName: 'محمد علي' }),
        })
      );
      expect(res.payload.data.net).toBe(90);
      expect(res.payload.data.remaining).toBe(40);
    });

    test('records initial payment with default CASH when method omitted', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100, initialPayment: 100 } };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.medicalInvoice.count.mockResolvedValue(0);
      prisma.medicalInvoice.create.mockImplementation(async ({ data }) => ({ id: 'inv-1', ...data }));
      prisma.medicalPayment.create.mockResolvedValue({});

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ method: 'CASH' }) })
      );
      expect(res.payload.data.status).toBe('PAID');
    });

    test('writes INVOICE CREATE and PAYMENT audit logs', async () => {
      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100, initialPayment: 50, method: 'CASH' } };
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', firstName: 'سارة', lastName: 'أحمد' });
      prisma.medicalInvoice.count.mockResolvedValue(0);
      prisma.medicalInvoice.create.mockImplementation(async ({ data }) => ({ id: 'inv-1', ...data }));
      prisma.medicalPayment.create.mockResolvedValue({});

      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(prisma.transactionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'INVOICE', entityId: 'inv-1', action: 'CREATE', amount: 100, payer: 'سارة أحمد', companyId: 'company-1',
          }),
        })
      );
      expect(prisma.transactionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'PAYMENT', entityId: 'inv-1', action: 'PAYMENT', amount: 50,
          }),
        })
      );
    });

    test('retries invoice creation when the invoice number collides under concurrency (P2002)', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.medicalInvoice.count.mockResolvedValue(0);
      const attempts = [];
      prisma.medicalInvoice.create.mockImplementation(async ({ data }) => {
        attempts.push(data.invoiceNumber);
        if (attempts.length < 3) {
          const err = new Error('Unique constraint failed on the fields');
          err.code = 'P2002';
          throw err;
        }
        return { id: 'inv-1', ...data };
      });

      const req = { ...baseReq, body: { patientId: 'patient-1', total: 100 } };
      const res = createResponse();
      await controller.createInvoice(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledTimes(3);
      expect(prisma.medicalInvoice.count).toHaveBeenCalledTimes(3);
      expect(res.payload.data.invoiceNumber).toBe(attempts[2]);
    });
  });

  describe('updateInvoice', () => {
    test('rejects raising discount without a reason', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0 });

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { discount: 15 } };
      const res = createResponse();
      await controller.updateInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('سبب الخصم مطلوب');
    });

    test('does not require a reason when discount is removed', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', total: 100, discount: 20, additionAmount: 0, amountPaid: 0 });
      prisma.medicalInvoice.update.mockImplementation(async ({ data }) => ({ id: 'inv-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0, ...data, createdAt: new Date() }));

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { discount: 0, discountReason: '' } };
      const res = createResponse();
      await controller.updateInvoice(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ discount: 0 }) })
      );
    });

    test('writes an INVOICE UPDATE audit log when discount changes', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0 });
      prisma.medicalInvoice.update.mockImplementation(async ({ data }) => ({ id: 'inv-1', total: 100, discount: 10, additionAmount: 0, amountPaid: 0, ...data }));

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { discount: 10, discountReason: 'عرض' } };
      const res = createResponse();
      await controller.updateInvoice(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.transactionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entityType: 'INVOICE', entityId: 'inv-1', action: 'UPDATE' }),
        })
      );
    });

    test('rejects a patientId from another company', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0 });
      prisma.patient.findFirst.mockResolvedValue(null);

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { patientId: 'patient-foreign' } };
      const res = createResponse();
      await controller.updateInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('المريض غير موجود');
      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'patient-foreign', companyId: 'company-1' },
        select: { id: true },
      });
      expect(prisma.medicalInvoice.update).not.toHaveBeenCalled();
    });

    test('rejects lowering net below the already-paid amount', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 80, status: 'PARTIAL' });
      prisma.medicalInvoice.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { discount: 50, discountReason: 'تخفيض' } };
      const res = createResponse();
      await controller.updateInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن خفض الصافي إلى أقل من المبلغ المسدد');
      expect(prisma.medicalInvoice.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteInvoice', () => {
    test('rejects deleting an invoice with recorded payments', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', amountPaid: 100, appointmentId: 'appt-1' });
      prisma.medicalInvoice.delete = jest.fn();

      const req = { ...baseReq, params: { id: 'inv-1' } };
      const res = createResponse();
      await controller.deleteInvoice(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن حذف فاتورة عليها دفعات مسجلة');
      expect(prisma.medicalInvoice.delete).not.toHaveBeenCalled();
    });

    test('resets appointment paymentStatus to pending after deleting the only invoice', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', amountPaid: 0, appointmentId: 'appt-1' });
      prisma.medicalInvoice.delete = jest.fn().mockResolvedValue({ id: 'inv-1' });
      prisma.medicalInvoice.findMany = jest.fn().mockResolvedValue([]);
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' } };
      const res = createResponse();
      await controller.deleteInvoice(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { paymentStatus: 'pending' },
      });
    });

    test('keeps appointment paymentStatus from remaining invoices after delete', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', amountPaid: 0, appointmentId: 'appt-1' });
      prisma.medicalInvoice.delete = jest.fn().mockResolvedValue({ id: 'inv-1' });
      prisma.medicalInvoice.findMany = jest.fn().mockResolvedValue([{ status: 'PARTIAL' }]);
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' } };
      const res = createResponse();
      await controller.deleteInvoice(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', appointmentId: 'appt-1', id: { not: 'inv-1' } },
        select: { status: true },
      });
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { paymentStatus: 'partial' },
      });
    });
  });

  describe('addPayment', () => {
    test('rejects unknown payment method', async () => {
      const invoice = { id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0, status: 'UNPAID', appointmentId: null };
      prisma.medicalInvoice.findFirst.mockResolvedValue(invoice);

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 50, method: 'BITCOIN' } };
      const res = createResponse();
      await controller.addPayment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('طريقة الدفع غير صالحة');
      expect(prisma.medicalPayment.create).not.toHaveBeenCalled();
    });

    test('rejects a non-finite payment amount (Infinity)', async () => {
      const invoice = { id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0, status: 'UNPAID', appointmentId: null };
      prisma.medicalInvoice.findFirst.mockResolvedValue(invoice);

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: Infinity, method: 'CASH' } };
      const res = createResponse();
      await controller.addPayment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('مبلغ الدفع غير صالح');
      expect(prisma.medicalPayment.create).not.toHaveBeenCalled();
    });

    test('records payment with new Egyptian method and updates invoice', async () => {
      const invoice = { id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0, status: 'UNPAID', appointmentId: null };
      prisma.medicalInvoice.findFirst.mockResolvedValue(invoice);
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.medicalInvoice.updateMany.mockResolvedValue({ count: 1 });
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 40, method: 'INSTAPAY' } };
      const res = createResponse();
      await controller.addPayment(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 40, method: 'INSTAPAY' }) })
      );
      expect(prisma.medicalInvoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', amountPaid: 0 },
        data: expect.objectContaining({ amountPaid: 40, status: 'PARTIAL' }),
      });
      expect(res.payload.data.amountPaid).toBe(40);
    });

    test('rejects a payment larger than the remaining balance', async () => {
      const invoice = { id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 80, status: 'PARTIAL', appointmentId: null };
      prisma.medicalInvoice.findFirst.mockResolvedValue(invoice);

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 50, method: 'CASH' } };
      const res = createResponse();
      await controller.addPayment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الدفع أكبر من المتبقي (20.00)');
      expect(prisma.medicalPayment.create).not.toHaveBeenCalled();
    });

    test('writes a PAYMENT audit log', async () => {
      const invoice = { id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0, status: 'UNPAID', appointmentId: null };
      prisma.medicalInvoice.findFirst.mockResolvedValue(invoice);
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.medicalInvoice.updateMany.mockResolvedValue({ count: 1 });
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 40, method: 'FAWRY' } };
      const res = createResponse();
      await controller.addPayment(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.transactionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entityType: 'PAYMENT', entityId: 'inv-1', action: 'PAYMENT', amount: 40 }),
        })
      );
    });

    test('rejects a concurrent overpayment via CAS when amountPaid changed under us', async () => {
      const invoice = { id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 0, status: 'UNPAID', appointmentId: null };
      prisma.medicalInvoice.findFirst.mockResolvedValue(invoice);
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.medicalInvoice.updateMany.mockResolvedValue({ count: 0 });
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 100, method: 'CASH' } };
      const res = createResponse();
      await controller.addPayment(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.payload.error).toBe('تغيّر رصيد الفاتورة، أعد المحاولة');
      expect(prisma.medicalInvoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', amountPaid: 0 },
        data: expect.objectContaining({ amountPaid: 100, status: 'PAID' }),
      });
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });
  });

  describe('paybackPayment', () => {
    const paidInvoice = { id: 'inv-1', companyId: 'company-1', total: 100, discount: 0, additionAmount: 0, amountPaid: 100, status: 'PAID', appointmentId: null };

    test('rejects payback without a reason', async () => {
      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 50, method: 'CASH' } };
      const res = createResponse();
      await controller.paybackPayment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('سبب الاسترداد مطلوب');
    });

    test('rejects payback exceeding amountPaid', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue(paidInvoice);

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 150, method: 'CASH', reason: 'إلغاء' } };
      const res = createResponse();
      await controller.paybackPayment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الاسترداد أكبر من المبلغ المسدد');
    });

    test('rejects a non-finite payback amount (Infinity)', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue(paidInvoice);

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: Infinity, method: 'CASH', reason: 'إلغاء' } };
      const res = createResponse();
      await controller.paybackPayment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('مبلغ الاسترداد غير صالح');
      expect(prisma.medicalPayment.create).not.toHaveBeenCalled();
    });

    test('creates negative payment row and sets invoice REFUNDED on full reversal', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue(paidInvoice);
      prisma.medicalPayment.findFirst.mockResolvedValue({ id: 'pay-1' });
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.medicalInvoice.updateMany.mockResolvedValue({ count: 1 });
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 100, method: 'CASH', reason: 'إلغاء الحجز' } };
      const res = createResponse();
      await controller.paybackPayment(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: -100,
            reason: 'إلغاء الحجز',
            paybackOfPaymentId: 'pay-1',
            cashierName: 'محمد علي',
          }),
        })
      );
      expect(prisma.medicalInvoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', amountPaid: 100 },
        data: expect.objectContaining({ amountPaid: 0, status: 'REFUNDED' }),
      });
      expect(res.payload.data.status).toBe('REFUNDED');
    });

    test('keeps PARTIAL status on partial reversal', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue(paidInvoice);
      prisma.medicalPayment.findFirst.mockResolvedValue({ id: 'pay-1' });
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.medicalInvoice.updateMany.mockResolvedValue({ count: 1 });
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 40, method: 'CASH', reason: 'استرداد جزئي' } };
      const res = createResponse();
      await controller.paybackPayment(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', amountPaid: 100 },
        data: expect.objectContaining({ amountPaid: 60, status: 'PARTIAL' }),
      });
    });

    test('rejects a concurrent double-payback via CAS when amountPaid changed under us', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue(paidInvoice);
      prisma.medicalPayment.findFirst.mockResolvedValue({ id: 'pay-1' });
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.medicalInvoice.updateMany.mockResolvedValue({ count: 0 });
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 100, method: 'CASH', reason: 'استرداد' } };
      const res = createResponse();
      await controller.paybackPayment(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.payload.error).toBe('تغيّر رصيد الفاتورة، أعد المحاولة');
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    test('writes a PAYBACK audit log', async () => {
      prisma.medicalInvoice.findFirst.mockResolvedValue(paidInvoice);
      prisma.medicalPayment.findFirst.mockResolvedValue({ id: 'pay-1' });
      prisma.medicalPayment.create.mockResolvedValue({});
      prisma.medicalInvoice.updateMany.mockResolvedValue({ count: 1 });
      prisma.appointment.update.mockResolvedValue({});

      const req = { ...baseReq, params: { id: 'inv-1' }, body: { amount: 40, method: 'CASH', reason: 'استرداد جزئي' } };
      const res = createResponse();
      await controller.paybackPayment(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.transactionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'PAYBACK', entityId: 'inv-1', action: 'PAYBACK', amount: 40,
            description: 'استرداد (CASH): استرداد جزئي',
          }),
        })
      );
    });
  });

  describe('cashier shifts', () => {
    test('opens a shift with opening balance', async () => {
      prisma.cashierShift.findFirst.mockResolvedValue(null);
      prisma.cashierShift.create.mockResolvedValue({
        id: 'shift-1', companyId: 'company-1', cashierId: 'user-1', cashierName: 'محمد علي',
        openingBalance: 200, status: 'OPEN', openedAt: new Date(),
      });

      const req = { ...baseReq, body: { openingBalance: 200 } };
      const res = createResponse();
      await controller.openCashierShift(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.cashierShift.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            cashierId: 'user-1',
            cashierName: 'محمد علي',
            openingBalance: 200,
            status: 'OPEN',
          }),
        })
      );
    });

    test('rejects opening when a shift is already open', async () => {
      prisma.cashierShift.findFirst.mockResolvedValue({ id: 'shift-1', status: 'OPEN' });

      const req = { ...baseReq, body: { openingBalance: 0 } };
      const res = createResponse();
      await controller.openCashierShift(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('يوجد شيفت مفتوح بالفعل لهذا الكاشير');
    });

    test('closes an open shift with closing balance', async () => {
      prisma.cashierShift.findFirst.mockResolvedValue({ id: 'shift-1', companyId: 'company-1', status: 'OPEN' });
      prisma.cashierShift.update.mockResolvedValue({
        id: 'shift-1', status: 'CLOSED', closingBalance: 500, closedAt: new Date(),
      });

      const req = { ...baseReq, params: { id: 'shift-1' }, body: { closingBalance: 500 } };
      const res = createResponse();
      await controller.closeCashierShift(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.cashierShift.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shift-1' },
          data: expect.objectContaining({ closingBalance: 500, status: 'CLOSED' }),
        })
      );
      expect(res.payload.data.status).toBe('CLOSED');
    });

    test('rejects closing an already closed shift', async () => {
      prisma.cashierShift.findFirst.mockResolvedValue({ id: 'shift-1', companyId: 'company-1', status: 'CLOSED' });

      const req = { ...baseReq, params: { id: 'shift-1' }, body: { closingBalance: 0 } };
      const res = createResponse();
      await controller.closeCashierShift(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الشيفت مغلق بالفعل');
    });

    test('returns current open shift or null', async () => {
      prisma.cashierShift.findFirst.mockResolvedValue({ id: 'shift-1', status: 'OPEN' });
      const req = { ...baseReq, query: {} };
      const res = createResponse();
      await controller.getCurrentCashierShift(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.id).toBe('shift-1');

      prisma.cashierShift.findFirst.mockResolvedValue(null);
      const res2 = createResponse();
      await controller.getCurrentCashierShift(req, res2);
      expect(res2.payload.data).toBeNull();
    });

    test('aggregates balance: collected by method, paybacks, discounts, additions', async () => {
      prisma.medicalPayment.findMany.mockResolvedValue([
        { amount: 500, method: 'CASH', paybackOfPaymentId: null, reason: null },
        { amount: 200, method: 'CARD', paybackOfPaymentId: null },
        { amount: -50, method: 'CASH', paybackOfPaymentId: 'pay-1', reason: 'استرداد' },
      ]);
      prisma.medicalInvoice.findMany.mockResolvedValue([
        { discount: 20, additionAmount: 10 },
        { discount: 5, additionAmount: 0 },
      ]);

      const req = { ...baseReq, query: { from: '2026-08-01', to: '2026-08-07', cashierId: 'user-1' } };
      const res = createResponse();
      await controller.getCashierShiftBalance(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: 'company-1' }) })
      );
      expect(prisma.medicalInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ cashierId: 'user-1' }) })
      );
      expect(res.payload.data.collectedByMethod).toEqual({ CASH: 500, CARD: 200 });
      expect(res.payload.data.totalCollected).toBe(700);
      expect(res.payload.data.paybacks).toBe(50);
      expect(res.payload.data.discounts).toBe(25);
      expect(res.payload.data.additions).toBe(10);
      expect(res.payload.data.counts).toEqual({ payments: 2, paybacks: 1, invoices: 2 });
    });
  });
});
