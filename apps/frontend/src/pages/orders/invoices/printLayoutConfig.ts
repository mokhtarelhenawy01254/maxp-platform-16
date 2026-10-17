import { type InvoiceData, getInvoicePages } from "../../../components/orders/InvoiceContent";

/**
 * Print layout modes:
 *  - "single"  → one invoice per A5 page   (1 slot / sheet, no grid)
 *  - "2up"     → two invoices per A4 page   (2 slots / sheet, stacked vertically)
 *  - "grid"    → four invoices per A4 page  (2×2 grid)
 */
export type PrintLayout = "single" | "2up" | "grid";

/** Represents one slot on a printed sheet */
export interface PageSlot {
  invoiceData: InvoiceData;
  page: ReturnType<typeof getInvoicePages>[0];
  key: string;
}

/** Smart auto-detect based on total slot count */
export function autoDetectLayout(slotCount: number): PrintLayout {
  if (slotCount <= 1) return "single";
  if (slotCount === 2) return "2up";
  return "grid";
}

/** How many slots go on each sheet for a given layout */
export const SLOTS_PER_SHEET: Record<PrintLayout, number> = {
  single: 1,
  "2up": 2,
  grid: 4,
};

export function getPrintCSS(printLayout: PrintLayout): string {
  if (printLayout === "single") {
    return `
      @page { margin: 6mm; size: A5 portrait; }
      .a4-sheet {
        width: 100%; height: auto;
        page-break-after: always; page-break-inside: avoid;
        padding: 0; margin: 0; display: block;
      }
      .a4-sheet:last-child { page-break-after: auto; }
      .a4-cell { width: 100%; height: auto; overflow: hidden; box-sizing: border-box; border: none; }
    `;
  }
  if (printLayout === "2up") {
    return `
      @page { margin: 0; size: A4 portrait; }
      .a4-sheet {
        width: 210mm; height: 297mm;
        page-break-after: always; page-break-inside: avoid;
        padding: 0; margin: 0; overflow: hidden; box-sizing: border-box;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
      .a4-sheet:last-child { page-break-after: auto; }
      .a4-cell {
        width: 210mm; height: 148.5mm;
        overflow: hidden; box-sizing: border-box;
        page-break-inside: avoid;
        border-bottom: 1.5px dashed #94a3b8;
      }
      .a4-cell:last-child { border-bottom: none; }
    `;
  }
  // grid (4-up)
  return `
    @page { margin: 0; size: A4 portrait; }
    .a4-sheet {
      width: 210mm; height: 297mm;
      page-break-after: always; page-break-inside: avoid;
      padding: 0; margin: 0; overflow: hidden; box-sizing: border-box;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }
    .a4-sheet:last-child { page-break-after: auto; }
    .a4-cell {
      width: 105mm; height: 148.5mm;
      overflow: hidden; box-sizing: border-box;
      page-break-inside: avoid;
      border-right: 1px dashed #e2e8f0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .a4-cell:nth-child(even) { border-right: none; }
    .a4-cell:nth-child(n+3) { border-bottom: none; }
  `;
}

export function getScreenCSS(printLayout: PrintLayout): string {
  if (printLayout === "single") {
    return `
      .a4-sheet {
        background: #fff; max-width: 148mm;
        margin: 0 auto 24px; border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        overflow: hidden; padding: 16px;
      }
      .a4-cell { border: none; }
    `;
  }
  if (printLayout === "2up") {
    return `
      .a4-sheet {
        background: #fff; max-width: 210mm; height: 297mm;
        margin: 0 auto 24px; border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        overflow: hidden;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
      .a4-cell {
        padding: 12px 16px;
        border-bottom: 1.5px dashed #cbd5e1;
        overflow: hidden; box-sizing: border-box;
      }
      .a4-cell:last-child { border-bottom: none; }
    `;
  }
  return `
    .a4-sheet {
      background: #fff; max-width: 210mm; height: 297mm;
      margin: 0 auto 24px; border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }
    .a4-cell {
      padding: 10px 12px;
      border-right: 1px dashed #cbd5e1;
      border-bottom: 1px dashed #cbd5e1;
      overflow: hidden; box-sizing: border-box;
    }
    .a4-cell:nth-child(even) { border-right: none; }
    .a4-cell:nth-child(n+3) { border-bottom: none; }
  `;
}
