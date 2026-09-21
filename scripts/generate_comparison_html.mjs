import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from '../apps/frontend/node_modules/jsdom/lib/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup JSDOM global environment for JsBarcode
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

async function run() {
  const { buildSingleLabelDocument } = await import('../apps/frontend/src/utils/printShippingLabel.ts');

  const sampleOrder = {
    id: 'ord-101',
    orderNumber: 'ORD-98231',
    trackingNumber: 'TRB-8839210',
    turboTrackingNumber: 'TRB-8839210',
    customerName: 'أحمد سامي عبد الرحمن',
    customerPhone: '01012345678',
    governorate: 'القاهرة',
    city: 'المعادي',
    customerAddress: 'المعادي - شارع 9 - برج الياسمين الدور الرابع شقة 12',
    notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022',
    metadata: {
      customAttributes: [
        { label: 'نوع وموديل وسنة صنع السيارة', value: 'هيونداي توسان 2022' },
      ],
    },
    shippingAddress: {
      governorate: 'القاهرة',
      city: 'المعادي',
      street: 'شارع 9 - برج الياسمين الدور الرابع شقة 12',
    },
    items: [
      {
        id: 'item-1',
        productName: 'طقم دواسات سيارة 5D فاخرة مقاومة للمياه',
        productSku: 'CAR-MAT-5D-BLK',
        quantity: 1,
        price: 1250,
        total: 1250,
        productColor: 'أسود بتطريز أحمر',
        productSize: 'صالون كامل',
      },
    ],
    orderItems: [
      {
        id: 'item-1',
        productName: 'طقم دواسات سيارة 5D فاخرة مقاومة للمياه',
        productSku: 'CAR-MAT-5D-BLK',
        quantity: 1,
        price: 1250,
        total: 1250,
        productColor: 'أسود بتطريز أحمر',
        productSize: 'صالون كامل',
      },
    ],
    subtotal: 1250,
    shippingCost: 50,
    shipping: 50,
    total: 1300,
    totalAmount: 1300,
    currency: 'EGP',
    status: 'READY_FOR_SHIPPING',
    paymentStatus: 'UNPAID',
    paymentMethod: 'COD',
  };

  const companyName = 'Red Line Trading (ريد لاين)';
  const companyLogoUrl = null;

  // 1. BEFORE: showCustomFields = false (أو الشركات الأخرى)
  const beforeHtml = buildSingleLabelDocument(
    sampleOrder,
    companyName,
    companyLogoUrl,
    { showCustomFields: false }
  );

  // 2. AFTER: showCustomFields = true (شركة red-line مع تفعيل الحقل المخصص)
  const afterHtml = buildSingleLabelDocument(
    sampleOrder,
    companyName,
    companyLogoUrl,
    { showCustomFields: true }
  );

  const beforeFile = path.join(__dirname, 'shipping_label_before.html');
  const afterFile = path.join(__dirname, 'shipping_label_after.html');

  fs.writeFileSync(beforeFile, beforeHtml, 'utf-8');
  fs.writeFileSync(afterFile, afterHtml, 'utf-8');

  console.log('✅ Generated HTML files:');
  console.log('  Before:', beforeFile);
  console.log('  After:', afterFile);
}

run().catch(console.error);
