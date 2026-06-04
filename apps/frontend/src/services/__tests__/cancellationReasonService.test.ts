import { normalizeCancellationReasonOptions } from "../cancellationReasonUtils";

describe("normalizeCancellationReasonOptions", () => {
  it("trims, deduplicates, and ignores empty reasons", () => {
    expect(
      normalizeCancellationReasonOptions([
        " العميل طلب الإلغاء ",
        "",
        "نفاد المخزون",
        "العميل طلب الإلغاء",
        "   ",
      ]),
    ).toEqual(["العميل طلب الإلغاء", "نفاد المخزون"]);
  });

  it("supports newline-separated textarea input", () => {
    expect(
      normalizeCancellationReasonOptions(
        "الرقم غير صحيح\nنفاد المخزون\nالرقم غير صحيح",
      ),
    ).toEqual(["الرقم غير صحيح", "نفاد المخزون"]);
  });
});
