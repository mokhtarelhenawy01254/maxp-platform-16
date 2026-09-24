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

describe("MessageBubble reactions rendering", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders emoji reaction badge when reactions object is present", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-1",
          messageId: "wamid-1",
          remoteJid: "201000000000@s.whatsapp.net",
          fromMe: false,
          messageType: "TEXT",
          content: "Hello there!",
          mediaUrl: null,
          mediaType: null,
          mediaFileName: null,
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
          reactions: {
            customer: "❤️",
            customer2: "❤️",
            me: "👍"
          }
        }}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
      />
    );

    expect(screen.getByText("❤️")).toBeInTheDocument();
    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("triggers onReaction when existing reaction is clicked", () => {
    const handleReaction = vi.fn();
    render(
      <MessageBubble
        message={{
          id: "msg-2",
          messageId: "wamid-2",
          remoteJid: "201000000000@s.whatsapp.net",
          fromMe: false,
          messageType: "TEXT",
          content: "Testing reaction toggle",
          mediaUrl: null,
          mediaType: null,
          mediaFileName: null,
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
          reactions: {
            me: "❤️"
          }
        }}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
        onReaction={handleReaction}
      />
    );

    const reactionPill = screen.getByRole("button", { name: /❤️/ });
    fireEvent.click(reactionPill);

    expect(handleReaction).toHaveBeenCalledWith("wamid-2", "❤️");
  });

  it("parses reactions from metadata string if top-level reactions is missing", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-3",
          messageId: "wamid-3",
          remoteJid: "201000000000@s.whatsapp.net",
          fromMe: false,
          messageType: "TEXT",
          content: "Metadata reactions test",
          mediaUrl: null,
          mediaType: null,
          mediaFileName: null,
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
          metadata: JSON.stringify({ reactions: { customer: "😂" } })
        }}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
      />
    );

    expect(screen.getByText("😂")).toBeInTheDocument();
  });

  it("opens reaction selector and triggers reaction callback when emoji is clicked", () => {
    const handleReaction = vi.fn();
    render(
      <MessageBubble
        message={{
          id: "msg-4",
          messageId: "wamid-4",
          remoteJid: "201000000000@s.whatsapp.net",
          fromMe: false,
          messageType: "TEXT",
          content: "Testing floating reaction picker",
          mediaUrl: null,
          mediaType: null,
          mediaFileName: null,
          quotedMessageId: null,
          quotedContent: null,
          status: "DELIVERED",
          timestamp: "2026-05-10T12:00:00.000Z",
          isAIResponse: false,
          aiConfidence: null,
        }}
        isGroup={false}
        onContextMenu={() => undefined}
        getParticipantName={() => ""}
        onReaction={handleReaction}
      />
    );

    const smileBtn = screen.getByTitle("إضافة تفاعل");
    expect(smileBtn).toBeInTheDocument();
    fireEvent.click(smileBtn);

    const angryEmojiBtn = screen.getByTitle("😡");
    expect(angryEmojiBtn).toBeInTheDocument();
    fireEvent.click(angryEmojiBtn);

    expect(handleReaction).toHaveBeenCalledWith("wamid-4", "😡");
  });
});
