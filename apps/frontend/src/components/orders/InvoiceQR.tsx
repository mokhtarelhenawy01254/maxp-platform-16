import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface InvoiceQRProps {
  /** The value to encode in the QR code (order number, tracking number, etc.) */
  value: string;
  /** Optional label displayed below the QR */
  label?: string;
  /** Size in pixels (width & height) */
  size?: number;
  /** Compact mode reduces font size */
  compact?: boolean;
}

/**
 * Renders a compact QR code using qrcode.react (SVG-based, no external requests).
 * Used alongside linear barcodes so scanners/apps that prefer QR can use it.
 */
const InvoiceQR: React.FC<InvoiceQRProps> = ({
  value,
  label,
  size = 48,
  compact = false,
}) => {
  if (!value) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", lineHeight: 1 }}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
        includeMargin={false}
      />
      {label && (
        <span style={{ fontSize: compact ? "7px" : "9px", fontWeight: "bold", color: "#374151" }}>
          {label}
        </span>
      )}
      <span style={{ fontSize: compact ? "7px" : "8px", color: "#6B7280", fontFamily: "monospace", textAlign: "center", maxWidth: `${size}px`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
};

export default InvoiceQR;
