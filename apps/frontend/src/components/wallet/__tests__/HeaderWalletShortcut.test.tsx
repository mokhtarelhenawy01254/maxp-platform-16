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

  it("fetches and displays the wallet balance with currency", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          balance: 250.5,
          currency: "EGP",
        },
      },
    });

    render(<HeaderWalletShortcut />);

    await waitFor(() => {
      // Formatted as Arabic numerals or Western digits with ج.م
      const balanceEl = screen.getByText(/ج\.م/);
      expect(balanceEl).toBeInTheDocument();
    });

    expect(apiClient.get).toHaveBeenCalledWith("/wallet/balance");
  });

  it("opens quick recharge modal when button is clicked", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          balance: 100,
          currency: "EGP",
        },
      },
    });

    render(<HeaderWalletShortcut />);

    const button = await screen.findByRole("button");
    fireEvent.click(button);

    // Modal opens and shows title
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("شحن المحفظة")).toBeInTheDocument();
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
      expect(screen.getByText(/ج\.م/)).toBeInTheDocument();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new CustomEvent("wallet:updated"));
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
