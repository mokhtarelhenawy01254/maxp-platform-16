/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../../../config", () => ({
  config: {
    apiUrl: "http://127.0.0.1:3007/api/v1",
  },
}));

import MessageBubble from "../MessageBubble";

describe("MessageBubble media rendering", () => {
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
});
