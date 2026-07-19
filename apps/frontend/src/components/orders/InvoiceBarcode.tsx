import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface InvoiceBarcodeProps {
  value: string;
  label: string;
  height?: number;
  width?: number;
}

const InvoiceBarcode: React.FC<InvoiceBarcodeProps> = ({
  value,
  label,
  height = 50,
  width = 2,
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
    <div className="flex flex-col items-center gap-1" style={{ textAlign: "center" }}>
      <svg ref={svgRef} />
      <span className="text-xs font-bold" style={{ color: "#374151" }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: "#6B7280", fontFamily: "monospace" }}>
        {value}
      </span>
    </div>
  );
};

export default InvoiceBarcode;
