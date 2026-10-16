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
    <div className="flex flex-col items-center justify-center gap-1.5 text-center select-none rounded-xl border border-border/70 bg-card p-2.5 shadow-none print:border-0 print:p-0 print:shadow-none">
      <div className="rounded-lg border border-border/50 bg-white p-1.5 shadow-2xs print:border-0 print:p-0 print:shadow-none">
        <QRCodeSVG
          value={value}
          size={size}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          includeMargin={false}
          className="block"
        />
      </div>
      {label && (
        <span
          className={
            compact
              ? "text-[10px] font-semibold text-foreground print:text-black"
              : "text-xs font-semibold tracking-tight text-foreground print:text-black"
          }
        >
          {label}
        </span>
      )}
      <span
        style={{ maxWidth: `${Math.max(size + 24, 72)}px` }}
        className={
          compact
            ? "truncate font-mono text-[9px] text-muted-foreground tabular-nums print:text-black"
            : "truncate font-mono text-[10px] text-muted-foreground tabular-nums print:text-black"
        }
        title={value}
      >
        {value}
      </span>
    </div>
  );
};

export default InvoiceQR;
