import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const stripNonAscii = (v: string): string =>
  (v || "").replace(/[^\x20-\x7E]/g, "").trim() || "N/A";

interface InvoiceBarcodeProps {
  value: string;
  label: string;
  height?: number;
  width?: number;
  compact?: boolean;
  className?: string;
}

const InvoiceBarcode: React.FC<InvoiceBarcodeProps> = ({
  value,
  label,
  height = 46,
  width = 2,
  compact = false,
  className = "",
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const safeValue = stripNonAscii(value);

  useEffect(() => {
    if (svgRef.current && safeValue) {
      try {
        JsBarcode(svgRef.current, safeValue, {
          format: "CODE128",
          width,
          height,
          displayValue: false,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 0,
        });
      } catch {
        console.warn("Failed to generate barcode for:", safeValue);
      }
    }
  }, [safeValue, height, width]);

  return (
    <div
      data-testid="invoice-barcode-container"
      className={`flex flex-col items-center justify-center gap-1 text-center select-none print:p-0 ${className}`}
    >
      <div
        className={
          compact
            // the barcode block sits on a forced white surface in both themes,
            // so the caption/code must stay dark — text-foreground goes white in dark mode
            ? "text-xs font-bold text-slate-900 print:text-black"
            : "text-xs font-bold tracking-tight text-slate-900 print:text-black"
        }
      >
        {label}
      </div>
      <div
        data-testid="barcode-container"
        className="rounded-md border border-border/60 bg-white p-1 shadow-none print:border-0 print:bg-transparent print:p-0"
      >
        <svg
          ref={svgRef}
          className="mx-auto block max-w-full"
          style={{ height: `${height}px` }}
        />
      </div>
      {value !== safeValue && (
        <span className="font-mono text-[8px] text-destructive tabular-nums print:text-black">
          {value}
        </span>
      )}
      <span
        className={
          compact
            ? "font-mono text-[11px] font-bold tracking-wider text-slate-900 tabular-nums print:text-black"
            : "font-mono text-xs font-bold tracking-wider text-slate-900 tabular-nums print:text-black"
        }
      >
        {safeValue}
      </span>
    </div>
  );
};

export default InvoiceBarcode;
