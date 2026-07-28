const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const HEADER_COLOR = '1E3A5F';
const ALT_ROW_COLOR = 'F0F4F8';
const BORDER_COLOR = 'CBD5E1';
const ACCENT_COLOR = '3B82F6';

const headerRowEn = ['Order Code', 'Customer Name', 'Phone', 'City', 'Area', 'Governorate', 'Address', 'Product Name', 'SKU', 'Size', 'Color', 'Quantity', 'Price', 'COD', 'Notes'];
const NCOLS = headerRowEn.length;

const sampleData = [
  ['38124947', 'Ahmed Mohamed', '01001234567', 'Nasr City', 'الحي السابع', 'Cairo', 'العبور فيلا 38', 'Nike Air Max 270', 'NIKE-AM270-BLK', '42', 'Black', 2, 150.00, 300.00, 'توصيل سريع'],
  ['38124946', 'Sara Ali', '01112223333', 'Mohandessin', '', 'Giza', '٣شارع عبد الحميد', 'Adidas Ultraboost', 'AD-UBS-WHT', '38', 'White', 1, 200.00, 200.00, ''],
  ['38124943', 'Mohamed Khaled', '01009998877', 'Maadi', 'بئر ام سلطان', 'Cairo', '46 ش كامل همام', 'Puma T-Shirt', 'PU-TS-RED', 'L', 'Red', 3, 75.50, 226.50, 'مقاس كبير'],
];

const COL_WIDTHS = [
  { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 16 },
  { wch: 16 }, { wch: 16 }, { wch: 32 }, { wch: 28 },
  { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
  { wch: 12 }, { wch: 12 }, { wch: 24 },
];

const headerStyle = {
  font: { name: 'Calibri', bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: HEADER_COLOR }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: HEADER_COLOR } },
    bottom: { style: 'thin', color: { rgb: HEADER_COLOR } },
    left: { style: 'thin', color: { rgb: HEADER_COLOR } },
    right: { style: 'thin', color: { rgb: HEADER_COLOR } },
  },
};

function dataRowStyle(isEven, isNumeric) {
  return {
    font: { name: 'Calibri', sz: 11, color: { rgb: '1F2937' } },
    fill: { fgColor: { rgb: isEven ? ALT_ROW_COLOR : 'FFFFFF' }, patternType: 'solid' },
    alignment: { horizontal: isNumeric ? 'center' : 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { rgb: BORDER_COLOR } },
      left: { style: 'thin', color: { rgb: BORDER_COLOR } },
      right: { style: 'thin', color: { rgb: BORDER_COLOR } },
    },
  };
}

function createOrdersSheet() {
  const allRows = [headerRowEn, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws['!cols'] = COL_WIDTHS;

  if (!ws['!ref']) return ws;
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;

      const isHeader = R === 0;
      const dataIdx = R - 1;
      const isData = dataIdx >= 0;
      const isEven = dataIdx % 2 === 0;
      const isNumeric = C === 11 || C === 12 || C === 13;

      if (isHeader) {
        ws[addr].s = headerStyle;
      } else if (isData) {
        ws[addr].s = dataRowStyle(isEven, isNumeric);
        if (isNumeric && ws[addr].t === 'n') {
          ws[addr].z = (C === 12 || C === 13) ? '#,##0.00' : '0';
        }
      }
    }
  }

  return ws;
}

function createInstructionsSheet() {
  const instructions = [
    ['BULK ORDERS TEMPLATE - INSTRUCTIONS / تعليمات قالب الطلبات المجمعة'],
    [''],
    ['ENGLISH:'],
    ['1. Fill in your order data in the "Orders" sheet, starting from row 2 (below the header).'],
    ['2. Delete the sample data rows (rows 2-4) before adding your own.'],
    ['3. DO NOT modify or delete the header row (row 1).'],
    ['4. Columns: Customer Name, Phone, City, Area, Governorate, Address, Product Name, SKU, Size, Color, Quantity, Price, COD, Notes.'],
    ['5. Quantity, Price, and COD MUST be numbers only. Do not add currency symbols.'],
    ['6. Area, Address, and Notes columns are optional.'],
    ['7. Save the file and upload it from the Bulk Orders page.'],
    ['8. Supports both English and Arabic column headers (.xlsx, .xls, .csv).'],
    [''],
    ['عربي:'],
    ['-١ .املأ بيانات الطلبات في ورقة "Orders" بدءاً من الصف ٢ (أسفل العنوان)'],
    ['-٢ .احذف صفوف بيانات العينة (الصفوف ٢-٤) قبل إضافة بياناتك'],
    ['-٣ .لا تقم بتعديل أو حذف صف العنوان (الصف ١)'],
    ['-٤ .الأعمدة: اسم العميل، الهاتف، المدينة، المنطقة، المحافظة، العنوان، اسم المنتج، SKU، المقاس، اللون، الكمية، السعر، المبلغ، ملاحظات'],
    ['-٥ .الكمية والسعر والمبلغ يجب أن يكونا أرقاماً فقط. لا تضف رموز العملة'],
    ['-٦ .حقول المنطقة والعنوان والملاحظات اختيارية'],
    ['-٧ .احفظ الملف وارفعه من صفحة الطلبات المجمعة'],
    ['-٨ .يدعم العناوين بالإنجليزية والعربية (xlsx. , xls. , csv.)'],
    [''],
    ['COLUMN MAPPING / خريطة الأعمدة (النظام يتعرف على كلا الإسمين):'],
    [''],
    ['Customer Name  =  اسم العميل  /  اسم المستلم'],
    ['Phone          =  الهاتف  /  رقم الهاتف'],
    ['City           =  المدينة'],
    ['Area           =  المنطقة'],
    ['Governorate    =  المحافظة'],
    ['Address        =  العنوان'],
    ['Product Name   =  اسم المنتج  /  المنتج  /  محتوى الطلب'],
    ['SKU            =  SKU'],
    ['Size           =  المقاس'],
    ['Color          =  اللون'],
    ['Quantity       =  الكمية'],
    ['Price          =  السعر'],
    ['COD            =  المبلغ المطلوب تحصيله'],
    ['Notes          =  ملاحظات'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(instructions);
  ws['!cols'] = [{ wch: 80 }];

  if (!ws['!ref']) return ws;
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; R++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
    if (!ws[addr]) continue;

    const val = String(ws[addr].v || '');
    const isTitle = R === 0;
    const isSection = ['ENGLISH:', 'عربي:', 'COLUMN NAMES (English / Arabic) / أسماء الأعمدة (إنجليزي / عربي):', 'NOTE: You can use EITHER English OR Arabic column headers in your own files.'].includes(val) || val.startsWith('NOTE:');

    ws[addr].s = {
      font: {
        name: 'Calibri',
        bold: isTitle || isSection,
        sz: isTitle ? 14 : isSection ? 12 : 11,
        color: { rgb: isTitle ? HEADER_COLOR : isSection ? ACCENT_COLOR : '374151' },
      },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    };
  }

  return ws;
}

function generate() {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, createOrdersSheet(), 'Orders');
  XLSX.utils.book_append_sheet(wb, createInstructionsSheet(), 'Instructions');

  const outputDir = path.join(__dirname, '..', '..', '..', 'apps', 'frontend', 'public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'bulk_order_template.xlsx');
  XLSX.writeFile(wb, outputPath);
  console.log(`Template generated: ${outputPath}`);
}

generate();
