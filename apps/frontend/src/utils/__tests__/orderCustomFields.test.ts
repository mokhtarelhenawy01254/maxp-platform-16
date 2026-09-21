import { describe, it, expect } from "vitest";
import { extractOrderCustomFields } from "../orderCustomFields";

describe("extractOrderCustomFields", () => {
  it("returns empty array when source is null or empty", () => {
    expect(extractOrderCustomFields(null)).toEqual([]);
    expect(extractOrderCustomFields({})).toEqual([]);
  });

  it("extracts custom attributes from metadata array", () => {
    const source = {
      metadata: {
        customAttributes: [
          { label: "نوع وموديل وسنة صنع السيارة", value: "هيونداي توسان 2022" },
        ],
      },
    };
    const result = extractOrderCustomFields(source);
    expect(result).toEqual([
      { label: "نوع وموديل وسنة صنع السيارة", value: "هيونداي توسان 2022" },
    ]);
  });

  it("extracts custom fields from parsed JSON string metadata", () => {
    const source = {
      metadata: JSON.stringify({
        carModel: "كيا سيراتو 2018",
      }),
    };
    const result = extractOrderCustomFields(source);
    expect(result).toEqual([
      { label: "نوع وموديل وسنة صنع السيارة", value: "كيا سيراتو 2018" },
    ]);
  });

  it("extracts custom fields from order.notes formatted as 'تفاصيل الطلب: ...'", () => {
    const source = {
      order: {
        notes: "تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: نيسان صني 2020",
      },
    };
    const result = extractOrderCustomFields(source);
    expect(result).toEqual([
      { label: "نوع وموديل وسنة صنع السيارة", value: "نيسان صني 2020" },
    ]);
  });

  it("extracts car details from arbitrary note lines containing keywords", () => {
    const source = {
      notes: "نوع وموديل السيارة: تويوتا كورولا 2023\nيرجى التواصل قبل التوصيل",
    };
    const result = extractOrderCustomFields(source);
    expect(result).toEqual([
      { label: "نوع وموديل السيارة", value: "تويوتا كورولا 2023" },
    ]);
  });
});
