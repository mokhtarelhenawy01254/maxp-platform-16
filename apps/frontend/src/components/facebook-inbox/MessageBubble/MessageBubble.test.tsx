// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import MessageBubble from "./MessageBubble";

afterEach(() => {
  cleanup();
});

vi.mock("@/services/apiClient", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock("@/utils/imageUrl", () => ({
  getInboxExternalImageUrl: (rawUrl: string) => rawUrl,
  getInboxMessageMediaUrl: (
    messageId: string,
    rawUrl: string | null | undefined,
  ) => rawUrl || `/api/proxy-image?messageId=${messageId}`,
  buildProxyImageUrl: (
    rawUrl: string | null | undefined,
    opts?: { messageId?: string; attachmentIndex?: number },
  ) => rawUrl || `/api/proxy-image?messageId=${opts?.messageId || ""}`,
}));

const baseMessage = {
  id: "message-1",
  content: "",
  senderId: "customer-1",
  senderName: "Customer",
  timestamp: new Date("2026-05-05T10:00:00.000Z"),
  type: "text" as const,
  isFromCustomer: true,
  status: "delivered" as const,
  conversationId: "conversation-1",
};

describe("MessageBubble", () => {
  it("renders image attachments even when Facebook saves the message as text", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: "[attachment] عندك اي ده 45",
          attachments: [
            {
              type: "image",
              payload: {
                url: "https://scontent.xx.fbcdn.net/customer-photo.jpg",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByAltText("صورة").getAttribute("src")).toBe(
      "https://scontent.xx.fbcdn.net/customer-photo.jpg",
    );
    expect(screen.getByText("عندك اي ده 45")).toBeDefined();
    expect(screen.queryByText(/\[attachment\]/i)).toBeNull();
  });

  it("cleans queue batch markers around Facebook attachment placeholders", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: "[1] [attachment] | [2] عندك اي ده 45",
          attachments: [
            {
              type: "image",
              payload: {
                url: "https://scontent.xx.fbcdn.net/batched-photo.jpg",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByAltText("صورة").getAttribute("src")).toBe(
      "https://scontent.xx.fbcdn.net/batched-photo.jpg",
    );
    expect(screen.getByText("عندك اي ده 45")).toBeDefined();
    expect(screen.queryByText(/\[1\]|\[2\]|\[attachment\]/i)).toBeNull();
  });

  it("extracts and renders embedded IMAGE_URL tokens without showing the token", () => {
    const content =
      "دي الصورة |IMAGE_URL|https://cdn.example.com/message-image.png";

    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content,
          fileUrl: content,
          type: "IMAGE",
        }}
      />,
    );

    expect(screen.getByAltText("صورة").getAttribute("src")).toBe(
      "https://cdn.example.com/message-image.png",
    );
    expect(screen.getByText("دي الصورة")).toBeDefined();
    expect(screen.queryByText(/\|IMAGE_URL\|/)).toBeNull();
  });

  it("renders quoted image thumbnail when replyTo contains imageUrl", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: "دي",
          metadata: {
            replyTo: {
              senderName: "Ahmed Fares",
              type: "image",
              content: "📷 صورة",
              imageUrl: "https://example.com/quoted-product.jpg",
            },
          },
        }}
      />,
    );

    expect(screen.getByText("Ahmed Fares")).toBeDefined();
    expect(screen.getByText("دي")).toBeDefined();
    expect(screen.getByAltText("صورة مقتبسة").getAttribute("src")).toBe(
      "https://example.com/quoted-product.jpg",
    );
  });

  it("resolves quoted image from parentMessage when replyTo has no imageUrl", () => {
    const parent = {
      ...baseMessage,
      id: "parent-msg-123",
      content: "/uploads/products/product-1.webp",
      type: "image" as const,
      isFromCustomer: false,
    };

    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: "دول ف عرض 300",
          metadata: {
            replyToResolvedMessageId: "parent-msg-123",
            replyTo: {
              senderName: "Ahmed Fares",
              type: "image",
              content: "📷 صورة",
            },
          },
        }}
        parentMessage={parent}
      />,
    );

    expect(screen.getByText("Ahmed Fares")).toBeDefined();
    expect(screen.getByText("دول ف عرض 300")).toBeDefined();
    expect(screen.getByAltText("صورة مقتبسة").getAttribute("src")).toBe(
      "/uploads/products/product-1.webp",
    );
  });

  it("opens action buttons bar and triggers reply, star, and forward callbacks", () => {
    const onReply = vi.fn();
    const onStar = vi.fn();
    const onForward = vi.fn();

    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: "رسالة تجريبية للتفاعل",
        }}
        onReply={onReply}
        onStar={onStar}
        onForward={onForward}
      />,
    );

    // Initial state: actions popup is not visible
    expect(screen.queryByTitle("رد")).toBeNull();
    expect(screen.queryByTitle("تمييز الرسالة")).toBeNull();
    expect(screen.queryByTitle("إعادة توجيه")).toBeNull();

    // Click the More actions button (three dots)
    const moreButton = screen.getByTitle("إجراءات الرسالة");
    fireEvent.click(moreButton);

    // Now actions buttons are rendered
    const replyBtn = screen.getByTitle("رد");
    const starBtn = screen.getByTitle("تمييز الرسالة");
    const forwardBtn = screen.getByTitle("إعادة توجيه");

    expect(replyBtn).toBeDefined();
    expect(starBtn).toBeDefined();
    expect(forwardBtn).toBeDefined();

    // Click Star button
    fireEvent.click(starBtn);
    expect(onStar).toHaveBeenCalledWith("message-1", false);

    // Click Reply button
    fireEvent.click(replyBtn);
    expect(onReply).toHaveBeenCalledWith(
      expect.objectContaining({ id: "message-1" }),
    );

    // Click More button again to show forward
    fireEvent.click(moreButton);
    const forwardBtnAgain = screen.getByTitle("إعادة توجيه");
    fireEvent.click(forwardBtnAgain);
    expect(onForward).toHaveBeenCalledWith(
      expect.objectContaining({ id: "message-1" }),
    );
  });

  it("opens reaction selector and triggers reaction callback when emoji is clicked", () => {
    const onReaction = vi.fn();

    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: "رسالة تفاعل",
        }}
        onReaction={onReaction}
      />,
    );

    // Click More actions button
    const moreButton = screen.getByTitle("إجراءات الرسالة");
    fireEvent.click(moreButton);

    // Smile button should be visible
    const smileBtn = screen.getByTitle("إضافة تفاعل");
    expect(smileBtn).toBeDefined();

    // Click smile button to open reaction selector
    fireEvent.click(smileBtn);

    // Reaction emojis should be visible
    const angryEmojiBtn = screen.getByTitle("😡");
    expect(angryEmojiBtn).toBeDefined();
    const thumbsUpBtn = screen.getByTitle("👍");
    expect(thumbsUpBtn).toBeDefined();

    // Click angry emoji reaction
    fireEvent.click(angryEmojiBtn);
    expect(onReaction).toHaveBeenCalledWith("message-1", "😡");
  });

  it("displays reaction pills when metadata contains reactions mapped by userId", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: "رسالة مع تفاعل",
          metadata: {
            reactions: {
              "user-1": "😂",
              "user-2": "😂",
              "user-3": "❤️",
            },
          },
        }}
        currentUserId="user-1"
      />,
    );

    // Count "2" for the laugh reaction
    expect(screen.getByText("2")).toBeDefined();
  });

  it("suppresses internal proxy-image URLs from rendering as text content under image", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          id: "msg-proxy-test",
          type: "IMAGE",
          content:
            "/api/v1/proxy-image?url=https%3A%2F%2Fscontent.xx.fbcdn.net%2Fphoto.jpg&messageId=msg-proxy-test",
          attachments: [
            {
              type: "image",
              payload: {
                url: "https://scontent.xx.fbcdn.net/photo.jpg",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByAltText("صورة")).toBeDefined();
    expect(screen.queryByText(/proxy-image/i)).toBeNull();
  });

  it("renders AI badge and correction badge when message is from AI", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          id: "msg-ai-1",
          isFromCustomer: false,
          senderType: "AI",
          isAIResponse: true,
          content: "أهلاً بك، كيف يمكنني مساعدتك اليوم؟",
          metadata: {
            source: "ai_reply",
            employeeName: "الذكاء الاصطناعي",
          },
        }}
      />,
    );

    expect(screen.getByText("المساعد الذكي (AI)")).toBeDefined();
    expect(screen.getByText("🤖 رد تلقائي من الوكيل")).toBeDefined();
    expect(screen.getByText("✏️ تصحيح الرد")).toBeDefined();
  });

  it("renders Meta badge and suppresses AI correction badge when message is from Facebook externally", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          id: "msg-meta-1",
          isFromCustomer: false,
          senderType: "META_EXTERNAL",
          isAIResponse: false,
          content: "تم الرد من تطبيق فيسبوك بيزنس سويت",
          metadata: {
            source: "page_reply",
            isFacebookReply: true,
          },
        }}
      />,
    );

    expect(screen.getByText("فيسبوك (Meta)")).toBeDefined();
    expect(screen.queryByText("المساعد الذكي (AI)")).toBeNull();
    expect(screen.queryByText("🤖 رد تلقائي من الوكيل")).toBeNull();
    expect(screen.queryByText("✏️ تصحيح الرد")).toBeNull();
  });

  it("renders Staff badge with employee name for dashboard manual replies", () => {
    render(
      <MessageBubble
        message={{
          ...baseMessage,
          id: "msg-staff-1",
          isFromCustomer: false,
          senderId: "user-100",
          senderType: "STAFF",
          senderName: "أحمد علي",
          content: "تم تأكيد طلبك مع مندوب الشحن",
          metadata: {
            source: "manual_reply",
            employeeName: "أحمد علي",
          },
        }}
      />,
    );

    expect(screen.getByText("أحمد علي")).toBeDefined();
    expect(screen.queryByText("المساعد الذكي (AI)")).toBeNull();
    expect(screen.queryByText("فيسبوك (Meta)")).toBeNull();
    expect(screen.queryByText("🤖 رد تلقائي من الوكيل")).toBeNull();
  });
});
