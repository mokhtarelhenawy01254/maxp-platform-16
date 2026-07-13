import React from "react";
import { render, screen } from "@testing-library/react";
import MessageBubble from "./MessageBubble";

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
});
