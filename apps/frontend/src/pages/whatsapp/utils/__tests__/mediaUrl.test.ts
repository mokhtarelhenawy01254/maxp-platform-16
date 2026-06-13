import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../config", () => ({
  config: {
    apiUrl: "http://127.0.0.1:3007/api/v1",
  },
}));

import { buildWhatsAppMediaUrl } from "../mediaUrl";

describe("buildWhatsAppMediaUrl", () => {
  it("keeps direct media URLs unchanged", () => {
    expect(buildWhatsAppMediaUrl("https://cdn.example.com/image.jpg", "msg-1")).toBe(
      "https://cdn.example.com/image.jpg",
    );
  });

  it("converts Meta Cloud media references to the proxy route", () => {
    expect(buildWhatsAppMediaUrl("meta-media:wamid.media-123", "msg-42")).toBe(
      "http://127.0.0.1:3007/api/v1/proxy-image?whatsAppMessageId=msg-42",
    );
  });

  it("resolves relative backend media paths against the API host", () => {
    expect(buildWhatsAppMediaUrl("/uploads/whatsapp/sample.webp", "msg-1")).toBe(
      "http://127.0.0.1:3007/uploads/whatsapp/sample.webp",
    );
  });
});
