import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PageExplanations from "../PageExplanations";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe("PageExplanations Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders help trigger button even when no explanations exist, showing empty state", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { success: true, explanations: [] },
    });

    render(
      <MemoryRouter initialEntries={["/apps"]}>
        <PageExplanations />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        "/app-explanations/by-route?route=%2Fapps"
      );
    });

    const trigger = screen.getByRole("button", { name: /شرح الصفحة/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByText(/مفيش شرح مخصوص للصفحة دي/i)).toBeInTheDocument();
  });

  it("renders explanation trigger and opens modal with YouTube embed, nocookie URL, and external link", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        explanations: [
          {
            id: "exp-1",
            title: "ركّب تطبيقاتك",
            slug: "apps-guide",
            content: "<p>شرح تثبيت التطبيقات واستخدامها في المتجر</p>",
            videoUrl: "https://www.youtube.com/watch?v=wCD3sFrIF5U",
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/apps"]}>
        <PageExplanations />
      </MemoryRouter>
    );

    // Click help trigger
    const trigger = await screen.findByRole("button", { name: /شرح الصفحة/i });
    fireEvent.click(trigger);

    // Click item in popover
    const itemButton = await screen.findByRole("button", { name: /ركّب تطبيقاتك/i });
    expect(itemButton).toBeInTheDocument();
    fireEvent.click(itemButton);

    // Modal opens
    expect(screen.getByRole("heading", { name: /ركّب تطبيقاتك/i })).toBeInTheDocument();

    // Check YouTube iframe with nocookie domain
    const iframe = screen.getByTitle("ركّب تطبيقاتك");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/wCD3sFrIF5U?rel=0&modestbranding=1&playsinline=1"
    );

    // Check fallback YouTube link
    const ytLink = screen.getByRole("link", { name: /فتح على يوتيوب/i });
    expect(ytLink).toBeInTheDocument();
    expect(ytLink).toHaveAttribute("href", "https://www.youtube.com/watch?v=wCD3sFrIF5U");
    expect(ytLink).toHaveAttribute("target", "_blank");

    // Close the modal
    const closeBtn = screen.getByRole("button", { name: /إغلاق/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTitle("ركّب تطبيقاتك")).not.toBeInTheDocument();
    });
  });

  it("renders native video tag for direct video URLs", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        explanations: [
          {
            id: "exp-3",
            title: "فيديو مباشر",
            slug: "direct-video",
            content: "شرح مباشر",
            videoUrl: "https://storage.example.com/videos/tutorial.mp4",
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/products"]}>
        <PageExplanations />
      </MemoryRouter>
    );

    const trigger = await screen.findByRole("button", { name: /شرح الصفحة/i });
    fireEvent.click(trigger);

    const itemButton = await screen.findByRole("button", { name: /فيديو مباشر/i });
    fireEvent.click(itemButton);

    const link = screen.getByRole("link", { name: /فتح الفيديو في نافذة جديدة/i });
    expect(link).toHaveAttribute("href", "https://storage.example.com/videos/tutorial.mp4");
  });
});
