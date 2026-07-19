import { describe, expect, it } from "vitest";

import { looksLikeMojibake, repairMojibakeText } from "../textEncoding";

describe("textEncoding", () => {
  it("repairs doubly-encoded Arabic mojibake", () => {
    const garbled =
      "ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ÃƒËœÃ‚Â©";

    expect(repairMojibakeText(garbled)).toBe(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    );
  });

  it("leaves normal readable text unchanged", () => {
    expect(repairMojibakeText("فشل في تسجيل الدخول")).toBe(
      "فشل في تسجيل الدخول",
    );
    expect(repairMojibakeText("Normal English text")).toBe(
      "Normal English text",
    );
  });

  it("detects likely mojibake patterns", () => {
    expect(looksLikeMojibake("ÃƒËœÃ‚Â§")).toBe(true);
    expect(looksLikeMojibake("تم تسجيل الدخول بنجاح")).toBe(false);
  });
});
