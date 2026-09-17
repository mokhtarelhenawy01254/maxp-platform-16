import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import HeaderWalletShortcut from "../HeaderWalletShortcut";
import { apiClient } from "../../../services/apiClient";

const translations: Record<string, string> = {
  "billing.payments.rechargeWallet": "شحن المحفظة",
  "billing.payments.walletBalance": "الرصيد الحالي",
  "billing.payments.confirmRecharge": "تأكيد الشحن",
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => translations[key] || fallback || key,
    i18n: {
      language: "ar",
      dir: () => "rtl",
    },
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("HeaderWalletShortcut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders clean icon button without exposing the balance number outside", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          balance: 7784.6,
          currency: "EGP",
        },
      },
    });

    render(<HeaderWalletShortcut />);

    const button = await screen.findByRole("button", { name: "شحن المحفظة" });
    expect(button).toBeInTheDocument();
    // The number should NOT be visible on the outside button
    expect(screen.queryByText(/7784/)).not.toBeInTheDocument();
    expect(screen.queryByText(/٧,٧٨٤/)).not.toBeInTheDocument();

    expect(apiClient.get).toHaveBeenCalledWith("/wallet/balance");
  });

  it("displays the current balance inside the modal when clicked", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          balance: 7784.6,
          currency: "EGP",
        },
      },
    });

    render(<HeaderWalletShortcut />);

    const button = await screen.findByRole("button", { name: "شحن المحفظة" });
    fireEvent.click(button);

    // Modal opens and shows title and current balance inside
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("شحن المحفظة")).toBeInTheDocument();
    expect(screen.getByText("الرصيد الحالي:")).toBeInTheDocument();
    expect(screen.getByText(/ج\.م/)).toBeInTheDocument();
  });

  it("refetches balance on wallet:updated custom event", async () => {
    (apiClient.get as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { balance: 50, currency: "EGP" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { balance: 150, currency: "EGP" },
        },
      });

    render(<HeaderWalletShortcut />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("wallet:updated"));
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
