import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PublicMerchantRegister from "../PublicMerchantRegister";

const mockPost = jest.fn();
const mockTrackCompleteRegistration = jest.fn();

jest.mock("sonner", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock("../../../utils/storeUrl", () => ({
  getBaseDomain: jest.fn(() => "localhost:3000"),
  getCurrentSubdomain: jest.fn(() => null),
}));

jest.mock("../../../utils/platformSiteMetaPixel", () => ({
  trackPlatformSiteCompleteRegistration: (...args: unknown[]) =>
    mockTrackCompleteRegistration(...args),
}));

describe("PublicMerchantRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({
      data: {
        success: true,
      },
    });
  });

  test("requires company identifier on the root domain and forwards it in the payload", async () => {
    render(<PublicMerchantRegister />);

    fireEvent.change(
      screen.getByLabelText("رابط الشركة أو الـ slug"),
      { target: { value: "demo-store" } },
    );
    fireEvent.change(screen.getByLabelText("اسم التاجر"), {
      target: { value: "Merchant Co" },
    });
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "merchant@example.com" },
    });
    fireEvent.change(screen.getByLabelText("كلمة مرور حساب التاجر"), {
      target: { value: "StrongPass#123" },
    });

    expect(screen.queryByLabelText("نسبة العمولة (%)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Webhook URL (اختياري)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("تفعيل الوفاء التلقائي للطلبات")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "تسجيل كتاجر" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/public/merchants/register",
        expect.objectContaining({
          companyId: "demo-store",
          name: "Merchant Co",
          email: "merchant@example.com",
          password: "StrongPass#123",
        }),
      );
    });

    const payload = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("commissionRate");
    expect(payload).not.toHaveProperty("webhookUrl");
    expect(payload).not.toHaveProperty("autoFulfill");

    expect(mockTrackCompleteRegistration).toHaveBeenCalledWith(
      "merchant_public_register",
      expect.objectContaining({
        destination: "pending-review",
        subdomain: "root",
      }),
    );
  });
});
