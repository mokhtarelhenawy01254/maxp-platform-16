import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import PlatformSiteHomepageTemplates from "../PlatformSiteHomepageTemplates";

const getSettingsMock = jest.fn();
const updateSettingsMock = jest.fn();

jest.mock("sonner", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../services/platformSiteHomepageService", () => ({
  __esModule: true,
  DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS: {
    systemName: "platform_public_landing",
    displayName: "Platform Public Landing",
    description: "Homepage variants",
    category: "platform-site",
    isEnabled: true,
    activeLandingId: "enterprise-os",
    availableLandingIds: [
      "enterprise-os",
      "sales-flow",
      "executive-atlas",
      "business-os",
    ],
    createdAt: null,
    updatedAt: null,
  },
  platformSiteHomepageService: {
    getSettings: (...args: unknown[]) => getSettingsMock(...args),
    updateSettings: (...args: unknown[]) => updateSettingsMock(...args),
  },
  default: {
    getSettings: (...args: unknown[]) => getSettingsMock(...args),
    updateSettings: (...args: unknown[]) => updateSettingsMock(...args),
  },
}));

describe("PlatformSiteHomepageTemplates", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getSettingsMock.mockResolvedValue({
      systemName: "platform_public_landing",
      displayName: "Platform Public Landing",
      description: "Homepage variants",
      category: "platform-site",
      isEnabled: true,
      activeLandingId: "sales-flow",
      availableLandingIds: [
        "enterprise-os",
        "sales-flow",
        "executive-atlas",
        "business-os",
      ],
      createdAt: null,
      updatedAt: "2026-04-28T10:00:00.000Z",
    });

    updateSettingsMock.mockResolvedValue({
      systemName: "platform_public_landing",
      displayName: "Platform Public Landing",
      description: "Homepage variants",
      category: "platform-site",
      isEnabled: true,
      activeLandingId: "executive-atlas",
      availableLandingIds: [
        "enterprise-os",
        "sales-flow",
        "executive-atlas",
        "business-os",
      ],
      createdAt: null,
      updatedAt: "2026-04-28T10:05:00.000Z",
    });
  });

  test("loads the publishing room with the active landing variant selected", async () => {
    render(<PlatformSiteHomepageTemplates />);

    expect(
      await screen.findByRole("heading", { name: /غرفة تحرير/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Sales Flow/i, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Sales Flow/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /نظام تشغيل الأعمال/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /هذه النسخة منشورة الآن/i }),
    ).toBeInTheDocument();
  });

  test("keeps newly shipped variants visible even if the admin api returns an older list", async () => {
    getSettingsMock.mockResolvedValueOnce({
      systemName: "platform_public_landing",
      displayName: "Platform Public Landing",
      description: "Homepage variants",
      category: "platform-site",
      isEnabled: true,
      activeLandingId: "enterprise-os",
      availableLandingIds: [
        "enterprise-os",
        "sales-flow",
        "executive-atlas",
      ],
      createdAt: null,
      updatedAt: "2026-04-28T10:00:00.000Z",
    });

    render(<PlatformSiteHomepageTemplates />);

    await screen.findByRole("heading", { name: /غرفة تحرير/i, level: 1 });

    expect(
      screen.getByRole("button", { name: /نظام تشغيل الأعمال/i }),
    ).toBeInTheDocument();
  });

  test("switches the selected variant and publishes it", async () => {
    render(<PlatformSiteHomepageTemplates />);

    await screen.findByRole("heading", { name: /غرفة تحرير/i, level: 1 });

    fireEvent.click(
      screen.getByRole("button", { name: /Executive Atlas/i }),
    );

    const previewLink = screen.getByRole("link", {
      name: /فتح المعاينة العامة/i,
    });
    expect(
      screen.getByRole("heading", { name: /Executive Atlas/i, level: 2 }),
    ).toBeInTheDocument();
    expect(previewLink).toHaveAttribute(
      "href",
      "/preview/platform-home/executive-atlas",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /اعتماد هذه النسخة للنشر/i }),
    );

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith({
        activeLandingId: "executive-atlas",
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "تم تحديث الصفحة الرئيسية العامة",
      );
    });

    expect(
      await screen.findByRole("button", { name: /هذه النسخة منشورة الآن/i }),
    ).toBeInTheDocument();
  });
});
