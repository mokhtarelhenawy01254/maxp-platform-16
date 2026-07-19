# Invoice Printing Optimizations & Dual Layout Feature

**Author:** Antigravity (Advanced Agentic Coding)  
**Date:** 2026-07-19  

## Overview
This documentation describes the print layout adjustments and optimizations implemented for invoice printing in the order preparation queue. 

## Key Improvements

### 1. High Quality Arabic Typography
- Integrated Google Fonts `Cairo` stack into the print media stylesheets.
- Replaced basic sans-serif defaults with `Cairo` for all printed invoices, improving readability of Arabic characters, names, and address diacritics.

### 2. Enhanced Font Sizes and Spacings in Compact Mode
- Enlarged font sizing for the compact 4-in-1 print layout (A6 cell width) to prevent blurring and eye strain:
  - Table item rows: `11px` (previously `10px`).
  - Table headers: `10px` (previously `9px`).
  - Customer Name: `13px` (previously `12px`).
  - Phone numbers: `11px` (previously `10px`).
  - Address details: `10px` (previously `9px`).
- Increased margins and cell padding to utilize the full available height and width of each grid cell.

### 3. Crisp, Scannable Barcode SVGs
- Removed browser-side CSS `transform: scale(0.33)` scaling.
- Configured `InvoiceBarcode.tsx` to accept a `compact` prop, rendering barcode lines natively at crisp widths (`width=1.1`, `height=22` in compact mode) directly inside the SVG, avoiding anti-aliasing blur.
- Enabled barcodes to print on both compact and standard size invoices.

### 4. Dual-Layout Selector (A4 Grid / A5 Thermal)
- Added print layout state toggling:
  - **Grid Layout (Paper Saver):** Prints 4 invoices per A4 sheet in a 2x2 layout.
  - **Single Layout (A5 / Thermal):** Prints each invoice on its own page (A5 size), avoiding printing a tiny A6-sized invoice in the corner of a sheet.
- **Smart Defaulting:**
  - If **1 invoice** is chosen for printing, it automatically defaults to **Single Layout**.
  - If **2+ invoices** are chosen, it defaults to **Grid Layout**.
- A drop-down switcher is added at the top-right (`.no-print` zone) to toggle formats.

---

## Wave 2 — Smart Layout Engine & QR Code (2026-07-19)

### 5. Smart Auto-Detect Print Layout

`PrintMultipleInvoices.tsx` now auto-detects the best layout based on slot count:

| Count | Layout | Effect |
|-------|--------|--------|
| 1 | `single` — A5 portrait | Full-page, thermal-printer friendly |
| **2** | **`2up` — A4 split into 2 rows** | **Eliminates 50% wasted blank space** |
| 3–4 | `grid` — 2×2 on A4 | 4 invoices per sheet |
| 5+ | `grid` paginated | Multiple A4 sheets, 4 per sheet |

- A `(تلقائي)` badge appears when auto-mode is active.
- Slot and sheet count displayed: `N فاتورة · M ورقة`.
- User can override at any time via the layout dropdown.

**Layout constants:**
```ts
type PrintLayout = "single" | "2up" | "grid";
const SLOTS_PER_SHEET: Record<PrintLayout, number> = { single: 1, "2up": 2, grid: 4 };
```

### 6. QR Code Alongside Linear Barcode (`InvoiceQR.tsx`)

New component wrapping `qrcode.react` (`QRCodeSVG`) — **pure SVG, no network request, works offline**.

- Compact mode: `36 px` · Full mode: `52 px`
- Error-correction level M (survives ~15% damage)
- Encodes the order number (same value as the linear barcode)
- Rendered in a second column beside the linear barcode column in the invoice header

**Benefit:** mobile cameras and 2D-capable handheld scanners can read QR faster than CODE128 at small print sizes.

```tsx
// InvoiceContent.tsx — header barcode block
<div style={{ display: "flex", flexDirection: "row", gap: compact ? "4px" : "8px" }}>
  {/* column 1 — linear barcodes */}
  <div>
    <InvoiceBarcode value={orderNumber} label="طلب" ... />
    <InvoiceBarcode value={trackingNumber} label="شحن" ... />
  </div>
  {/* column 2 — QR */}
  <InvoiceQR value={orderNumber} label="QR" size={compact ? 36 : 52} compact={compact} />
</div>
```
