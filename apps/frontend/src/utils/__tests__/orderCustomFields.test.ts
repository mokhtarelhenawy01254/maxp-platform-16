import { describe, it, expect } from "vitest";
import {
  extractOrderCustomFields,
  cleanNotesWithoutCustomFields,
  resolveCustomFieldsForDisplay,
} from "../orderCustomFields";

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

describe("cleanNotesWithoutCustomFields", () => {
  it("returns empty string when notes is null or empty", () => {
    expect(cleanNotesWithoutCustomFields(null)).toBe("");
    expect(cleanNotesWithoutCustomFields("")).toBe("");
  });

  it("strips out 'تفاصيل الطلب: ...' lines and returns empty string if no other notes exist", () => {
    const notes = "تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022";
    expect(cleanNotesWithoutCustomFields(notes)).toBe("");
  });

  it("strips out car specification lines while preserving actual customer delivery notes", () => {
    const notes = "تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022\nيرجى الاتصال قبل الوصول بنصف ساعة";
    expect(cleanNotesWithoutCustomFields(notes)).toBe("يرجى الاتصال قبل الوصول بنصف ساعة");
  });

  it("strips custom field values matched against customFields list", () => {
    const notes = "هيونداي توسان 2022\nملاحظة هامة: التسليم بعد الساعة 5 مساء";
    const customFields = [{ label: "نوع وموديل وسنة صنع السيارة", value: "هيونداي توسان 2022" }];
    expect(cleanNotesWithoutCustomFields(notes, customFields)).toBe("ملاحظة هامة: التسليم بعد الساعة 5 مساء");
  });

  it("handles bulk invoice data shapes with notes and metadata forwarded correctly", () => {
    const bulkInvoiceData = {
      id: "inv-bulk-1",
      invoiceNumber: "INV-2026-001",
      notes: null,
      metadata: null,
      order: {
        orderNumber: "ORD-991",
        notes: "تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022",
        metadata: {
          customAttributes: [
            { label: "نوع وموديل وسنة صنع السيارة", value: "هيونداي توسان 2022" },
          ],
        },
      },
    };
    const fields = extractOrderCustomFields(bulkInvoiceData);
    expect(fields).toEqual([
      { label: "نوع وموديل وسنة صنع السيارة", value: "هيونداي توسان 2022" },
    ]);
    const cleaned = cleanNotesWithoutCustomFields(bulkInvoiceData.order.notes, fields);
    expect(cleaned).toBe("");
  });
});

describe("resolveCustomFieldsForDisplay", () => {
  const sampleOrder = {
    orderNumber: "ORD-505",
    notes: "تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022\nرقم هاتف بديل 01005053064",
    metadata: {
      carModel: "هيونداي توسان 2022",
    },
  };

  it("when showCustomFields is false (store without custom fields), returns empty customFields and preserves raw notes intact", () => {
    const result = resolveCustomFieldsForDisplay(sampleOrder, {
      showCustomFields: false,
    });

    expect(result.isEnabled).toBe(false);
    expect(result.customFields).toEqual([]);
    expect(result.displayNotes).toContain("رقم هاتف بديل 01005053064");
    expect(result.displayNotes).toBe(sampleOrder.notes);
  });

  it("when showCustomFields is true, extracts custom fields and cleans notes while preserving customer remarks", () => {
    const result = resolveCustomFieldsForDisplay(sampleOrder, {
      showCustomFields: true,
    });

    expect(result.isEnabled).toBe(true);
    expect(result.customFields.length).toBeGreaterThan(0);
    expect(result.customFields[0].value).toBe("هيونداي توسان 2022");
    expect(result.displayNotes).toBe("رقم هاتف بديل 01005053064");
    expect(result.displayNotes).not.toContain("هيونداي");
  });

  it("uses custom configured label when specified in options", () => {
    const orderWithCustomNotes = {
      notes: "تفاصيل الطلب: مقاس الخاتم: 18\nيرجى التوصيل للمنزل",
    };
    const result = resolveCustomFieldsForDisplay(orderWithCustomNotes, {
      showCustomFields: true,
      defaultLabel: "مقاس الخاتم",
    });

    expect(result.isEnabled).toBe(true);
    expect(result.customFields).toEqual([
      { label: "مقاس الخاتم", value: "18" },
    ]);
    expect(result.displayNotes).toBe("يرجى التوصيل للمنزل");
  });

  it("automatically displays custom fields when present even if showCustomFields is undefined", () => {
    const orderWithCarSpecs = {
      orderNumber: "ORD-REDLINE-101",
      notes: "المواصفات والحقول المخصصة: هيونداي توسان 2022\nيرجى الاتصال قبل الوصول",
    };
    const result = resolveCustomFieldsForDisplay(orderWithCarSpecs);

    expect(result.isEnabled).toBe(true);
    expect(result.customFields).toEqual([
      { label: "المواصفات والحقول المخصصة", value: "هيونداي توسان 2022" },
    ]);
    expect(result.displayNotes).toBe("يرجى الاتصال قبل الوصول");
  });

  it("extracts and cleans 'المواصفات: ...' and 'مواصفات خاصة: ...' prefixes properly", () => {
    const orderWithSpecs = {
      notes: "المواصفات: كيا سبورتاج 2024\nملاحظة: شحن سريع",
    };
    const result = resolveCustomFieldsForDisplay(orderWithSpecs);

    expect(result.isEnabled).toBe(true);
    expect(result.customFields).toEqual([
      { label: "المواصفات", value: "كيا سبورتاج 2024" },
    ]);
    expect(result.displayNotes).toBe("ملاحظة: شحن سريع");
  });

  it("handles combined order notes and invoice notes properly, displaying custom fields and retaining invoice notes", () => {
    const combinedNotes = "المواصفات والحقول المخصصة: تويوتا كورولا 2020\nشكراً لتعاملكم معنا. يرجى الدفع عند الاستلام.";
    const invoiceData = {
      notes: combinedNotes,
      order: {
        orderNumber: "ORD-REDLINE-777",
        notes: "المواصفات والحقول المخصصة: تويوتا كورولا 2020",
      },
    };
    const result = resolveCustomFieldsForDisplay(invoiceData);

    expect(result.isEnabled).toBe(true);
    expect(result.customFields).toEqual([
      { label: "المواصفات والحقول المخصصة", value: "تويوتا كورولا 2020" },
    ]);
    expect(result.displayNotes).toBe("شكراً لتعاملكم معنا. يرجى الدفع عند الاستلام.");
  });

  it("extracts custom fields from items attributes and carModel correctly", () => {
    const invoiceWithItemAttrs = {
      order: {
        orderItems: [
          {
            productName: "فرش سيارة جلد طبيعي",
            quantity: 1,
            price: 1500,
            carModel: "هيونداي النترا CN7 2023",
            customFields: [
              { label: "سنة الموديل", value: "2023" },
            ],
          },
        ],
      },
    };
    const result = resolveCustomFieldsForDisplay(invoiceWithItemAttrs);

    expect(result.isEnabled).toBe(true);
    expect(result.customFields).toEqual(
      expect.arrayContaining([
        { label: "سنة الموديل", value: "2023" },
        { label: "نوع وموديل وسنة صنع السيارة", value: "هيونداي النترا CN7 2023" },
      ])
    );
  });

  it("filters out 'Bulk status update' and does not render it as customer notes", () => {
    const bulkUpdatedInvoice = {
      notes: "Bulk status update",
      order: {
        notes: "Bulk status update",
        metadata: {
          customerNotes: "نوع وموديل وسنة صنع السيارة: بيجوه٥٠٥ ١٩٨٨",
        },
      },
    };
    const result = resolveCustomFieldsForDisplay(bulkUpdatedInvoice);

    expect(result.isEnabled).toBe(true);
    expect(result.customFields).toEqual([
      { label: "نوع وموديل وسنة صنع السيارة", value: "بيجوه٥٠٥ ١٩٨٨" },
    ]);
    expect(result.displayNotes).toBe("");
  });

  it("extracts car specs from item.metadata.attributeValues when order.notes was overwritten by bulk update", () => {
    const bulkInvoiceWithItemAttrs = {
      notes: "Bulk status update",
      order: {
        notes: "Bulk status update",
        orderItems: [
          {
            productName: "طقم كفرات مفاتيح",
            metadata: JSON.stringify({
              attributeValues: {
                car_model: "سوزوكي اسبريسو 2022",
              },
            }),
          },
        ],
      },
    };
    const result = resolveCustomFieldsForDisplay(bulkInvoiceWithItemAttrs);

    expect(result.isEnabled).toBe(true);
    expect(result.customFields).toEqual([
      { label: "نوع وموديل وسنة صنع السيارة", value: "سوزوكي اسبريسو 2022" },
    ]);
    expect(result.displayNotes).toBe("");
  });
});



