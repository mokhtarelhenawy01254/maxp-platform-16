import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppExplanationsPage, { CardVideoBlock } from "../AppExplanationsPage";
import { apiClient } from "../../../services/apiClient";

const mockT = (key: string, fallback?: string) => fallback || key;
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { getResource: () => undefined },
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const youtubeExp = {
  id: "exp-1",
  title: "شرح لوحة التطبيقات",
  slug: "apps-guide",
  targetRoute: "/apps",
  order: 1,
  content: "<p>محتوى شرح التطبيقات</p>",
  videoUrl: "https://www.youtube.com/watch?v=wCD3sFrIF5U",
};

describe("AppExplanationsPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders explanations accordion rows for the fetched explanations", async () => {
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

    // base-ui's Collapsible does not toggle under jsdom pointer events, so the
    // row is only asserted to render; the video block has its own coverage below.
    // Re-query instead of holding a node: the page re-renders after the fetch and
    // detaches the earlier element.
    await waitFor(
      () => {
        expect(screen.getByText("شرح لوحة التطبيقات")).toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  });

  it("shows a facade thumbnail first and embeds the player with the jsapi flag after clicking play", () => {
    render(<CardVideoBlock exp={youtubeExp} watchVideoLabel="شاهد الفيديو" />);

    // الفاساد: ثامبنيل + زر تشغيل — بلا iframe قبل الضغطة (تحميل عند الطلب)
    expect(screen.queryByTitle("شرح لوحة التطبيقات")).not.toBeInTheDocument();
    const facade = screen.getByRole("button", { name: /شاهد الفيديو — شرح لوحة التطبيقات/ });
    expect(facade.querySelector("img[src*='i.ytimg.com']")).not.toBeNull();

    fireEvent.click(facade);

    const iframe = screen.getByTitle("شرح لوحة التطبيقات");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/wCD3sFrIF5U?rel=0&modestbranding=1&playsinline=1&enablejsapi=1"
    );

    const externalLink = screen.getByRole("link", { name: /فتح على يوتيوب/i });
    expect(externalLink).toHaveAttribute("href", "https://www.youtube.com/watch?v=wCD3sFrIF5U");
    expect(externalLink).toHaveAttribute("target", "_blank");
  });

  it("swaps a dead video for the Arabic notice when YouTube reports onError", () => {
    render(<CardVideoBlock exp={youtubeExp} watchVideoLabel="شاهد الفيديو" />);

    fireEvent.click(screen.getByRole("button", { name: /شاهد الفيديو — شرح لوحة التطبيقات/ }));
    expect(screen.getByTitle("شرح لوحة التطبيقات")).toBeInTheDocument();

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          origin: "https://www.youtube-nocookie.com",
          data: JSON.stringify({ event: "onError", info: 100 }),
        }),
      );
    });

    expect(screen.queryByTitle("شرح لوحة التطبيقات")).not.toBeInTheDocument();
    expect(screen.getByText(/الفيديو التوضيحي مش متاح حاليًا/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /فتح على يوتيوب/i })).not.toBeInTheDocument();
  });
});
