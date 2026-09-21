/* @vitest-environment jsdom */

import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrderInvoiceSettings from "../OrderInvoiceSettings";

const mockNavigate = vi.fn();
const mockApiGet = vi.fn();
const mockApiPut = vi.fn();
const mockApiPost = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      companyId: "company-from-auth",
    },
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

describe("OrderInvoiceSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("PointerEvent", MouseEvent);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const setupSuccessfulLoad = () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/order-invoice-settings") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              autoGenerate: true,
              autoGenerateOnStatus: "SHIPPED",
              invoicePrefix: "B2B",
              invoiceNumberFormat: "B2B-YYYY-XXXX",
              defaultTaxRate: 14,
              defaultTerms: "الدفع خلال 7 أيام",
              defaultNotes: "شكراً لتعاملكم معنا",
              defaultDueDays: 7,
              showCompanyLogo: true,
              showTaxBreakdown: true,
              showPaymentMethod: false,
              showOrderItems: true,
              showCustomFields: false,
              autoEmailToCustomer: true,
              emailSubject: "فاتورتك جاهزة",
              emailBody: "يرجى مراجعة الفاتورة المرفقة",
              pdfPageSize: "Letter",
              pdfOrientation: "landscape",
              primaryColor: "#112233",
              secondaryColor: "#445566",
              fontFamily: "Tahoma",
            },
          },
        });
      }

      if (url === "/companies/current") {
        return Promise.resolve({
          data: {
            data: {
              id: "company-7",
              settings: {
                orderPreparation: {
                  packingMode: "strict",
                  slipDocument: {
                    documentTitle: "ورقة تجهيز VIP",
                    documentSubtitle: "مراجعة نهائية قبل التسليم",
                    accentColor: "#aa5500",
                    pageSize: "A5",
                    pageOrientation: "landscape",
                    showCompanyName: true,
                    showCustomerEmail: true,
                    showOrderNotes: false,
                    showPaymentSummary: true,
                    showFinancialSummary: false,
                    showItemSku: true,
                    showItemDetails: true,
                    showItemColor: false,
                    showItemSize: true,
                    showItemPrice: true,
                    showItemTotal: false,
                    preparationInstructions: "راجع العدد والمقاسات",
                    footerNote: "نسخة داخلية فقط",
                  },
                },
              },
            },
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  };

  it("loads invoice and slip settings into the modern page", async () => {
    setupSuccessfulLoad();

    render(<OrderInvoiceSettings />);

    await screen.findByRole("heading", { name: "مركز الفواتير والطباعة" });

    expect(screen.getByDisplayValue("B2B")).toBeTruthy();
    expect(screen.getByDisplayValue("B2B-YYYY-XXXX")).toBeTruthy();
    expect(screen.getByText("الفاتورة:")).toBeTruthy();
    expect(screen.getByText("ورقة التجهيز:")).toBeTruthy();
  });

  it("saves invoice settings and company slip document with the same backend contracts", async () => {
    setupSuccessfulLoad();
    mockApiPut.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(<OrderInvoiceSettings />);

    await screen.findByRole("heading", { name: "مركز الفواتير والطباعة" });

    fireEvent.change(screen.getByLabelText("بادئة رقم الفاتورة"), {
      target: { value: "CORP" },
    });

    fireEvent.click(screen.getByRole("button", { name: "حفظ الكل" }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith("/order-invoice-settings", {
        autoGenerate: true,
        autoGenerateOnStatus: "SHIPPED",
        invoicePrefix: "CORP",
        invoiceNumberFormat: "B2B-YYYY-XXXX",
        defaultTaxRate: 14,
        defaultTerms: "الدفع خلال 7 أيام",
        defaultNotes: "شكراً لتعاملكم معنا",
        defaultDueDays: 7,
        showCompanyLogo: true,
        showTaxBreakdown: true,
        showPaymentMethod: false,
        showOrderItems: true,
        showCustomFields: false,
        autoEmailToCustomer: true,
        emailSubject: "فاتورتك جاهزة",
        emailBody: "يرجى مراجعة الفاتورة المرفقة",
        pdfPageSize: "Letter",
        pdfOrientation: "landscape",
        primaryColor: "#112233",
        secondaryColor: "#445566",
        fontFamily: "Tahoma",
        showBarcodeOrderCode: true,
        showBarcodeShippingCode: true,
      });
    });

    expect(mockApiPut).toHaveBeenCalledWith("/companies/company-7", {
      settings: {
        orderPreparation: {
          packingMode: "strict",
          slipDocument: {
            documentTitle: "ورقة تجهيز VIP",
            documentSubtitle: "مراجعة نهائية قبل التسليم",
            accentColor: "#aa5500",
            pageSize: "A5",
            pageOrientation: "landscape",
            showCompanyName: true,
            showCustomerEmail: true,
            showOrderNotes: false,
            showPaymentSummary: true,
            showFinancialSummary: false,
            showItemSku: true,
            showItemDetails: true,
            showItemColor: false,
            showItemSize: true,
            showItemPrice: true,
            showItemTotal: false,
            preparationInstructions: "راجع العدد والمقاسات",
            footerNote: "نسخة داخلية فقط",
          },
        },
      },
    });
  });

  it("resets invoice settings only after confirmation", async () => {
    setupSuccessfulLoad();
    mockApiPost.mockResolvedValue({
      data: {
        data: {
          invoicePrefix: "INV",
          invoiceNumberFormat: "INV-YYYYMMDD-XXXXXX",
          autoGenerate: false,
          autoGenerateOnStatus: "",
          defaultTaxRate: 0,
          defaultTerms: "",
          defaultNotes: "",
          defaultDueDays: 7,
          showCompanyLogo: true,
          showTaxBreakdown: true,
          showPaymentMethod: true,
          showOrderItems: true,
          autoEmailToCustomer: false,
          emailSubject: "",
          emailBody: "",
          pdfPageSize: "A4",
          pdfOrientation: "portrait",
          primaryColor: "#4F46E5",
          secondaryColor: "#6B7280",
          fontFamily: "Arial",
        },
      },
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<OrderInvoiceSettings />);

    await screen.findByRole("heading", { name: "مركز الفواتير والطباعة" });

    fireEvent.click(screen.getByRole("button", { name: "إعادة الفاتورة" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/order-invoice-settings/reset", {});
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("INV")).toBeTruthy();
    });
  });
});
