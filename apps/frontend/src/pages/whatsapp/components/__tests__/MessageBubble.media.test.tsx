/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: any) => (typeof defaultVal === 'string' ? defaultVal : key),
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("../../../../config", () => ({
  config: {
    apiUrl: "http://127.0.0.1:3007/api/v1",
  },
}));

import MessageBubble from "../MessageBubble";

describe("MessageBubble media rendering", () => {
  afterEach(() => {
    cleanup();
  });
  it("routes Meta Cloud image messages through the proxy endpoint", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-42",
          messageId: "wamid.fixture-42",
          remoteJid: "201111111111@s.whatsapp.net",
          fromMe: false,
          messageType: "IMAGE",
          content: "Fixture image for Meta media verification",
          mediaUrl: "meta-media:fixture-media-1",
          mediaType: "image",
          mediaFileName: "fixture-image.svg",
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
        }}
        previousMessage={undefined}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
      />,
    );

    const mediaImage = screen.getByAltText("Message media");
    expect(mediaImage).toHaveAttribute(
      "src",
      "http://127.0.0.1:3007/api/v1/proxy-image?whatsAppMessageId=msg-42",
    );
    expect(
      screen.getByText("Fixture image for Meta media verification"),
    ).toBeInTheDocument();
  });

  it("renders sticker messages inline on the same page without unsupported media error", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-sticker-99",
          messageId: "wamid.fixture-sticker-99",
          remoteJid: "201111111111@s.whatsapp.net",
          fromMe: false,
          messageType: "STICKER",
          content: null,
          mediaUrl: "meta-media:fixture-sticker-99",
          mediaType: "sticker",
          mediaFileName: null,
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
        }}
        previousMessage={undefined}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
      />,
    );

    expect(screen.queryByText(/unsupported media type/i)).not.toBeInTheDocument();
    const sticker = screen.getByAltText("Sticker");
    expect(sticker).toBeInTheDocument();
    expect(sticker).toHaveAttribute(
      "src",
      "http://127.0.0.1:3007/api/v1/proxy-image?whatsAppMessageId=msg-sticker-99",
    );
  });

  it("opens inline preview modal on the same page when clicking a sticker", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-sticker-click",
          messageId: "wamid.fixture-sticker-click",
          remoteJid: "201111111111@s.whatsapp.net",
          fromMe: false,
          messageType: "STICKER",
          content: "Funny sticker",
          mediaUrl: "/uploads/whatsapp/sticker.webp",
          mediaType: "sticker",
          mediaFileName: "sticker.webp",
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
        }}
        previousMessage={undefined}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
      />,
    );

    // Initial check: modal dialog is not in document
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click the sticker trigger button
    const stickerTrigger = screen.getByTitle("عرض الملصق");
    fireEvent.click(stickerTrigger);

    // Now modal is mounted in DOM on the same page
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Funny sticker");

    // Close button works
    const closeBtn = screen.getByTitle("إغلاق");
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes modal preview on Escape key press", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-escape-test",
          messageId: "wamid.fixture-escape-test",
          remoteJid: "201111111111@s.whatsapp.net",
          fromMe: false,
          messageType: "STICKER",
          content: null,
          mediaUrl: "/uploads/whatsapp/test.webp",
          mediaType: "sticker",
          mediaFileName: "test.webp",
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
        }}
        previousMessage={undefined}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
      />,
    );

    const trigger = screen.getByTitle("عرض الملصق");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens inline preview modal on the same page when clicking an image", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-image-test",
          messageId: "wamid.fixture-image-test",
          remoteJid: "201111111111@s.whatsapp.net",
          fromMe: false,
          messageType: "IMAGE",
          content: "Sample photo",
          mediaUrl: "/uploads/whatsapp/photo.jpg",
          mediaType: "image",
          mediaFileName: "photo.jpg",
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
        }}
        previousMessage={undefined}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
      />,
    );

    const imgTrigger = screen.getByTitle("عرض الصورة");
    fireEvent.click(imgTrigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
