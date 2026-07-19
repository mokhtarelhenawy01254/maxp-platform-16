import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicAffiliateRegister from "../../public/PublicAffiliateRegister";

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock("sonner", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("../../../utils/storeUrl", () => ({
  getBaseDomain: () => "localhost:3000",
  getCurrentSubdomain: () => null,
  isLocalLikeDomain: () => true,
}));

describe("PublicAffiliateRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows company affiliate lifecycle defaults on the public registration page", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "company-1",
          name: "Demo Store",
          slug: "demo-store",
          affiliateProgram: {
            isActive: true,
            autoApproveAffiliates: false,
            defaultMinPayout: 180,
            defaultCanCreateOrdersForOthers: false,
            defaultCanViewCustomerData: false,
            requireIdentityDocument: true,
            identityDocumentLabel: "صورة البطاقة",
            payoutSlaDays: 4,
            termsAndConditions: "",
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
      await screen.findByText("التسجيل يخضع لمراجعة إدارية قبل التفعيل"),
    ).toBeInTheDocument();
    expect(screen.getByText("180 جنيه")).toBeInTheDocument();
    expect(
      screen.getByText("موقوفة افتراضيًا ويمكن تفعيلها لكل مسوق"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("مخفية افتراضيًا لحماية الخصوصية"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("مطلوب رفع صورة البطاقة قبل إرسال الطلب"),
    ).toBeInTheDocument();
    expect(screen.getByText("خلال 4 أيام من اعتماد الطلب")).toBeInTheDocument();
  });

  test("submits the public affiliate registration as FormData when an identity document is required", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "company-1",
          name: "Demo Store",
          slug: "demo-store",
          affiliateProgram: {
            isActive: true,
            autoApproveAffiliates: false,
            defaultMinPayout: 180,
            defaultCanCreateOrdersForOthers: false,
            defaultCanViewCustomerData: false,
            requireIdentityDocument: true,
            identityDocumentLabel: "صورة البطاقة",
            payoutSlaDays: 4,
            termsAndConditions: "",
          },
        },
      },
    });
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          token: "token-1",
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
      await screen.findByRole("heading", {
        name: /تسجيل كمسوق لدى Demo Store/i,
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("الاسم الأول"), {
      target: { value: "Ali" },
    });
    fireEvent.change(screen.getByLabelText("اسم العائلة"), {
      target: { value: "Seller" },
    });
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "ali@example.com" },
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("الهاتف (اختياري)"), {
      target: { value: "01000000000" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "INSTAPAY" },
    });
    fireEvent.change(screen.getByLabelText("رقم المحفظة"), {
      target: { value: "01000000000" },
    });

    const documentFile = new File(["doc"], "id.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("صورة البطاقة"), {
      target: { files: [documentFile] },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: "تسجيل كمسوق" }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    const submittedFormData = mockPost.mock.calls[0][1] as FormData;
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get("companySlug")).toBe("demo-store");
    expect(submittedFormData.get("email")).toBe("ali@example.com");
    expect(submittedFormData.get("identityDocument")).toBe(documentFile);
  });
});
