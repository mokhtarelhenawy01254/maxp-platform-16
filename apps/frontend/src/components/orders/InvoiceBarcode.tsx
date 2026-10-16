import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const stripNonAscii = (v: string): string =>
  v.replace(/[^\x20-\x7E]/g, "").trim() || "N/A";

interface InvoiceBarcodeProps {
  value: string;
  label: string;
  height?: number;
  width?: number;
  compact?: boolean;
}

const InvoiceBarcode: React.FC<InvoiceBarcodeProps> = ({
  value,
  label,
  height = 50,
  width = 2,
  compact = false,
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
    <div className="flex flex-col items-center justify-center gap-1 text-center select-none">
      <div
        className={
          compact
            ? "text-xs font-bold text-foreground print:text-black"
            : "text-sm font-extrabold tracking-tight text-foreground print:text-black"
        }
      >
        {label}
      </div>
      <div className="rounded-md border border-border/40 bg-white p-1 shadow-2xs print:border-0 print:p-0 print:shadow-none">
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
            ? "font-mono text-[10px] font-bold tracking-wider text-foreground tabular-nums print:text-black"
            : "font-mono text-xs font-bold tracking-wider text-foreground tabular-nums print:text-black"
        }
      >
        {safeValue}
      </span>
    </div>
  );
};

export default InvoiceBarcode;
