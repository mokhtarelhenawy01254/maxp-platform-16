import React from "react";
import { render, screen } from "@testing-library/react";
import BrowserPushBanner from "../BrowserPushBanner";

const mockUseAuth = jest.fn();

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../utils/pushNotifications", () => ({
  isBrowserPushSupported: jest.fn(() => true),
  subscribeToBrowserPush: jest.fn(() => Promise.resolve()),
  readBrowserPushState: jest.fn(() => ({ active: false })),
}));

jest.mock("../../../services/api", () => ({
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

describe("BrowserPushBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "Notification", {
      value: {
        permission: "default",
        requestPermission: jest.fn(() => Promise.resolve("default")),
      },
      writable: true,
    });
  });

  it("does NOT render for users of other companies", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-other",
        email: "other_merchant@example.com",
        companyId: "other-company-id",
        company: { id: "other-company-id", name: "Other Store" },
      },
    });

    const { container } = render(<BrowserPushBanner />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/تنبيه لشركة أميرال/i)).not.toBeInTheDocument();
  });

  it("does NOT render when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    const { container } = render(<BrowserPushBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders properly when user is ahmedfares61994@gmail.com", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-ameerelle",
        email: "ahmedfares61994@gmail.com",
        companyId: "cmteva12p00lrjuwxpufr4k8w",
        company: { id: "cmteva12p00lrjuwxpufr4k8w", name: "Ameerelle" },
      },
    });

    render(<BrowserPushBanner />);
    expect(screen.getByText(/تنبيه لشركة أميرال/i)).toBeInTheDocument();
    expect(screen.getByText(/تفعيل الإشعارات الآن/i)).toBeInTheDocument();
  });

  it("renders properly when user companyId is cmteva12p00lrjuwxpufr4k8w", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-staff",
        email: "staff@ameerelle.com",
        companyId: "cmteva12p00lrjuwxpufr4k8w",
        company: { id: "cmteva12p00lrjuwxpufr4k8w", name: "Ameerelle" },
      },
    });

    render(<BrowserPushBanner />);
    expect(screen.getByText(/تنبيه لشركة أميرال/i)).toBeInTheDocument();
  });
});
