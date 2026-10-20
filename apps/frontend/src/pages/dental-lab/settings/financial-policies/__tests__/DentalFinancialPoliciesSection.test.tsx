// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalFinancialPoliciesSection from "../../DentalFinancialPoliciesSection";
import { apiClient } from "@/services/apiClient";

describe("DentalFinancialPoliciesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockImplementation(() => true);

    vi.spyOn(apiClient, "get").mockImplementation((url: string) => {
      if (url === "/dental-lab/policies") {
        return Promise.resolve({
          data: {
            data: {
              financial: {
                defaultTreasuryId: "tr-101",
                postings: {
                  caseInvoice: "AUTO",
                  supplierPayment: "CONFIRM",
                  technicianPayout: "CONFIRM",
                  caseBomConsumption: "MANUAL",
                  outsourceExpense: "CONFIRM",
                },
                autoEnabledAt: new Date().toISOString(), // recent grace period
              },
            },
          },
        });
      }
      if (url === "/treasury/accounts") {
        return Promise.resolve({
          data: {
            accounts: [
              { id: "tr-101", name: "خزينة المعمل الرئيسية", balance: 50000 },
              { id: "tr-102", name: "حساب البنك التجاري", balance: 120000 },
            ],
          },
        });
      }
      if (url === "/dental-lab/financial/postings/pending") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "post-1",
                sourceType: "CASE_INVOICE",
                sourceId: "inv-900",
                account: "TREASURY_MAIN",
                direction: "INCOME",
                amount: 3500,
                status: "PENDING",
                partyName: "د. أحمد جلال",
                notes: "تحصيل فاتورة حالة رقم 450",
                createdAt: "2026-10-18T10:00:00Z",
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    vi.spyOn(apiClient, "put").mockResolvedValue({ data: { success: true } });
    vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads policies, treasuries, and pending postings, displaying grace period banner", async () => {
    render(<DentalFinancialPoliciesSection />);

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText("الطبقة المالية والترحيل الموحّد (Financial Posting)")).toBeInTheDocument();
    });

    // Grace period banner
    expect(screen.getByText(/فترة الأمان التجريبية \(Grace Period\) مفعّلة حالياً/)).toBeInTheDocument();

    // Default treasury select
    expect(screen.getByText(/خزينة المعمل الرئيسية \(50,000 ج.م\)/)).toBeInTheDocument();

    // Pending postings table
    expect(screen.getByText("1 حركة معلقة")).toBeInTheDocument();
    expect(screen.getByText("د. أحمد جلال")).toBeInTheDocument();
    expect(screen.getByText("CASE_INVOICE")).toBeInTheDocument();
    expect(screen.getByText(/3,500 ج.م/)).toBeInTheDocument();
    expect(screen.getByText("وارد")).toBeInTheDocument();
  });

  it("updates posting policy and saves successfully", async () => {
    render(<DentalFinancialPoliciesSection />);

    await waitFor(() => {
      expect(screen.getByText("حفظ إعدادات الترحيل")).toBeInTheDocument();
    });

    // Click Save
    fireEvent.click(screen.getByText("حفظ إعدادات الترحيل"));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/dental-lab/policies",
        expect.objectContaining({
          financial: expect.objectContaining({
            defaultTreasuryId: "tr-101",
          }),
        })
      );
    });
  });

  it("confirms a pending posting when clicking confirm button", async () => {
    render(<DentalFinancialPoliciesSection />);

    await waitFor(() => {
      expect(screen.getByText("تأكيد الترحيل")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("تأكيد الترحيل"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/dental-lab/financial/postings/post-1/confirm",
        { treasuryAccountId: "tr-101" }
      );
    });
  });

  it("voids a pending posting when clicking cancel/void button", async () => {
    render(<DentalFinancialPoliciesSection />);

    await waitFor(() => {
      expect(screen.getByText("إلغاء")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("إلغاء"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith(
        "/dental-lab/financial/postings/post-1/void",
        { reason: "إلغاء يدوي من الإعدادات" }
      );
    });
  });

  it("displays clean empty state without emoji when there are no pending postings", async () => {
    vi.spyOn(apiClient, "get").mockImplementation((url: string) => {
      if (url === "/dental-lab/financial/postings/pending") {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === "/dental-lab/policies") {
        return Promise.resolve({ data: { data: { financial: {} } } });
      }
      if (url === "/treasury/accounts") {
        return Promise.resolve({ data: { accounts: [] } });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(<DentalFinancialPoliciesSection />);

    await waitFor(() => {
      expect(
        screen.getByText("لا توجد حركات مالية معلقة بانتظار الاعتماد حالياً")
      ).toBeInTheDocument();
    });
  });
});
