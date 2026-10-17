import React from "react";
import InvoiceContent from "../../components/orders/InvoiceContent";
import {
  usePrintMultipleInvoicesData,
} from "./invoices/usePrintMultipleInvoicesData";
import {
  PrintMultipleControls,
} from "./invoices/PrintMultipleControls";
import {
  getPrintCSS,
  getScreenCSS,
} from "./invoices/printLayoutConfig";

// Re-exports for backward-compatibility with dynamic imports across the codebase
export {
  storeGuestPrintPayload,
  makeGuestPrintKey,
  GUEST_PRINT_STORAGE_PREFIX,
  type GuestPrintPayload,
  type GuestPrintCompanyInfo,
  type GuestOrderPrint,
} from "./invoices/guestPrintPayload";

const PrintMultipleInvoices: React.FC = () => {
  const {
    invoices,
    guestSlots,
    loading,
    error,
    settings,
    settingsLoading,
    printLayout,
    autoLayout,
    allSlots,
    sheets,
    handleLayoutChange,
    triggerPrint,
  } = usePrintMultipleInvoicesData();

  const printCSS = getPrintCSS(printLayout);
  const screenCSS = getScreenCSS(printLayout);
  const isCompact = printLayout !== "single";

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center p-8 bg-card border border-border/70 rounded-2xl shadow-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-xs text-muted-foreground font-medium">جاري تجهيز وتحميل الفواتير للطباعة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center p-8 bg-card border border-border/70 rounded-2xl shadow-xs max-w-sm">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">{error}</p>
          <p className="text-xs text-muted-foreground">
            يرجى تحديد فواتير صالحة للطباعة من قائمة الطلبات
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-print-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
          .no-print { display: none !important; }
          ${printCSS}
          .invoice-header, .invoice-totals { page-break-inside: avoid; }
          .invoice-number-text { display: none !important; }
        }
        @media screen {
          .invoice-print-wrapper {
            background: hsl(var(--muted) / 0.35);
            min-height: 100vh;
            padding: 32px 16px;
          }
          ${screenCSS}
        }
      `}</style>

      {/* Floating Chassis Controls */}
      <PrintMultipleControls
        printLayout={printLayout}
        autoLayout={autoLayout}
        onLayoutChange={handleLayoutChange}
        onPrint={triggerPrint}
        totalInvoicesCount={invoices.length + guestSlots.length}
        totalSlotsCount={allSlots.length}
        totalSheetsCount={sheets.length}
      />

      {/* Printed Sheets */}
      {sheets.map((slots, sheetIdx) => (
        <div key={sheetIdx} className="a4-sheet">
          {slots.map((slot) => (
            <div key={slot.key} className="a4-cell">
              <InvoiceContent
                invoice={slot.invoiceData}
                settings={settings}
                compact={isCompact}
                page={slot.page}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default PrintMultipleInvoices;
