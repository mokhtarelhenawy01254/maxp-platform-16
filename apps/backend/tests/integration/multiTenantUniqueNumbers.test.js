const fs = require('fs');
const path = require('path');

describe('FIN-B3 & FIN-B4: Multi-Tenant Scoped Unique Numbers', () => {
  const inventorySchemaPath = path.join(__dirname, '../../prisma/schema/inventory.prisma');
  const dentalLabSchemaPath = path.join(__dirname, '../../prisma/schema/dental_lab.prisma');

  let inventorySchema = '';
  let dentalLabSchema = '';

  beforeAll(() => {
    inventorySchema = fs.readFileSync(inventorySchemaPath, 'utf8');
    dentalLabSchema = fs.readFileSync(dentalLabSchemaPath, 'utf8');
  });

  describe('FIN-B3: Inventory schema multi-tenant uniqueness', () => {
    it('enforces @@unique([companyId, invoiceNumber]) on PurchaseInvoice', () => {
      // Must have @@unique([companyId, invoiceNumber])
      expect(inventorySchema).toMatch(/@@unique\(\[companyId,\s*invoiceNumber\]\)/);

      // invoiceNumber field itself must NOT have a bare global @unique
      const purchaseInvoiceModelMatch = inventorySchema.match(/model\s+PurchaseInvoice\s*\{[\s\S]*?\n\}/);
      expect(purchaseInvoiceModelMatch).toBeTruthy();
      const modelContent = purchaseInvoiceModelMatch[0];
      expect(modelContent).not.toMatch(/invoiceNumber\s+String\s+@unique/);
    });

    it('enforces @@unique([companyId, orderNumber]) on PurchaseOrder', () => {
      // Must have @@unique([companyId, orderNumber])
      expect(inventorySchema).toMatch(/@@unique\(\[companyId,\s*orderNumber\]\)/);

      // orderNumber field itself must NOT have a bare global @unique
      const purchaseOrderModelMatch = inventorySchema.match(/model\s+PurchaseOrder\s*\{[\s\S]*?\n\}/);
      expect(purchaseOrderModelMatch).toBeTruthy();
      const modelContent = purchaseOrderModelMatch[0];
      expect(modelContent).not.toMatch(/orderNumber\s+String\s+@unique/);
    });

    it('enforces @@unique([companyId, paymentNumber]) on SupplierPayment', () => {
      // Must have @@unique([companyId, paymentNumber])
      expect(inventorySchema).toMatch(/@@unique\(\[companyId,\s*paymentNumber\]\)/);

      // paymentNumber field itself must NOT have a bare global @unique
      const supplierPaymentModelMatch = inventorySchema.match(/model\s+SupplierPayment\s*\{[\s\S]*?\n\}/);
      expect(supplierPaymentModelMatch).toBeTruthy();
      const modelContent = supplierPaymentModelMatch[0];
      expect(modelContent).not.toMatch(/paymentNumber\s+String\s+@unique/);
    });
  });

  describe('FIN-B4: Dental Lab schema multi-tenant uniqueness', () => {
    it('enforces @@unique([companyId, invoiceNumber]) on DentalInvoice', () => {
      // Must have @@unique([companyId, invoiceNumber])
      expect(dentalLabSchema).toMatch(/@@unique\(\[companyId,\s*invoiceNumber\]\)/);

      // invoiceNumber field itself must NOT have a bare global @unique
      const dentalInvoiceModelMatch = dentalLabSchema.match(/model\s+DentalInvoice\s*\{[\s\S]*?\n\}/);
      expect(dentalInvoiceModelMatch).toBeTruthy();
      const modelContent = dentalInvoiceModelMatch[0];
      expect(modelContent).not.toMatch(/invoiceNumber\s+String\s+@unique/);
    });
  });

  describe('Multi-tenant uniqueness logic simulation', () => {
    it('allows different companies to use the identical invoice/order/payment number', () => {
      const records = new Map(); // key: `${companyId}:${number}`

      const insertRecord = (companyId, number) => {
        const compositeKey = `${companyId}:${number}`;
        if (records.has(compositeKey)) {
          throw new Error(`Unique constraint failed on the fields: (companyId, number)`);
        }
        records.set(compositeKey, { companyId, number, id: `rec_${Date.now()}` });
        return records.get(compositeKey);
      };

      const company1 = 'comp_alpha';
      const company2 = 'comp_beta';
      const sharedInvoiceNumber = 'INV-2026-0001';

      // Company 1 creates INV-2026-0001
      const rec1 = insertRecord(company1, sharedInvoiceNumber);
      expect(rec1.companyId).toBe(company1);
      expect(rec1.number).toBe(sharedInvoiceNumber);

      // Company 2 creates the exact same INV-2026-0001 without collision
      const rec2 = insertRecord(company2, sharedInvoiceNumber);
      expect(rec2.companyId).toBe(company2);
      expect(rec2.number).toBe(sharedInvoiceNumber);

      // But Company 1 creating the same number again fails
      expect(() => {
        insertRecord(company1, sharedInvoiceNumber);
      }).toThrow('Unique constraint failed on the fields: (companyId, number)');
    });
  });
});
