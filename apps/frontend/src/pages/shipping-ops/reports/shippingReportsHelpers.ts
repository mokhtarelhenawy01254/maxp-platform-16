/**
 * Shipping Reports Helpers & Utilities (SHIP-W7)
 */

export type DatePreset = 'today' | '7days' | '30days' | 'custom';

export function getDateRangeFromPreset(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);

  if (preset === 'today') {
    return { from: toStr, to: toStr };
  }

  if (preset === '7days') {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    return { from: fromDate.toISOString().slice(0, 10), to: toStr };
  }

  if (preset === '30days') {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    return { from: fromDate.toISOString().slice(0, 10), to: toStr };
  }

  return {};
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-US');
}

export function formatCurrency(val: number | null | undefined, currency = 'EGP'): string {
  if (val === null || val === undefined || isNaN(Number(val))) return `0.00 ${currency}`;
  return `${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  // Add UTF-8 BOM so Excel opens Arabic correctly
  const BOM = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
