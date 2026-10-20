/**
 * Client-side CSV export utility for Procurement reports and data grids.
 * Ensures UTF-8 BOM (\uFEFF) for pristine Arabic character rendering in Excel.
 * Properly escapes commas, quotes, and line breaks per RFC 4180.
 */

export interface CsvExportOptions {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

/**
 * Escapes an individual cell value according to RFC 4180 standards.
 * If the value contains commas, quotes, or newlines, it wraps the value in double quotes
 * and escapes internal double quotes by doubling them (" -> "").
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Pure function: converts tabular headers and rows into a UTF-8 BOM prefixed CSV string.
 * This function has no DOM dependencies and is 100% unit-testable.
 */
export function generateCsvString(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const BOM = '\uFEFF';
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return BOM + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Initiates a browser client-side download of the CSV data.
 */
export function downloadCsv(options: CsvExportOptions): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const csvContent = generateCsvString(options.headers, options.rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = options.filename.endsWith('.csv') ? options.filename : `${options.filename}.csv`;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
