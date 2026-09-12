import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MarketingMarkdownMessage } from "../MarketingMarkdownMessage";

describe("MarketingMarkdownMessage Component", () => {
  it("renders simple paragraphs and handles empty content gracefully", () => {
    const { container: emptyContainer } = render(
      <MarketingMarkdownMessage content="" />
    );
    expect(emptyContainer.textContent).toBe("");

    const { getByText } = render(
      <MarketingMarkdownMessage content="أهلاً بك في استوديو التسويق الذكي" />
    );
    expect(getByText("أهلاً بك في استوديو التسويق الذكي")).toBeDefined();
  });

  it("renders user messages cleanly with whitespace preservation", () => {
    const { getByText } = render(
      <MarketingMarkdownMessage
        content="عايزك تحلل لي حملات المتجر الحالية"
        isUser={true}
      />
    );
    const elem = getByText("عايزك تحلل لي حملات المتجر الحالية");
    expect(elem).toBeDefined();
    expect(elem.className).toContain("whitespace-pre-wrap");
  });

  it("renders headings properly", () => {
    const markdown = "# عنوان رئيسي أول\n## عنوان فرعي ثاني\n### عنوان دقيق ثالث";
    const { getByRole, getByText } = render(
      <MarketingMarkdownMessage content={markdown} />
    );

    expect(getByRole("heading", { level: 3 }).textContent).toContain("عنوان رئيسي أول");
    expect(getByRole("heading", { level: 4 }).textContent).toContain("عنوان فرعي ثاني");
    expect(getByText("عنوان دقيق ثالث")).toBeDefined();
  });

  it("renders inline bold and code snippets", () => {
    const markdown = "الحملة حققت **ROAS ممتاز** بتكلفة `350 ج.م`";
    const { getByText } = render(
      <MarketingMarkdownMessage content={markdown} />
    );

    const boldText = getByText("ROAS ممتاز");
    expect(boldText.tagName.toLowerCase()).toBe("strong");

    const codeText = getByText("350 ج.م");
    expect(codeText.tagName.toLowerCase()).toBe("code");
  });

  it("renders lists and blockquotes correctly", () => {
    const markdown = "- نقطة أولى\n- نقطة ثانية\n\n> نصيحة تسويقية هامة";
    const { getByText } = render(
      <MarketingMarkdownMessage content={markdown} />
    );

    expect(getByText("نقطة أولى")).toBeDefined();
    expect(getByText("نقطة ثانية")).toBeDefined();
    expect(getByText("نصيحة تسويقية هامة")).toBeDefined();
  });

  it("renders Markdown tables with headers, rows, and responsive scroll wrapper", () => {
    const tableMarkdown = `
| الحملة | الحالة | الصرف | المبيعات | ROAS | القرار |
| :--- | :--- | :--- | :--- | :--- | :--- |
| سوان إسكوتش - ترافيك | ACTIVE | 1200 ج.م | 15 | 3.4 | SCALE |
| كوتشي كاجوال أبيض | ACTIVE | 650 ج.م | 2 | 0.8 | KILL |
| هودي شتوي ميلتون | PAUSED | 400 ج.م | 4 | 1.8 | WATCH |
| إعلان تجريبي | ACTIVE | 0.00 ⚠️ | 0 | 0.0 | FIX_CREATIVE |
`;

    const { container, getByText } = render(
      <MarketingMarkdownMessage content={tableMarkdown} />
    );

    // Check table elements
    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    const headers = container.querySelectorAll("th");
    expect(headers.length).toBe(6);
    expect(headers[0].textContent).toContain("الحملة");
    expect(headers[5].textContent).toContain("القرار");

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4);

    // Check decision badges and chips
    expect(getByText("SCALE")).toBeDefined();
    expect(getByText("🚀")).toBeDefined();

    expect(getByText("KILL")).toBeDefined();
    expect(getByText("🛑")).toBeDefined();

    expect(getByText("WATCH")).toBeDefined();
    expect(getByText("👀")).toBeDefined();

    expect(getByText("FIX_CREATIVE")).toBeDefined();
    expect(getByText("🎨")).toBeDefined();

    // Check warning chip
    expect(getByText("0.00 ⚠️")).toBeDefined();
  });
});
