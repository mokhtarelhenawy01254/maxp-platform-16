import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import React from '../apps/frontend/node_modules/react/index.js';
import ReactDOMServer from '../apps/frontend/node_modules/react-dom/server.node.js';
import { JSDOM } from '../apps/frontend/node_modules/jsdom/lib/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000'
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;

async function run() {
  const { default: InvoiceContent, getInvoicePages } = await import('../apps/frontend/src/components/orders/InvoiceContent.tsx');

  const orders = [
    {
      id: 'inv-bulk-1',
      invoiceNumber: 'INV-2026-001',
      companyName: 'Red Line Trading (ريد لاين)',
      companyPhone: '01123456789',
      customerName: 'أحمد سامي عبد الرحمن',
      customerPhone: '01012345678',
      customerAddress: 'المعادي - شارع 9 - برج الياسمين',
      city: 'المعادي',
      governorate: 'القاهرة',
      paymentMethod: 'الدفع عند الاستلام',
      paymentStatus: 'PENDING',
      currency: 'EGP',
      subtotal: 1250,
      tax: 0,
      shipping: 50,
      discount: 0,
      totalAmount: 1300,
      notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022',
      metadata: {
        customAttributes: [
          { label: 'نوع وموديل وسنة صنع السيارة', value: 'هيونداي توسان 2022' }
        ]
      },
      order: {
        orderNumber: 'ORD-98231',
        trackingNumber: 'TRB-8839210',
        turboTrackingNumber: 'TRB-8839210',
        notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022',
        metadata: {
          customAttributes: [
            { label: 'نوع وموديل وسنة صنع السيارة', value: 'هيونداي توسان 2022' }
          ]
        },
        orderItems: [
          {
            productName: 'طقم دواسات سيارة 5D فاخرة',
            productSku: 'CAR-MAT-5D-BLK',
            productColor: 'أسود',
            productSize: 'كامل',
            quantity: 1,
            price: 1250,
            total: 1250
          }
        ]
      }
    },
    {
      id: 'inv-bulk-2',
      invoiceNumber: 'INV-2026-002',
      companyName: 'Red Line Trading (ريد لاين)',
      companyPhone: '01123456789',
      customerName: 'محمود كمال إبراهيم',
      customerPhone: '01234567890',
      customerAddress: 'مدينة نصر - الحي السابع - عمارة 15',
      city: 'مدينة نصر',
      governorate: 'القاهرة',
      paymentMethod: 'الدفع عند الاستلام',
      paymentStatus: 'PENDING',
      currency: 'EGP',
      subtotal: 980,
      tax: 0,
      shipping: 50,
      discount: 0,
      totalAmount: 1030,
      notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: كيا سبورتاج 2021',
      metadata: {
        customAttributes: [
          { label: 'نوع وموديل وسنة صنع السيارة', value: 'كيا سبورتاج 2021' }
        ]
      },
      order: {
        orderNumber: 'ORD-98232',
        trackingNumber: 'TRB-8839211',
        turboTrackingNumber: 'TRB-8839211',
        notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: كيا سبورتاج 2021',
        metadata: {
          customAttributes: [
            { label: 'نوع وموديل وسنة صنع السيارة', value: 'كيا سبورتاج 2021' }
          ]
        },
        orderItems: [
          {
            productName: 'غطاء مقاعد جلد فاخر مقاوم للحرارة',
            productSku: 'SEAT-CVR-KIA',
            productColor: 'رمادي',
            productSize: 'قياسي',
            quantity: 1,
            price: 980,
            total: 980
          }
        ]
      }
    },
    {
      id: 'inv-bulk-3',
      invoiceNumber: 'INV-2026-003',
      companyName: 'Red Line Trading (ريد لاين)',
      companyPhone: '01123456789',
      customerName: 'سارة عبد الله حسني',
      customerPhone: '01155443322',
      customerAddress: 'الدقي - شارع مصدق - برج الأطباء',
      city: 'الدقي',
      governorate: 'الجيزة',
      paymentMethod: 'الدفع عند الاستلام',
      paymentStatus: 'PENDING',
      currency: 'EGP',
      subtotal: 650,
      tax: 0,
      shipping: 50,
      discount: 0,
      totalAmount: 700,
      notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: تويوتا كورولا 2020',
      metadata: {
        customAttributes: [
          { label: 'نوع وموديل وسنة صنع السيارة', value: 'تويوتا كورولا 2020' }
        ]
      },
      order: {
        orderNumber: 'ORD-98233',
        trackingNumber: 'TRB-8839212',
        turboTrackingNumber: 'TRB-8839212',
        notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: تويوتا كورولا 2020',
        metadata: {
          customAttributes: [
            { label: 'نوع وموديل وسنة صنع السيارة', value: 'تويوتا كورولا 2020' }
          ]
        },
        orderItems: [
          {
            productName: 'حامل هاتف ذكي مغناطيسي للسيارة',
            productSku: 'PHONE-HLD-MAG',
            productColor: 'فضي',
            productSize: 'عالمي',
            quantity: 2,
            price: 325,
            total: 650
          }
        ]
      }
    },
    {
      id: 'inv-bulk-4',
      invoiceNumber: 'INV-2026-004',
      companyName: 'Red Line Trading (ريد لاين)',
      companyPhone: '01123456789',
      customerName: 'طارق مصطفى فهمي',
      customerPhone: '01599887766',
      customerAddress: 'سموحة - الإسكندرية - شارع فيكتور عمانويل',
      city: 'سموحة',
      governorate: 'الإسكندرية',
      paymentMethod: 'الدفع عند الاستلام',
      paymentStatus: 'PENDING',
      currency: 'EGP',
      subtotal: 1450,
      tax: 0,
      shipping: 60,
      discount: 0,
      totalAmount: 1510,
      notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: نيسان قشقاي 2023',
      metadata: {
        customAttributes: [
          { label: 'نوع وموديل وسنة صنع السيارة', value: 'نيسان قشقاي 2023' }
        ]
      },
      order: {
        orderNumber: 'ORD-98234',
        trackingNumber: 'TRB-8839213',
        turboTrackingNumber: 'TRB-8839213',
        notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: نيسان قشقاي 2023',
        metadata: {
          customAttributes: [
            { label: 'نوع وموديل وسنة صنع السيارة', value: 'نيسان قشقاي 2023' }
          ]
        },
        orderItems: [
          {
            productName: 'مظلة زجاج أمامي عاكسة للحرارة',
            productSku: 'SUN-SHD-SUV',
            productColor: 'فضي عاكس',
            productSize: 'SUV',
            quantity: 1,
            price: 1450,
            total: 1450
          }
        ]
      }
    }
  ];

  function buildGridPage(showCustomFields) {
    const renderedInvoices = orders.map((inv) => {
      const pages = getInvoicePages(inv);
      return ReactDOMServer.renderToString(
        React.createElement(InvoiceContent, {
          invoice: inv,
          settings: {
            showCompanyLogo: true,
            showTaxBreakdown: true,
            showPaymentMethod: true,
            showOrderItems: true,
            showCustomFields: showCustomFields,
            primaryColor: '#0f766e',
            secondaryColor: '#6b7280',
            fontFamily: 'Cairo, "Segoe UI", Tahoma, Arial, sans-serif',
            showBarcodeOrderCode: true,
            showBarcodeShippingCode: true
          },
          compact: true,
          page: pages[0]
        })
      );
    });

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>طباعة فواتير مجمعة (4 فواتير A4)</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', "Segoe UI", Tahoma, Arial, sans-serif;
      background: #e2e8f0;
      display: flex;
      justify-content: center;
      padding: 20px 0;
    }
    .a4-sheet {
      width: 210mm;
      height: 297mm;
      background: #fff;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    .a4-cell {
      width: 105mm;
      height: 148.5mm;
      overflow: hidden;
      box-sizing: border-box;
      border-right: 1.5px dashed #94a3b8;
      border-bottom: 1.5px dashed #94a3b8;
      padding: 2px;
    }
    .a4-cell:nth-child(2n) { border-right: none; }
    .a4-cell:nth-child(n+3) { border-bottom: none; }
  </style>
</head>
<body>
  <div class="a4-sheet">
    ${renderedInvoices.map((content) => `<div class="a4-cell">${content}</div>`).join('\n')}
  </div>
</body>
</html>`;
  }

  // 1. Before: showCustomFields = false (الوضع السابق في الباك حيث كان الصف مفقوداً)
  const beforeHtml = buildGridPage(false);
  const beforeFile = path.join(__dirname, 'bulk_invoices_before.html');
  fs.writeFileSync(beforeFile, beforeHtml, 'utf-8');

  // 2. After: showCustomFields = true (الوضع الجديد بعد تمرير notes و metadata وظهور صف مواصفات السيارة في كل الفواتير الـ 4 مع بقاء خانة الملاحظات نظيفة)
  const afterHtml = buildGridPage(true);
  const afterFile = path.join(__dirname, 'bulk_invoices_after.html');
  fs.writeFileSync(afterFile, afterHtml, 'utf-8');

  console.log('✅ Generated Bulk Invoices HTML:');
  console.log('  Before:', beforeFile);
  console.log('  After:', afterFile);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
