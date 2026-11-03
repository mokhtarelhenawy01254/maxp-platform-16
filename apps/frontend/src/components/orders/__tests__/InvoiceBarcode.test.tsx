// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import InvoiceBarcode from "../InvoiceBarcode";
import JsBarcode from "jsbarcode";

vi.mock("jsbarcode", () => ({ default: vi.fn() }));

const mockJsBarcode = JsBarcode as unknown as ReturnType<typeof vi.fn>;

afterEach(() => cleanup());

describe("InvoiceBarcode Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Container & Theme-Aware Styling", () => {
    it("renders barcode container with theme-aware border, white background, and rounded corners", () => {
      render(<InvoiceBarcode value="ORD-123456" label="كود الطلب" />);

      const container = screen.getByTestId("barcode-container");
      expect(container).toBeInTheDocument();
      expect(container.className).toContain("bg-white");
      expect(container.className).toContain("rounded-md");
      expect(container.className).toContain("border-border/60");
      expect(container.className).not.toContain("border-black");
      expect(container.className).toContain("shadow-none");
      expect(container.className).not.toContain("shadow-sm");
      expect(container.className).not.toContain("shadow-md");
      expect(container.className).not.toContain("shadow-lg");
      expect(container.className).not.toContain("ring-black");
      expect(container.className).toContain("print:border-0");
      expect(container.className).toContain("print:bg-transparent");
      expect(container.className).toContain("print:p-0");
    });

    it("keeps the caption and code dark on the forced white surface (readable in dark mode too)", () => {
      render(<InvoiceBarcode value="TRK-987654" label="كود الشحن" />);

      const labelEl = screen.getByText("كود الشحن");
      expect(labelEl.className).toContain("text-slate-900");
      expect(labelEl.className).toContain("print:text-black");
      expect(labelEl.className).not.toContain("text-foreground");

      const valueEl = screen.getByText("TRK-987654");
      expect(valueEl.className).toContain("text-slate-900");
      expect(valueEl.className).toContain("print:text-black");
      expect(valueEl.className).not.toContain("text-foreground");
    });

    it("supports compact mode while maintaining theme and print classes", () => {
      render(<InvoiceBarcode value="ORD-COMPACT-1" label="كود الطلب" compact={true} />);

      const labelEl = screen.getByText("كود الطلب");
      expect(labelEl.className).toContain("text-xs");
      expect(labelEl.className).toContain("font-bold");
      expect(labelEl.className).toContain("text-slate-900");
      expect(labelEl.className).toContain("print:text-black");

      const valueEl = screen.getByText("ORD-COMPACT-1");
      expect(valueEl.className).toContain("font-mono");
      expect(valueEl.className).toContain("text-slate-900");
      expect(valueEl.className).toContain("print:text-black");
    });
  });

  describe("JsBarcode Generation & Scanner Standards", () => {
    it("calls JsBarcode with black lines on white background (#000000 on #ffffff)", () => {
      render(<InvoiceBarcode value="ORD-249175-783" label="كود الطلب" height={40} width={1.5} />);

      expect(mockJsBarcode).toHaveBeenCalledWith(
        expect.any(SVGSVGElement),
        "ORD-249175-783",
        expect.objectContaining({
          format: "CODE128",
          background: "#ffffff",
          lineColor: "#000000",
          height: 40,
          width: 1.5,
          displayValue: false,
          margin: 0,
        })
      );
    });

    it("catches and warns gracefully if JsBarcode throws an error", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockJsBarcode.mockImplementationOnce(() => {
        throw new Error("Invalid barcode payload");
      });

      expect(() => {
        render(<InvoiceBarcode value="INVALID-CODE" label="كود الشحن" />);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to generate barcode for:", "INVALID-CODE");
      consoleWarnSpy.mockRestore();
    });
  });

  describe("Fallback Behavior", () => {
    it("falls back to N/A when value is an empty string", () => {
      render(<InvoiceBarcode value="" label="كود الشحن" />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
      expect(mockJsBarcode).toHaveBeenCalledWith(expect.any(SVGSVGElement), "N/A", expect.anything());
    });

    it("sanitizes non-ASCII characters and preserves raw value in warning badge", () => {
      render(<InvoiceBarcode value="طلب-249175" label="كود الطلب" />);

      expect(screen.getByText("-249175")).toBeInTheDocument();
      const rawBadge = screen.getByText("طلب-249175");
      expect(rawBadge).toBeInTheDocument();
      expect(rawBadge.className).toContain("print:text-black");
    });

    it("falls back to N/A when value consists entirely of non-ASCII characters", () => {
      render(<InvoiceBarcode value="طلب" label="كود الطلب" />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
      expect(screen.getByText("طلب")).toBeInTheDocument();
    });
  });
});
