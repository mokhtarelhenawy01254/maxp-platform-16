import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicAffiliateRegister from "../PublicAffiliateRegister";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock("../../../utils/storeUrl", () => ({
  getBaseDomain: jest.fn(() => "localhost:3000"),
  getCurrentSubdomain: jest.fn(() => null),
}));

describe("PublicAffiliateRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {},
      },
    });
  });

  test("loads company branding and custom terms for slug-based signup", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "company-1",
          name: "Demo Store",
          slug: "demo-store",
          affiliateProgram: {
            isActive: true,
            termsAndConditions: "شرط مخصص 1\nشرط مخصص 2",
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/affiliate-register/demo-store"]}>
        <Routes>
          <Route
            path="/affiliate-register/:slug"
            element={<PublicAffiliateRegister />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("تسجيل كمسوق لدى Demo Store"),
    ).toBeInTheDocument();
    expect(screen.getByText("شرط مخصص 1")).toBeInTheDocument();
    expect(screen.getByText("شرط مخصص 2")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith(
      "/public/affiliates/companies/demo-store",
    );
  });

  test("disables signup when the affiliate program is inactive", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "company-2",
          name: "Paused Store",
          slug: "paused-store",
          affiliateProgram: {
            isActive: false,
            termsAndConditions: "",
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/affiliate-register/paused-store"]}>
        <Routes>
          <Route
            path="/affiliate-register/:slug"
            element={<PublicAffiliateRegister />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/برنامج المسوقين لهذه الشركة متوقف حالياً/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "تسجيل كمسوق" }),
      ).toBeDisabled();
    });
  });

  test("allows generic affiliate signup without binding to a company", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/register/affiliate"]}>
        <Routes>
          <Route path="/register/affiliate" element={<PublicAffiliateRegister />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(
      container.querySelector('input[name="firstName"]') as HTMLInputElement,
      {
      target: { value: "Ali" },
      },
    );
    fireEvent.change(
      container.querySelector('input[name="lastName"]') as HTMLInputElement,
      {
      target: { value: "Tester" },
      },
    );
    fireEvent.change(
      container.querySelector('input[name="email"]') as HTMLInputElement,
      {
      target: { value: "affiliate-generic@example.com" },
      },
    );
    fireEvent.change(
      container.querySelector('input[name="password"]') as HTMLInputElement,
      {
      target: { value: "Password123!" },
      },
    );
    fireEvent.change(
      container.querySelector('select[name="paymentMethod"]') as HTMLSelectElement,
      {
      target: { value: "INSTAPAY" },
      },
    );
    fireEvent.change(
      container.querySelector('input[name="walletPhoneNumber"]') as HTMLInputElement,
      {
      target: { value: "01012345678" },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "تسجيل كمسوق" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/public/affiliates/register",
        expect.objectContaining({
          email: "affiliate-generic@example.com",
          firstName: "Ali",
          lastName: "Tester",
          paymentMethod: "INSTAPAY",
          companySlug: undefined,
        }),
      );
    });

    expect(mockToastSuccess).toHaveBeenCalled();
  });

  test("shows a company lookup error and disables submission for an invalid slug", async () => {
    mockGet.mockRejectedValue({
      response: {
        data: {
          message: "الشركة غير موجودة",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/affiliate-register/not-found-company"]}>
        <Routes>
          <Route
            path="/affiliate-register/:slug"
            element={<PublicAffiliateRegister />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("الشركة غير موجودة")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "تسجيل كمسوق" }),
      ).toBeDisabled();
    });
  });
});
