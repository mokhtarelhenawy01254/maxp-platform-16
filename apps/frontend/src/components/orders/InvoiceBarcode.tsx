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
    <div className="flex flex-col items-center gap-0.5" style={{ textAlign: "center", lineHeight: 1 }}>
      <div style={{ fontSize: compact ? "12px" : "15px", fontWeight: 800, textAlign: "center", marginBottom: "2px", color: "#000" }}>
        {label}
      </div>
      <svg ref={svgRef} style={{ maxWidth: "100%", height: `${height}px` }} />
      {value !== safeValue && (
        <span style={{ fontSize: "7px", color: "#ef4444", fontFamily: "monospace", marginTop: "1px" }}>
          {value}
        </span>
      )}
      <span style={{ fontSize: compact ? "9px" : "10px", color: "#000", fontFamily: "monospace", marginTop: value !== safeValue ? "1px" : "2px", fontWeight: 900 }}>
        {safeValue}
      </span>
    </div>
  );
};

export default InvoiceBarcode;
