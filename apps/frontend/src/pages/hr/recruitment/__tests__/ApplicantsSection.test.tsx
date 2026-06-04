import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ApplicantsSection from "../sections/ApplicantsSection";

const mockCompanyAwareGet = jest.fn();
const mockCompanyAwareDelete = jest.fn();

jest.mock("../../../../services/companyAwareApi", () => ({
  companyAwareApi: {
    get: (...args: any[]) => mockCompanyAwareGet(...args),
    delete: (...args: any[]) => mockCompanyAwareDelete(...args),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ApplicantsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompanyAwareDelete.mockResolvedValue({
      data: { success: true, message: "تم حذف المتقدم بنجاح" },
    });
    mockCompanyAwareGet.mockImplementation((url: string) => {
      if (url === "/hr/recruitment/applicants") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "applicant-1",
                name: "مرشح من الاستمارة",
                email: null,
                phone: null,
                jobId: "job-1",
                job: { title: "مندوب مبيعات" },
                status: "NEW",
                experience: null,
                education: null,
                skills: null,
                createdAt: "2026-05-17T08:00:00.000Z",
              },
            ],
          },
        });
      }

      if (url === "/hr/recruitment/jobs") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "job-1", title: "مندوب مبيعات" }],
          },
        });
      }

      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("opens applicant details for form-created applicants with missing optional fields", async () => {
    render(<ApplicantsSection />);

    expect(await screen.findByText("مرشح من الاستمارة")).toBeInTheDocument();
    expect(screen.getByText("مندوب مبيعات")).toBeInTheDocument();
    expect(screen.getByText("بدون بريد")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /عرض التفاصيل/i }));

    await waitFor(() => {
      expect(screen.getByText("إغلاق")).toBeInTheDocument();
    });
    expect(screen.getAllByText("لا توجد مهارات مسجلة").length).toBeGreaterThan(0);
  });

  test("deletes an applicant from the applicants list", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<ApplicantsSection />);

    expect(await screen.findByText("مرشح من الاستمارة")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "حذف مرشح من الاستمارة" }),
    );

    await waitFor(() => {
      expect(mockCompanyAwareDelete).toHaveBeenCalledWith(
        "/hr/recruitment/applicants/applicant-1",
      );
    });
  });
});
