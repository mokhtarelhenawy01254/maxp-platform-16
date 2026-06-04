import { getSafeFaqAnswerHtml } from "../faqHtml";

describe("getSafeFaqAnswerHtml", () => {
  test("removes scripts and event handlers while preserving line breaks", () => {
    const html = getSafeFaqAnswerHtml(
      '<p>Hello</p>\n<img src="x" onerror="alert(1)" /><script>alert(1)</script>',
    );

    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("<br>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onerror");
  });
});
