import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppExplanationsPage from "../AppExplanationsPage";
import { apiClient } from "../../../services/apiClient";

const mockT = (key: string, fallback?: string) => fallback || key;
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe("AppExplanationsPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders explanations accordion and opens card with YouTube embed and fallback link", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        explanations: [
          {
            id: "exp-1",
            title: "شرح لوحة التطبيقات",
            slug: "apps-guide",
            targetRoute: "/apps",
            order: 1,
            content: "<p>محتوى شرح التطبيقات</p>",
            videoUrl: "https://www.youtube.com/watch?v=wCD3sFrIF5U",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <AppExplanationsPage />
      </MemoryRouter>
    );

    // Wait until explanations are fetched and rendered in the DOM
    let trigger: HTMLElement | null = null;
    await waitFor(() => {
      const btn = screen.queryByRole("button", { name: /شرح لوحة التطبيقات/i });
      expect(btn).not.toBeNull();
      expect(btn?.isConnected).toBe(true);
      trigger = btn;
    });

    expect(trigger).toBeInTheDocument();

    // Base-UI responds to click / pointer events
    fireEvent.pointerDown(trigger!);
    fireEvent.click(trigger!);

    // Check iframe is loaded
    const iframe = await screen.findByTitle("شرح لوحة التطبيقات");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/wCD3sFrIF5U?rel=0&modestbranding=1&playsinline=1"
    );

    // Check external fallback link
    const externalLink = screen.getByRole("link", { name: /فتح على يوتيوب/i });
    expect(externalLink).toHaveAttribute("href", "https://www.youtube.com/watch?v=wCD3sFrIF5U");
    expect(externalLink).toHaveAttribute("target", "_blank");
  });
});
