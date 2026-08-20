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
  ['38124947', 'Ahmed Mohamed', '01001234567', 'Nasr City', '╪º┘ä╪¡┘è ╪º┘ä╪│╪º╪¿╪╣', 'Cairo', '╪º┘ä╪╣╪¿┘ê╪▒ ┘ü┘è┘ä╪º 38', 'Nike Air Max 270', 'NIKE-AM270-BLK', '42', 'Black', 2, 150.00, 300.00, '╪¬┘ê╪╡┘è┘ä ╪│╪▒┘è╪╣'],
  ['38124946', 'Sara Ali', '01112223333', 'Mohandessin', '', 'Giza', '┘ú╪┤╪º╪▒╪╣ ╪╣╪¿╪» ╪º┘ä╪¡┘à┘è╪»', 'Adidas Ultraboost', 'AD-UBS-WHT', '38', 'White', 1, 200.00, 200.00, ''],
  ['38124943', 'Mohamed Khaled', '01009998877', 'Maadi', '╪¿╪ª╪▒ ╪º┘à ╪│┘ä╪╖╪º┘å', 'Cairo', '46 ╪┤ ┘â╪º┘à┘ä ┘ç┘à╪º┘à', 'Puma T-Shirt', 'PU-TS-RED', 'L', 'Red', 3, 75.50, 226.50, '┘à┘é╪º╪│ ┘â╪¿┘è╪▒'],
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
    ['BULK ORDERS TEMPLATE - INSTRUCTIONS / ╪¬╪╣┘ä┘è┘à╪º╪¬ ┘é╪º┘ä╪¿ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪¼┘à╪╣╪⌐'],
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
    ['╪╣╪▒╪¿┘è:'],
    ['-┘í .╪º┘à┘ä╪ú ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ü┘è ┘ê╪▒┘é╪⌐ "Orders" ╪¿╪»╪í╪º┘ï ┘à┘å ╪º┘ä╪╡┘ü ┘ó (╪ú╪│┘ü┘ä ╪º┘ä╪╣┘å┘ê╪º┘å)'],
    ['-┘ó .╪º╪¡╪░┘ü ╪╡┘ü┘ê┘ü ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╣┘è┘å╪⌐ (╪º┘ä╪╡┘ü┘ê┘ü ┘ó-┘ñ) ┘é╪¿┘ä ╪Ñ╪╢╪º┘ü╪⌐ ╪¿┘è╪º┘å╪º╪¬┘â'],
    ['-┘ú .┘ä╪º ╪¬┘é┘à ╪¿╪¬╪╣╪»┘è┘ä ╪ú┘ê ╪¡╪░┘ü ╪╡┘ü ╪º┘ä╪╣┘å┘ê╪º┘å (╪º┘ä╪╡┘ü ┘í)'],
    ['-┘ñ .╪º┘ä╪ú╪╣┘à╪»╪⌐: ╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä╪î ╪º┘ä┘ç╪º╪¬┘ü╪î ╪º┘ä┘à╪»┘è┘å╪⌐╪î ╪º┘ä┘à┘å╪╖┘é╪⌐╪î ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐╪î ╪º┘ä╪╣┘å┘ê╪º┘å╪î ╪º╪│┘à ╪º┘ä┘à┘å╪¬╪¼╪î SKU╪î ╪º┘ä┘à┘é╪º╪│╪î ╪º┘ä┘ä┘ê┘å╪î ╪º┘ä┘â┘à┘è╪⌐╪î ╪º┘ä╪│╪╣╪▒╪î ╪º┘ä┘à╪¿┘ä╪║╪î ┘à┘ä╪º╪¡╪╕╪º╪¬'],
    ['-┘Ñ .╪º┘ä┘â┘à┘è╪⌐ ┘ê╪º┘ä╪│╪╣╪▒ ┘ê╪º┘ä┘à╪¿┘ä╪║ ┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å╪º ╪ú╪▒┘é╪º┘à╪º┘ï ┘ü┘é╪╖. ┘ä╪º ╪¬╪╢┘ü ╪▒┘à┘ê╪▓ ╪º┘ä╪╣┘à┘ä╪⌐'],
    ['-┘ª .╪¡┘é┘ê┘ä ╪º┘ä┘à┘å╪╖┘é╪⌐ ┘ê╪º┘ä╪╣┘å┘ê╪º┘å ┘ê╪º┘ä┘à┘ä╪º╪¡╪╕╪º╪¬ ╪º╪«╪¬┘è╪º╪▒┘è╪⌐'],
    ['-┘º .╪º╪¡┘ü╪╕ ╪º┘ä┘à┘ä┘ü ┘ê╪º╪▒┘ü╪╣┘ç ┘à┘å ╪╡┘ü╪¡╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪¼┘à╪╣╪⌐'],
    ['-┘¿ .┘è╪»╪╣┘à ╪º┘ä╪╣┘å╪º┘ê┘è┘å ╪¿╪º┘ä╪Ñ┘å╪¼┘ä┘è╪▓┘è╪⌐ ┘ê╪º┘ä╪╣╪▒╪¿┘è╪⌐ (xlsx. , xls. , csv.)'],
    [''],
    ['COLUMN MAPPING / ╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪ú╪╣┘à╪»╪⌐ (╪º┘ä┘å╪╕╪º┘à ┘è╪¬╪╣╪▒┘ü ╪╣┘ä┘ë ┘â┘ä╪º ╪º┘ä╪Ñ╪│┘à┘è┘å):'],
    [''],
    ['Customer Name  =  ╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä  /  ╪º╪│┘à ╪º┘ä┘à╪│╪¬┘ä┘à'],
    ['Phone          =  ╪º┘ä┘ç╪º╪¬┘ü  /  ╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü'],
    ['City           =  ╪º┘ä┘à╪»┘è┘å╪⌐'],
    ['Area           =  ╪º┘ä┘à┘å╪╖┘é╪⌐'],
    ['Governorate    =  ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐'],
    ['Address        =  ╪º┘ä╪╣┘å┘ê╪º┘å'],
    ['Product Name   =  ╪º╪│┘à ╪º┘ä┘à┘å╪¬╪¼  /  ╪º┘ä┘à┘å╪¬╪¼  /  ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪╖┘ä╪¿'],
    ['SKU            =  SKU'],
    ['Size           =  ╪º┘ä┘à┘é╪º╪│'],
    ['Color          =  ╪º┘ä┘ä┘ê┘å'],
    ['Quantity       =  ╪º┘ä┘â┘à┘è╪⌐'],
    ['Price          =  ╪º┘ä╪│╪╣╪▒'],
    ['COD            =  ╪º┘ä┘à╪¿┘ä╪║ ╪º┘ä┘à╪╖┘ä┘ê╪¿ ╪¬╪¡╪╡┘è┘ä┘ç'],
    ['Notes          =  ┘à┘ä╪º╪¡╪╕╪º╪¬'],
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
    const isSection = ['ENGLISH:', '╪╣╪▒╪¿┘è:', 'COLUMN NAMES (English / Arabic) / ╪ú╪│┘à╪º╪í ╪º┘ä╪ú╪╣┘à╪»╪⌐ (╪Ñ┘å╪¼┘ä┘è╪▓┘è / ╪╣╪▒╪¿┘è):', 'NOTE: You can use EITHER English OR Arabic column headers in your own files.'].includes(val) || val.startsWith('NOTE:');

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
