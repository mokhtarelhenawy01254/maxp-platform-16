import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  label: string;
}

export const exportToCSV = (
  data: any[],
  columns: ExportColumn[],
  filename: string = 'export.csv'
) => {
  // Create CSV content
  const headers = columns.map((col) => col.label).join(',');
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );

  const csvContent = [headers, ...rows].join('\\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export const exportToExcel = (
  data: any[],
  columns: ExportColumn[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1'
) => {
  // Prepare data for Excel
  const excelData = data.map((row) => {
    const excelRow: any = {};
    columns.forEach((col) => {
      excelRow[col.label] = row[col.key];
    });
    return excelRow;
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const maxWidth = 50;
  const colWidths = columns.map((col) => {
    const maxLength = Math.max(
      col.label.length,
      ...data.map((row) => String(row[col.key] ?? '').length)
    );
    return { wch: Math.min(maxLength + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;

  // Download
  XLSX.writeFile(workbook, filename);
};

export const exportToPDF = (
  data: any[],
  columns: ExportColumn[],
  title: string = 'تقرير',
  filename: string = 'export.pdf'
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
  });

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Add date
  doc.setFontSize(10);
  doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`, 14, 28);

  // Prepare table data
  const headers = columns.map((col) => col.label);
  const rows = data.map((row) =>
    columns.map((col) => String(row[col.key] ?? ''))
  );

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: {
      font: 'helvetica',
      fontSize: 10,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // Download
  doc.save(filename);
};

export const printTable = (
  data: any[],
  columns: ExportColumn[],
  title: string = 'تقرير'
) => {
  // Verify we are in a browser environment
  if (typeof window === 'undefined') return;

  // Helper to escape HTML to prevent XSS
  const escapeHtml = (unsafe: any): string => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Build HTML content
  const headers = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join('');
  const rows = data
    .map(
      (row) =>
        `<tr>${columns
          .map((col) => `<td>${escapeHtml(row[col.key])}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            direction: rtl;
            padding: 20px;
          }
          h1 {
            text-align: center;
            color: #333;
          }
          .date {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
          }
          th {
            background-color: #3b82f6;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f5f7fa;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
        <table>
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};
