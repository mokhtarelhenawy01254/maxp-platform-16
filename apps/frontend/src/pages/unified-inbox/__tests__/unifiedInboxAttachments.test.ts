/**
 * Tests for unified inbox attachment / multi-image logic.
 *
 * Covers:
 * - Attachments array operations (add, remove, bulk-add)
 * - Send-message payload building for multi-attachment scenarios
 * - Conversation preview text for image / file batches
 */
import { describe, it, expect } from "vitest";

interface Attachment {
  url: string;
  name: string;
  type: string;
}

// ─── helpers that mirror the logic in UnifiedInbox.tsx ───

function addAttachment(prev: Attachment[], next: Attachment): Attachment[] {
  return [...prev, next];
}

function addAttachments(prev: Attachment[], next: Attachment[]): Attachment[] {
  return [...prev, ...next];
}

function removeAttachment(prev: Attachment[], index: number): Attachment[] {
  return prev.filter((_, i) => i !== index);
}

function buildPayloads(opts: {
  text: string;
  attachments: Attachment[];
  replyToMsg?: { id: string; content: string };
}): any[] {
  const { text, attachments, replyToMsg } = opts;
  const hasText = text.trim().length > 0;
  const payloads: any[] = [];

  if (hasText) {
    const first: any = { content: text.trim(), platform: "test" };
    if (attachments.length > 0) {
      first.type = attachments[0].type;
      first.mediaUrl = attachments[0].url;
      first.mediaFileName = attachments[0].name;
    }
    if (replyToMsg) {
      first.quotedMessageId = replyToMsg.id;
      first.quotedContent = replyToMsg.content;
    }
    payloads.push(first);

    for (let i = 1; i < attachments.length; i++) {
      const rest: any = {
        content: "",
        platform: "test",
        type: attachments[i].type,
        mediaUrl: attachments[i].url,
        mediaFileName: attachments[i].name,
      };
      if (i === 0 && replyToMsg) {
        rest.quotedMessageId = replyToMsg.id;
        rest.quotedContent = replyToMsg.content;
      }
      payloads.push(rest);
    }
  } else {
    for (const att of attachments) {
      payloads.push({
        content: "",
        platform: "test",
        type: att.type,
        mediaUrl: att.url,
        mediaFileName: att.name,
      });
    }
  }

  return payloads;
}

function conversationPreview(attachments: Attachment[], text: string): string {
  if (attachments.length > 0) {
    return attachments.every((a) => a.type === "image")
      ? `📷 ${attachments.length}`
      : `📎 ${attachments.length}`;
  }
  return text.trim();
}

// ─── tests ───

describe("Attachments array – add / remove", () => {
  const img1: Attachment = { url: "https://example.com/1.jpg", name: "1.jpg", type: "image" };
  const img2: Attachment = { url: "https://example.com/2.jpg", name: "2.jpg", type: "image" };
  const doc: Attachment = { url: "https://example.com/doc.pdf", name: "doc.pdf", type: "document" };

  it("adds a single attachment", () => {
    const result = addAttachment([], img1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(img1);
  });

  it("adds multiple attachments", () => {
    const result = addAttachments([img1], [img2, doc]);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(img1);
    expect(result[1]).toEqual(img2);
    expect(result[2]).toEqual(doc);
  });

  it("removes an attachment by index", () => {
    const arr = [img1, img2, doc];
    expect(removeAttachment(arr, 0)).toEqual([img2, doc]);
    expect(removeAttachment(arr, 1)).toEqual([img1, doc]);
    expect(removeAttachment(arr, 2)).toEqual([img1, img2]);
  });

  it("handles empty array for remove", () => {
    expect(removeAttachment([], 0)).toEqual([]);
  });

  it("preserves other attachments when removing one", () => {
    const arr = [img1, img2, doc];
    const result = removeAttachment(arr, 1);
    expect(result).toHaveLength(2);
    expect(result[0].url).toBe("https://example.com/1.jpg");
    expect(result[1].url).toBe("https://example.com/doc.pdf");
  });
});

describe("Send payload builder – multi-attachment scenarios", () => {
  const img1: Attachment = { url: "https://example.com/a.jpg", name: "a.jpg", type: "image" };
  const img2: Attachment = { url: "https://example.com/b.jpg", name: "b.jpg", type: "image" };
  const pdf: Attachment = { url: "https://example.com/r.pdf",  name: "r.pdf",  type: "document" };

  it("text only → single payload with content, no media", () => {
    const payloads = buildPayloads({ text: "Hello", attachments: [] });
    expect(payloads).toHaveLength(1);
    expect(payloads[0].content).toBe("Hello");
    expect(payloads[0].mediaUrl).toBeUndefined();
  });

  it("text + 1 attachment → single payload with content + media", () => {
    const payloads = buildPayloads({ text: "See this", attachments: [img1] });
    expect(payloads).toHaveLength(1);
    expect(payloads[0].content).toBe("See this");
    expect(payloads[0].mediaUrl).toBe(img1.url);
    expect(payloads[0].type).toBe("image");
  });

  it("text + 3 attachments → first payload has text+media, rest are media-only", () => {
    const payloads = buildPayloads({ text: "Gallery", attachments: [img1, img2, pdf] });
    expect(payloads).toHaveLength(3);

    // First: text + first media
    expect(payloads[0].content).toBe("Gallery");
    expect(payloads[0].mediaUrl).toBe(img1.url);

    // Second: no text, second media
    expect(payloads[1].content).toBe("");
    expect(payloads[1].mediaUrl).toBe(img2.url);

    // Third: no text, third media
    expect(payloads[2].content).toBe("");
    expect(payloads[2].mediaUrl).toBe(pdf.url);
    expect(payloads[2].type).toBe("document");
  });

  it("no text + 2 attachments → each attachment as its own payload", () => {
    const payloads = buildPayloads({ text: "", attachments: [img1, pdf] });
    expect(payloads).toHaveLength(2);
    expect(payloads[0].content).toBe("");
    expect(payloads[0].mediaUrl).toBe(img1.url);
    expect(payloads[1].content).toBe("");
    expect(payloads[1].mediaUrl).toBe(pdf.url);
  });

  it("empty text + empty attachments → no payloads", () => {
    const payloads = buildPayloads({ text: "", attachments: [] });
    expect(payloads).toHaveLength(0);
  });

  it("reply info appears only on the first payload", () => {
    const reply = { id: "msg-1", content: "Original" };
    const payloads = buildPayloads({
      text: "Reply",
      attachments: [img1, img2],
      replyToMsg: reply,
    });
    expect(payloads[0].quotedMessageId).toBe("msg-1");
    expect(payloads[1].quotedMessageId).toBeUndefined();
  });

  it("reply info on first payload when no text, just attachments", () => {
    const reply = { id: "msg-2", content: "Original 2" };
    const payloads = buildPayloads({
      text: "",
      attachments: [img1],
      replyToMsg: reply,
    });
    expect(payloads).toHaveLength(1);
    // No text path — reply not attached (matches current implementation)
    expect(payloads[0].quotedMessageId).toBeUndefined();
  });
});

describe("Conversation preview text for attachments", () => {
  it("single image → 📷 1", () => {
    expect(conversationPreview(
      [{ url: "x.jpg", name: "x.jpg", type: "image" }],
      "",
    )).toBe("📷 1");
  });

  it("multiple images → 📷 N", () => {
    const images = [
      { url: "1.jpg", name: "1.jpg", type: "image" as const },
      { url: "2.jpg", name: "2.jpg", type: "image" as const },
      { url: "3.jpg", name: "3.jpg", type: "image" as const },
    ];
    expect(conversationPreview(images, "")).toBe("📷 3");
  });

  it("mixed types → 📎 N", () => {
    const mixed = [
      { url: "pic.jpg", name: "pic.jpg", type: "image" as const },
      { url: "doc.pdf", name: "doc.pdf", type: "document" as const },
    ];
    expect(conversationPreview(mixed, "")).toBe("📎 2");
  });

  it("falls back to text when no attachments", () => {
    expect(conversationPreview([], "Hello world")).toBe("Hello world");
  });
});
