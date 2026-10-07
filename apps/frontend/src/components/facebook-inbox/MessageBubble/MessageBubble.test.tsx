import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageBubble from "./MessageBubble";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock("../../../utils/imageUrl", () => ({
  getInboxExternalImageUrl: (rawUrl: string) => rawUrl,
  getInboxMessageMediaUrl: (
    messageId: string,
    rawUrl: string | null | undefined,
  ) => rawUrl || `/api/proxy-image?messageId=${messageId}`,
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

    expect(screen.getByAltText("صورة")).toHaveAttribute(
      "src",
      "https://scontent.xx.fbcdn.net/customer-photo.jpg",
    );
    expect(screen.getByText("عندك اي ده 45")).toBeInTheDocument();
    expect(screen.queryByText(/\[attachment\]/i)).not.toBeInTheDocument();
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

    expect(screen.getByAltText("صورة")).toHaveAttribute(
      "src",
      "https://scontent.xx.fbcdn.net/batched-photo.jpg",
    );
    expect(screen.getByText("عندك اي ده 45")).toBeInTheDocument();
    expect(screen.queryByText(/\[1\]|\[2\]|\[attachment\]/i)).not.toBeInTheDocument();
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

    expect(screen.getByAltText("صورة")).toHaveAttribute(
      "src",
      "https://cdn.example.com/message-image.png",
    );
    expect(screen.getByText("دي الصورة")).toBeInTheDocument();
    expect(screen.queryByText(/\|IMAGE_URL\|/)).not.toBeInTheDocument();
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

    expect(screen.getByText("Ahmed Fares")).toBeInTheDocument();
    expect(screen.getByText("دي")).toBeInTheDocument();
    expect(screen.getByAltText("صورة مقتبسة")).toHaveAttribute(
      "src",
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

    expect(screen.getByText("Ahmed Fares")).toBeInTheDocument();
    expect(screen.getByText("دول ف عرض 300")).toBeInTheDocument();
    expect(screen.getByAltText("صورة مقتبسة")).toHaveAttribute(
      "src",
      "/uploads/products/product-1.webp",
    );
  });

  it("opens action buttons bar and triggers reply, star, and forward callbacks", () => {
    const onReply = jest.fn();
    const onStar = jest.fn();
    const onForward = jest.fn();

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
    expect(screen.queryByTitle("رد")).not.toBeInTheDocument();
    expect(screen.queryByTitle("تمييز الرسالة")).not.toBeInTheDocument();
    expect(screen.queryByTitle("إعادة توجيه")).not.toBeInTheDocument();

    // Click the More actions button (three dots)
    const moreButton = screen.getByTitle("إجراءات الرسالة");
    fireEvent.click(moreButton);

    // Now actions buttons are rendered
    const replyBtn = screen.getByTitle("رد");
    const starBtn = screen.getByTitle("تمييز الرسالة");
    const forwardBtn = screen.getByTitle("إعادة توجيه");

    expect(replyBtn).toBeInTheDocument();
    expect(starBtn).toBeInTheDocument();
    expect(forwardBtn).toBeInTheDocument();

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
    const onReaction = jest.fn();

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
    expect(smileBtn).toBeInTheDocument();

    // Click smile button to open reaction selector
    fireEvent.click(smileBtn);

    // Reaction emojis should be visible in portal
    const angryEmojiBtn = screen.getByTitle("😡");
    expect(angryEmojiBtn).toBeInTheDocument();
    const thumbsUpBtn = screen.getByTitle("👍");
    expect(thumbsUpBtn).toBeInTheDocument();

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
    expect(screen.getByText("2")).toBeInTheDocument();
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

    expect(screen.getByAltText("صورة")).toBeInTheDocument();
    expect(screen.queryByText(/proxy-image/i)).not.toBeInTheDocument();
  });
});

