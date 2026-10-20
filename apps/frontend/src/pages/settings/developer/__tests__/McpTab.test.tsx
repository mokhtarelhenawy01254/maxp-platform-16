/**
 * Developer Hub → MCP tab: the config block must follow the real deployment
 * status (ticket 2026-10-20). While `/api/v1/public/ext/mcp/status` reports
 * `available:false` the tab must show an explicit "not available" state and
 * must NOT render or copy any `/mcp/*` URL. When the probe says the servers
 * are deployed, the old copy-ready config comes back unchanged.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "ar" } }),
}));

jest.mock("../../../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true,
  default: { createAuthHeaders: () => ({ Authorization: "Bearer test-token" }) },
}));

import McpTab from "../McpTab";

const statusPayload = (payload: Record<string, unknown>) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

const installFetch = (statusResponse: () => Promise<unknown>) => {
  const fetchMock = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/public/ext/mcp/status")) {
      return statusResponse();
    }
    if (url.includes("/developer/credentials")) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ credentials: [] }) });
    }
    if (url.includes("/developer/scopes")) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ scopes: [] }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

describe("McpTab — MCP deployment status", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows an explicit unavailable state and no copyable MCP link when available:false", async () => {
    installFetch(() =>
      Promise.resolve(
        statusPayload({ success: true, available: false, reason: "not_deployed", servers: [] }),
      ),
    );

    render(<McpTab />);

    const banner = await screen.findByTestId("mcp-unavailable-banner");
    expect(banner).toHaveTextContent("سيرفرات MCP غير متاحة في الإنتاج حاليًا");
    expect(banner).toHaveTextContent("السبب");
    expect(banner).toHaveTextContent("/api/v1/public/ext");

    const copyButton = screen.getByTestId("mcp-copy-config");
    expect(copyButton).toBeDisabled();

    expect(screen.queryByTestId("mcp-config-preview")).toBeNull();
    expect(document.body.textContent).not.toContain("/mcp/catalog");
    expect(document.body.textContent).not.toContain("/mcp/video");
  });

  it("renders the ready-to-paste config again when available:true", async () => {
    installFetch(() =>
      Promise.resolve(
        statusPayload({
          success: true,
          available: true,
          reason: null,
          servers: [
            { id: "catalog", path: "/mcp/catalog", tools: [] },
            { id: "video", path: "/mcp/video", tools: [] },
          ],
        }),
      ),
    );

    render(<McpTab />);

    const preview = await screen.findByTestId("mcp-config-preview");
    expect(preview.textContent).toContain("/mcp/catalog");
    expect(preview.textContent).toContain("/mcp/video");
    expect(screen.getByTestId("mcp-copy-config")).toBeEnabled();
    expect(screen.queryByTestId("mcp-unavailable-banner")).toBeNull();
  });

  it("fails closed when the probe throws (never prints a URL it could not verify)", async () => {
    installFetch(() => Promise.reject(new Error("network down")));

    render(<McpTab />);

    const banner = await screen.findByTestId("mcp-unavailable-banner");
    expect(banner).toHaveTextContent("تعذر التحقق من حالة السيرفرات");
    expect(screen.getByTestId("mcp-copy-config")).toBeDisabled();
    expect(screen.queryByTestId("mcp-config-preview")).toBeNull();
  });

  it("fails closed when the probe answers with an HTTP error", async () => {
    installFetch(() => Promise.resolve({ ok: false, status: 503, json: async () => ({}) }));

    render(<McpTab />);

    await waitFor(() => {
      expect(screen.getByTestId("mcp-copy-config")).toBeDisabled();
    });
    expect(screen.queryByTestId("mcp-config-preview")).toBeNull();
    expect(document.body.textContent).not.toContain("/mcp/catalog");
  });
});
