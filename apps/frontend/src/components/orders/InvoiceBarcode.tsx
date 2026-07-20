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
      <div style={{ fontSize: compact ? "12px" : "15px", fontWeight: 800, textAlign: "center", marginBottom: "2px", color: "#000" }}>
        {label}
      </div>
      <svg ref={svgRef} style={{ maxWidth: "100%", height: `${height}px` }} />
      <span style={{ fontSize: compact ? "9px" : "10px", color: "#000", fontFamily: "monospace", marginTop: "2px", fontWeight: 900 }}>
        {value}
      </span>
    </div>
  );
};

export default InvoiceBarcode;
