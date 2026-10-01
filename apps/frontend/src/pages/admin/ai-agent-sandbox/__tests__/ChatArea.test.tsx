// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatArea } from "../components/ChatArea";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const agent = {
  id: "agent_sales",
  name: "Sales Agent",
  icon: "S",
  role: "SALES",
  description: "Sales support",
  defaultModel: "gemini-2.5-flash",
  allowedTools: ["product.search"],
};

const providers = [
  {
    provider: "GOOGLE",
    model: "gemma-4-31b-it",
    label: "gemma-4-31b-it",
    keyId: "key_google",
    keyName: "Central Google",
    keyType: "CENTRAL",
    scope: "central",
    keyIsActive: true,
    isSelectable: true,
  },
];

describe("ChatArea", () => {
  it("filters out chain-of-thought draft markers from assistant messages", () => {
    const messages = [
      {
        id: "m1",
        role: "user" as const,
        content: "السلام عليكم",
        timestamp: new Date().toISOString(),
      },
      {
        id: "m2",
        role: "assistant" as const,
        content: `*   *Draft 1 (Formal - Incorrect):* وعليكم السلام ورحمة الله وبركاته. (Too formal).
    *   *Draft 2 (Colloquial):* وعليكم السلام! (Better).

    *   Egyptian dialect? Yes.
    *   Cheerful? Yes.

وعليكم السلام يا باشا! نورتنا والله`,
        timestamp: new Date().toISOString(),
        model: "gemma-4-31b-it",
        provider: "GOOGLE",
      },
    ];

    render(
      <ChatArea
        messages={messages}
        agent={agent}
        model="gemma-4-31b-it"
        providers={providers}
        isLoading={false}
        isStreaming={false}
        canSend={true}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.queryByText(/Draft 1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Egyptian dialect/)).not.toBeInTheDocument();
    expect(screen.getByText(/وعليكم السلام يا باشا/)).toBeInTheDocument();
  });

  it("strips agent persona/goal reasoning and first-person monologue", () => {
    const messages = [
      {
        id: "m1",
        role: "assistant" as const,
        content: [
          '*   User\'s question: "هو سعره كام ؟"',
          '    *   Agent Identity: "سمسم"',
          '    *   Agent Persona/Goal: A clever salesman, speaks Egyptian Arabic, cheerful style.',
          '    *   Constraints: Must stick to the persona.',
          '    *   Knowledge Base: Contains generic products, but goal says sells international perfumes called Noussa.',
          '    *   The user has not mentioned a specific perfume or product.',
          '    *   I need to ask the user which perfume they are interested in.',
          '    *   "يا باشا/يا فندم، نورتني! بس قولي قصدك على أنهي واحد من برفانات ' + String.fromCharCode(39) + 'نوسه' + String.fromCharCode(39) + ' العالمية؟ عشان أقولك سعره وأظبطك في أحلى ريحة! 😉"',
          '',
          'يا باشا نورتني! بس قولي قصدك على أنهي واحد من برفانات "نوسه" العالمية؟ عشان أقولك سعره وأظبطك في أحلى ريحة! 😉',
        ].join('\n'),
        timestamp: new Date().toISOString(),
        model: "gemma-4-31b-it",
        provider: "GOOGLE",
      },
    ];

    render(
      <ChatArea
        messages={messages}
        agent={agent}
        model="gemma-4-31b-it"
        providers={providers}
        isLoading={false}
        isStreaming={false}
        canSend={true}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.queryByText(/Agent Identity/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Knowledge Base/)).not.toBeInTheDocument();
    expect(screen.queryByText(/I need to ask/)).not.toBeInTheDocument();
    expect(screen.getByText(/يا باشا نورتني/)).toBeInTheDocument();
  });

  it("renders normal assistant replies unchanged", () => {
    const messages = [
      {
        id: "m1",
        role: "assistant" as const,
        content: "Hello, how can I help you today?",
        timestamp: new Date().toISOString(),
      },
    ];

    render(
      <ChatArea
        messages={messages}
        agent={agent}
        model="gemma-4-31b-it"
        providers={providers}
        isLoading={false}
        isStreaming={false}
        canSend={true}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByText("Hello, how can I help you today?")).toBeInTheDocument();
  });

  it("renders markdown links and raw URLs as interactive clickable links", () => {
    const messages = [
      {
        id: "m_links",
        role: "assistant" as const,
        content: "Check this [Sandbox Chat](https://maxp.online/admin/ai-hub?tab=sandbox&sessionId=test_123) and visit https://example.com for info.",
        timestamp: new Date().toISOString(),
      },
    ];

    render(
      <ChatArea
        messages={messages}
        agent={agent}
        model="gemma-4-31b-it"
        providers={providers}
        isLoading={false}
        isStreaming={false}
        canSend={true}
        onSendMessage={vi.fn()}
      />
    );

    const mdLink = screen.getByRole("link", { name: "Sandbox Chat" });
    expect(mdLink).toHaveAttribute("href", "https://maxp.online/admin/ai-hub?tab=sandbox&sessionId=test_123");
    expect(mdLink).toHaveAttribute("target", "_blank");

    const rawLink = screen.getByRole("link", { name: "https://example.com" });
    expect(rawLink).toHaveAttribute("href", "https://example.com");
    expect(rawLink).toHaveAttribute("target", "_blank");
  });
});
