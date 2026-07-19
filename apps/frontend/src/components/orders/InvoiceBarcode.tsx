import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

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

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: false,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 0,
        });
      } catch {
        console.warn("Failed to generate barcode for:", value);
      }
    }
  }, [value, height, width]);

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ textAlign: "center", lineHeight: 1 }}>
      <svg ref={svgRef} style={{ maxWidth: "100%", height: `${height}px` }} />
      <span style={{ fontSize: compact ? "8px" : "10px", fontWeight: "bold", color: "#374151" }}>
        {label}
      </span>
      <span style={{ fontSize: compact ? "8px" : "9px", color: "#6B7280", fontFamily: "monospace" }}>
        {value}
      </span>
    </div>
  );
};

export default InvoiceBarcode;
