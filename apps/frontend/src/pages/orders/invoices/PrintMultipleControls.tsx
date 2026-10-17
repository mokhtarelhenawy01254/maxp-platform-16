import React from "react";
import { PrinterIcon } from "@heroicons/react/24/outline";
import { PrintLayout } from "./printLayoutConfig";

interface PrintMultipleControlsProps {
  printLayout: PrintLayout;
  autoLayout: boolean;
  onLayoutChange: (layout: PrintLayout) => void;
  onPrint: () => void;
  totalInvoicesCount: number;
  totalSlotsCount: number;
  totalSheetsCount: number;
}

export const PrintMultipleControls: React.FC<PrintMultipleControlsProps> = ({
  printLayout,
  autoLayout,
  onLayoutChange,
  onPrint,
  totalInvoicesCount,
  totalSlotsCount,
  totalSheetsCount,
}) => {
  return (
    <div
      className="no-print fixed top-4 right-4 z-50 flex items-center gap-3 bg-card/95 backdrop-blur border border-border/70 p-3 rounded-2xl shadow-lg text-foreground animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
          <span>تنسيق الطباعة:</span>
          {autoLayout && (
            <span className="text-primary text-[10px] font-normal">(تلقائي)</span>
          )}
        </label>
        <select
          value={printLayout}
          onChange={(e) => onLayoutChange(e.target.value as PrintLayout)}
          className="border border-border/70 rounded-lg px-2.5 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary font-medium cursor-pointer"
        >
          <option value="grid">4 فواتير في A4 (توفير ورق)</option>
          <option value="2up">2 فواتير في A4 (أوسع)</option>
          <option value="single">فاتورة كاملة (A5 / حراري)</option>
        </select>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {totalSlotsCount} فاتورة · {totalSheetsCount} ورقة
        </span>
      </div>

      <button
        type="button"
        onClick={onPrint}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold shadow-xs mt-auto h-[38px] cursor-pointer"
      >
        <PrinterIcon className="w-4 h-4" />
        <span>طباعة ({totalInvoicesCount})</span>
      </button>
    </div>
  );
};
