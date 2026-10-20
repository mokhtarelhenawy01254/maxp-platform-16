import { describe, expect, it } from "vitest";
import { escapeCsvCell, generateCsvString } from "../procurementCsvExport";

describe("procurementCsvExport", () => {
  describe("escapeCsvCell", () => {
    it("returns empty string for null and undefined", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("leaves standard numbers and simple text unchanged", () => {
      expect(escapeCsvCell(1500.5)).toBe("1500.5");
      expect(escapeCsvCell(0)).toBe("0");
      expect(escapeCsvCell("مورد السلام")).toBe("مورد السلام");
      expect(escapeCsvCell("INV-2026-001")).toBe("INV-2026-001");
    });

    it("wraps cells containing commas in double quotes", () => {
      expect(escapeCsvCell("شركة الأمل, للتجارة")).toBe('"شركة الأمل, للتجارة"');
      expect(escapeCsvCell("Cairo, Egypt")).toBe('"Cairo, Egypt"');
    });

    it("escapes quotes by doubling them per RFC 4180", () => {
      expect(escapeCsvCell('بند "ممتاز" للتوريد')).toBe('"بند ""ممتاز"" للتوريد"');
    });

    it("handles cells containing line breaks", () => {
      expect(escapeCsvCell("السطر الأول\nالسطر الثاني")).toBe('"السطر الأول\nالسطر الثاني"');
    });
  });

  describe("generateCsvString", () => {
    it("starts with UTF-8 BOM \\uFEFF for seamless Arabic Excel compatibility", () => {
      const csv = generateCsvString(["اسم المورد", "الرصيد"], [["مورد 1", 500]]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it("correctly generates multi-row CSV with headers and rows", () => {
      const headers = ["رقم الفاتورة", "المورد", "المبلغ", "الحالة"];
      const rows = [
        ["INV-101", "شركة الدلتا", 12500, "مدفوعة"],
        ["INV-102", 'مؤسسة "النور", للتوريد', 8300.5, "معلقة"],
      ];

      const csv = generateCsvString(headers, rows);
      const lines = csv.replace(/^\uFEFF/, "").split("\r\n");

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("رقم الفاتورة,المورد,المبلغ,الحالة");
      expect(lines[1]).toBe("INV-101,شركة الدلتا,12500,مدفوعة");
      expect(lines[2]).toBe('INV-102,"مؤسسة ""النور"", للتوريد",8300.5,معلقة');
    });
  });
});
