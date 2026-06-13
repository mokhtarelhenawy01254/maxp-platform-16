import {
  formatContactPhoneNumber,
  getBestContactDisplayName,
  getContactInitials,
  getContactPhoneHref,
  getContactPhoneNumber,
} from "../whatsappContactDisplay";

const baseContact = {
  jid: "201270388115@s.whatsapp.net",
  phoneNumber: "201270388115",
  name: null,
  pushName: null,
  customer: null,
};

describe("whatsappContactDisplay", () => {
  it("normalizes decorative WhatsApp names before display", () => {
    expect(
      getBestContactDisplayName({
        ...baseContact,
        pushName: "𝑆ℎ𝑟𝑜𝑢𝑘🕊️🤍",
        customer: { firstName: "WhatsApp User", lastName: "", status: "LEAD" },
      }),
    ).toBe("Shrouk🕊️🤍");
  });

  it("falls back to the JID local part when the phone number is missing", () => {
    expect(
      getContactPhoneNumber({
        ...baseContact,
        phoneNumber: "",
        jid: "201270388115:12@s.whatsapp.net",
      }),
    ).toBe("201270388115");
  });

  it("formats Egyptian WhatsApp numbers as readable left-to-right labels", () => {
    expect(formatContactPhoneNumber("201270388115")).toBe("+20 127 038 8115");
    expect(getContactPhoneHref("201270388115")).toBe("tel:+201270388115");
  });

  it("uses letters, not emoji, for avatar initials", () => {
    expect(getContactInitials("💜 Shrouk")).toBe("S");
  });
});
