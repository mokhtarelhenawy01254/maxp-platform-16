import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlatformLandingHost from "../PlatformLandingHost";
import PlatformLandingPreviewPage from "../PlatformLandingPreviewPage";
import { platformSiteHomepageService } from "../../../services/platformSiteHomepageService";

jest.mock("../../LandingPage", () => ({
  __esModule: true,
  default: () => <div>enterprise-os mock</div>,
}));

jest.mock("../PlatformLandingSalesFlow", () => ({
  __esModule: true,
  default: () => <div>sales-flow mock</div>,
}));

jest.mock("../PlatformLandingExecutiveAtlas", () => ({
  __esModule: true,
  default: () => <div>executive-atlas mock</div>,
}));

jest.mock("../PlatformLandingBusinessOs", () => ({
  __esModule: true,
  default: () => <div>business-os mock</div>,
}));

jest.mock("../../../services/platformSiteHomepageService", () => ({
  platformSiteHomepageService: {
    getPublicSettings: jest.fn(),
  },
}));

const mockedHomepageService =
  platformSiteHomepageService as jest.Mocked<typeof platformSiteHomepageService>;

describe("PlatformLandingHost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the configured public landing variant from the public settings endpoint", async () => {
    mockedHomepageService.getPublicSettings.mockResolvedValue({
      activeLandingId: "sales-flow",
      updatedAt: null,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <PlatformLandingHost />
      </MemoryRouter>,
    );

    expect(await screen.findByText("sales-flow mock")).toBeInTheDocument();
  });

  it("renders the preview variant directly from the route param without calling the settings endpoint", async () => {
    render(
      <MemoryRouter
        initialEntries={["/preview/platform-home/executive-atlas"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/preview/platform-home/:variantId"
            element={<PlatformLandingPreviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("executive-atlas mock"),
    ).toBeInTheDocument();
    expect(mockedHomepageService.getPublicSettings).not.toHaveBeenCalled();
  });

  it("renders the new business os preview variant directly from the route param", async () => {
    render(
      <MemoryRouter
        initialEntries={["/preview/platform-home/business-os"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/preview/platform-home/:variantId"
            element={<PlatformLandingPreviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("business-os mock")).toBeInTheDocument();
    expect(mockedHomepageService.getPublicSettings).not.toHaveBeenCalled();
  });
});
