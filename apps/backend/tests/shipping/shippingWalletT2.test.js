/**
 * SHIP-T2: Company Wallet, Transaction Ledger & Print/Package Open Fees Acceptance Tests
 *
 * Acceptance Criteria (قبول رقمي):
 * 1. Collection 450 for shipment -> balance +450, availableForRemittance +450, COD_COLLECTED transaction with tracking code.
 * 2. Waybill print (fee 1.5) -> PRINT_FEE -1.5; reprint same shipment on same day -> NO second deduction (deduped).
 * 3. Statement ISSUED net 230 -> upcomingRemittance 230; at pay -> upcomingRemittance 0, balance -230, SETTLEMENT_PAYOUT transaction.
 * 4. Mode ASK_EACH with fee 5 -> confirm open package -> fee -5, OPEN_PACKAGE_FEE transaction with tracking code.
 * 5. GET /wallet/transactions?reason=PRINT_FEE returns filtered transactions + valid CSV export format.
 * 6. Manual adjustment with audit: adjust balance +500 records ADJUSTMENT transaction and createdBy.
 */

const companyWalletService = require('../../services/shipping/companyWalletService');

describe('SHIP-T2: Company Wallet & Transactions Ledger', () => {
  const companyId = 'company_test_t2';

  // State store for mock
  let walletState;
  let transactionsState;
  let policyState;
  let settlementsState;
  let shipmentsState;

  let mockPrisma;

  beforeEach(() => {
    walletState = {
      id: 'wallet_1',
      companyId,
      balance: 1000,
      availableForRemittance: 1000,
      upcomingRemittance: 0,
      currency: 'EGP',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    transactionsState = [];

    policyState = {
      companyId,
      printFeePerWaybill: 1.5,
      openPackageMode: 'ASK_EACH',
      openPackageFeeAlways: 2,
      openPackageFeeAsk: 5,
      openPackageFeeDeny: 0,
    };

    settlementsState = [];
    shipmentsState = [];

    mockPrisma = {
      companyWallet: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.companyId === companyId) {
            return { ...walletState };
          }
          return null;
        }),
        create: jest.fn(async ({ data }) => {
          walletState = {
            id: 'wallet_' + Date.now(),
            companyId: data.companyId,
            balance: Number(data.balance || 0),
            availableForRemittance: Number(data.availableForRemittance || 0),
            upcomingRemittance: Number(data.upcomingRemittance || 0),
            currency: data.currency || 'EGP',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return { ...walletState };
        }),
        update: jest.fn(async ({ where, data }) => {
          Object.assign(walletState, data);
          walletState.updatedAt = new Date();
          return { ...walletState };
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          if (where.companyId === companyId) {
            Object.assign(walletState, data);
            walletState.updatedAt = new Date();
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
      companyWalletTransaction: {
        create: jest.fn(async ({ data }) => {
          const tx = {
            id: 'tx_' + (transactionsState.length + 1),
            walletId: data.walletId,
            companyId: data.companyId,
            type: data.type,
            reason: data.reason,
            code: data.code,
            amount: Number(data.amount),
            balanceAfter: Number(data.balanceAfter),
            notes: data.notes || null,
            createdBy: data.createdBy || 'SYSTEM',
            createdAt: new Date(),
          };
          transactionsState.push(tx);
          return tx;
        }),
        findFirst: jest.fn(async ({ where }) => {
          return transactionsState.find(tx => {
            if (tx.companyId !== where.companyId) return false;
            if (where.reason && tx.reason !== where.reason) return false;
            if (where.code && tx.code !== where.code) return false;
            if (where.createdAt && where.createdAt.gte) {
              if (tx.createdAt < where.createdAt.gte) return false;
            }
            return true;
          }) || null;
        }),
        findMany: jest.fn(async ({ where, orderBy, skip, take }) => {
          let list = [...transactionsState].filter(tx => {
            if (tx.companyId !== where.companyId) return false;
            if (where.type && tx.type !== where.type) return false;
            if (where.reason && tx.reason !== where.reason) return false;
            return true;
          });
          if (skip !== undefined && take !== undefined) {
            list = list.slice(skip, skip + take);
          }
          return list;
        }),
        count: jest.fn(async ({ where }) => {
          return transactionsState.filter(tx => {
            if (tx.companyId !== where.companyId) return false;
            if (where.type && tx.type !== where.type) return false;
            if (where.reason && tx.reason !== where.reason) return false;
            return true;
          }).length;
        }),
      },
      shippingSettlement: {
        findMany: jest.fn(async ({ where }) => {
          return settlementsState.filter(s => {
            if (s.companyId !== where.companyId) return false;
            if (where.status) {
              if (where.status.in && !where.status.in.includes(s.status)) return false;
              if (typeof where.status === 'string' && s.status !== where.status) return false;
            }
            return true;
          });
        }),
      },
      shippingPolicySettings: {
        findUnique: jest.fn(async () => ({ ...policyState })),
      },
      $transaction: jest.fn(async (cb) => {
        return cb(mockPrisma);
      }),
    };
  });

  describe('Acceptance 1: تحصيل 450 لشحنة', () => {
    test('يزيد balance بـ 450 و availableForRemittance بـ 450 مع حركة COD_COLLECTED بكود الشحنة', async () => {
      const initialBalance = walletState.balance;
      const initialAvailable = walletState.availableForRemittance;

      const result = await companyWalletService.recordCodCollected({
        companyId,
        shipmentId: 'ship_001',
        trackingNumber: 'TRK-450-TEST',
        amount: 450,
        createdBy: 'COURIER_AHMED',
        prismaClient: mockPrisma,
      });

      expect(result.wallet.balance).toBe(initialBalance + 450);
      expect(result.wallet.availableForRemittance).toBe(initialAvailable + 450);
      expect(result.transaction.type).toBe('DEPOSIT');
      expect(result.transaction.reason).toBe('COD_COLLECTED');
      expect(result.transaction.code).toBe('TRK-450-TEST');
      expect(result.transaction.amount).toBe(450);
      expect(result.transaction.balanceAfter).toBe(initialBalance + 450);
      expect(result.transaction.createdBy).toBe('COURIER_AHMED');
    });
  });

  describe('Acceptance 2: طباعة بوليصة (رسوم 1.5) ومنع التكرار في نفس اليوم', () => {
    test('أول طباعة تخصم 1.5 وتسجل PRINT_FEE؛ ثاني طباعة في نفس اليوم لا تخصم', async () => {
      const initialBalance = walletState.balance;

      // 1st print
      const firstPrint = await companyWalletService.recordPrintFee({
        companyId,
        shipmentId: 'ship_002',
        trackingNumber: 'TRK-PRINT-123',
        template: 'WAYBILL',
        createdBy: 'DISPATCHER_SARA',
        prismaClient: mockPrisma,
      });

      expect(firstPrint.feeDeducted).toBe(true);
      expect(firstPrint.fee).toBe(1.5);
      expect(walletState.balance).toBe(initialBalance - 1.5);
      expect(walletState.availableForRemittance).toBe(initialBalance - 1.5);

      const tx = transactionsState[transactionsState.length - 1];
      expect(tx.type).toBe('WITHDRAW');
      expect(tx.reason).toBe('PRINT_FEE');
      expect(tx.code).toBe('TRK-PRINT-123');
      expect(tx.amount).toBe(1.5);

      // 2nd print same day
      const secondPrint = await companyWalletService.recordPrintFee({
        companyId,
        shipmentId: 'ship_002',
        trackingNumber: 'TRK-PRINT-123',
        template: 'WAYBILL',
        createdBy: 'DISPATCHER_SARA',
        prismaClient: mockPrisma,
      });

      expect(secondPrint.feeDeducted).toBe(false);
      expect(secondPrint.alreadyDeducted).toBe(true);
      // Balance remains unchanged
      expect(walletState.balance).toBe(initialBalance - 1.5);
      // Transaction count should still be 1
      expect(transactionsState.filter(t => t.code === 'TRK-PRINT-123').length).toBe(1);
    });
  });

  describe('Acceptance 3: دورة الكشف ISSUED ثم PAY', () => {
    test('كشف ISSUED صافي 230 -> upcomingRemittance 230؛ عند pay -> upcomingRemittance 0 و balance -230 وحركة SETTLEMENT_PAYOUT', async () => {
      // 1. Issue statement of 230
      settlementsState.push({
        id: 'stmt_230',
        companyId,
        status: 'ISSUED',
        netPayout: 230,
      });

      const upcoming = await companyWalletService.recalculateUpcomingRemittance(companyId, mockPrisma);
      expect(upcoming).toBe(230);
      expect(walletState.upcomingRemittance).toBe(230);

      // 2. Pay statement
      const initialBalance = walletState.balance;
      // When paid, status changes from ISSUED to PAID
      settlementsState[0].status = 'PAID';

      const payResult = await companyWalletService.recordSettlementPayout({
        companyId,
        settlementId: 'stmt_230',
        settlementCode: 'STMT-2026-001',
        amount: 230,
        createdBy: 'FINANCE_MANAGER',
        prismaClient: mockPrisma,
      });

      expect(payResult.wallet.balance).toBe(initialBalance - 230);
      expect(payResult.wallet.upcomingRemittance).toBe(0);
      expect(payResult.transaction.type).toBe('WITHDRAW');
      expect(payResult.transaction.reason).toBe('SETTLEMENT_PAYOUT');
      expect(payResult.transaction.code).toBe('STMT-2026-001');
      expect(payResult.transaction.amount).toBe(230);
      expect(payResult.transaction.createdBy).toBe('FINANCE_MANAGER');
    });
  });

  describe('Acceptance 4: وضع ASK_EACH برسوم 5 وتأكيد فتح الشحنة', () => {
    test('تأكيد فتح شحنة يخصم 5 ويسجل حركة OPEN_PACKAGE_FEE بكود الشحنة', async () => {
      const initialBalance = walletState.balance;

      const result = await companyWalletService.recordOpenPackageFee({
        companyId,
        shipmentId: 'ship_004',
        trackingNumber: 'TRK-OPEN-999',
        fee: 5,
        createdBy: 'COURIER_MAHMOUD',
        notes: 'رسوم فتح الشحنة بطلب العميل: TRK-OPEN-999',
        prismaClient: mockPrisma,
      });

      expect(result.feeDeducted).toBe(true);
      expect(result.fee).toBe(5);
      expect(walletState.balance).toBe(initialBalance - 5);
      expect(result.transaction.type).toBe('WITHDRAW');
      expect(result.transaction.reason).toBe('OPEN_PACKAGE_FEE');
      expect(result.transaction.code).toBe('TRK-OPEN-999');
      expect(result.transaction.amount).toBe(5);
      expect(result.transaction.createdBy).toBe('COURIER_MAHMOUD');

      // Second attempt on same shipment is deduped
      const repeat = await companyWalletService.recordOpenPackageFee({
        companyId,
        shipmentId: 'ship_004',
        trackingNumber: 'TRK-OPEN-999',
        fee: 5,
        prismaClient: mockPrisma,
      });
      expect(repeat.feeDeducted).toBe(false);
      expect(walletState.balance).toBe(initialBalance - 5);
    });
  });

  describe('Acceptance 5: استعلام دفتر المعاملات وتصدير CSV', () => {
    beforeEach(async () => {
      // Seed some mixed transactions
      await companyWalletService.recordCodCollected({
        companyId,
        shipmentId: 's1',
        trackingNumber: 'TRK-001',
        amount: 300,
        createdBy: 'ADMIN',
        prismaClient: mockPrisma,
      });
      await companyWalletService.recordPrintFee({
        companyId,
        shipmentId: 's2',
        trackingNumber: 'TRK-002',
        createdBy: 'ADMIN',
        prismaClient: mockPrisma,
      });
      await companyWalletService.recordOpenPackageFee({
        companyId,
        shipmentId: 's3',
        trackingNumber: 'TRK-003',
        fee: 5,
        createdBy: 'ADMIN',
        prismaClient: mockPrisma,
      });
    });

    test('فلترة حسب reason=PRINT_FEE ترجع حركات الطباعة فقط', async () => {
      const result = await companyWalletService.listTransactions({
        companyId,
        reason: 'PRINT_FEE',
        prismaClient: mockPrisma,
      });

      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].reason).toBe('PRINT_FEE');
      expect(result.transactions[0].code).toBe('TRK-002');
    });

    test('تصدير CSV يحتوي على ترويسة Turbo والأعمدة المطلوبة', async () => {
      const csvResult = await companyWalletService.listTransactions({
        companyId,
        exportCsv: true,
        prismaClient: mockPrisma,
      });

      expect(csvResult.csv).toBeDefined();
      expect(csvResult.csv).toContain('المعرف');
      expect(csvResult.csv).toContain('النوع');
      expect(csvResult.csv).toContain('السبب');
      expect(csvResult.csv).toContain('الكود');
      expect(csvResult.csv).toContain('القيمة');
      expect(csvResult.csv).toContain('الرصيد بعد الحركة');
      expect(csvResult.csv).toContain('أنشأ بواسطة');
      expect(csvResult.csv).toContain('TRK-001');
      expect(csvResult.csv).toContain('TRK-002');
    });
  });

  describe('Acceptance 6: تعديل يدوي مع تسجيل createdBy (Adjust Balance)', () => {
    test('تعديل يدوي يمر عبر الخدمة ويسجل createdBy والسبب وملاحظات', async () => {
      const initialBalance = walletState.balance;

      const adjustRes = await companyWalletService.adjustBalance({
        companyId,
        amount: 150,
        type: 'DEPOSIT',
        reason: 'ADJUSTMENT',
        notes: 'تسوية رصيد يدوية لعميل مميز',
        code: 'ADJ-2026-11',
        createdBy: 'SUPER_ADMIN_MOKHTAR',
        prismaClient: mockPrisma,
      });

      expect(adjustRes.wallet.balance).toBe(initialBalance + 150);
      expect(adjustRes.transaction.type).toBe('DEPOSIT');
      expect(adjustRes.transaction.reason).toBe('ADJUSTMENT');
      expect(adjustRes.transaction.code).toBe('ADJ-2026-11');
      expect(adjustRes.transaction.amount).toBe(150);
      expect(adjustRes.transaction.createdBy).toBe('SUPER_ADMIN_MOKHTAR');
      expect(adjustRes.transaction.notes).toBe('تسوية رصيد يدوية لعميل مميز');
    });
  });
});
