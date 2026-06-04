import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HiringPipelineSection from "../sections/HiringPipelineSection";

const mockCompanyAwareGet = jest.fn();
const mockCompanyAwareDelete = jest.fn();
const mockCompanyAwarePut = jest.fn();

jest.mock("../../../../services/companyAwareApi", () => ({
  companyAwareApi: {
    get: (...args: any[]) => mockCompanyAwareGet(...args),
    delete: (...args: any[]) => mockCompanyAwareDelete(...args),
    put: (...args: any[]) => mockCompanyAwarePut(...args),
  },
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const buildApplicant = (index: number) => ({
  id: `applicant-${index}`,
  name: `مرشح ${index}`,
  email: null,
  phone: `010000000${index}`,
  status: "NEW",
  createdAt: "2026-05-17T08:00:00.000Z",
  job: { title: "Call center - Data Entery" },
});

describe("HiringPipelineSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompanyAwareDelete.mockResolvedValue({
      data: { success: true, message: "تم حذف المتقدم بنجاح" },
    });
    mockCompanyAwareGet.mockImplementation((url: string) => {
      if (url === "/hr/recruitment/pipeline-stats") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { id: "NEW", name: "جديد", count: 12, color: "blue" },
              { id: "REVIEWING", name: "قيد المراجعة", count: 0, color: "amber" },
              {
                id: "INTERVIEW_SCHEDULED",
                name: "مقابلة مجدولة",
                count: 0,
                color: "purple",
              },
              { id: "INTERVIEWED", name: "تمت المقابلة", count: 0, color: "indigo" },
              { id: "OFFERED", name: "تم العرض", count: 0, color: "green" },
              { id: "HIRED", name: "تم التوظيف", count: 0, color: "emerald" },
              { id: "REJECTED", name: "مرفوض", count: 0, color: "red" },
            ],
          },
        });
      }

      if (url === "/hr/recruitment/applicants") {
        return Promise.resolve({
          data: {
            success: true,
            data: Array.from({ length: 12 }, (_, index) =>
              buildApplicant(index + 1),
            ),
          },
        });
      }

      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("loads all applicants for the selected pipeline stage and deletes one", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<HiringPipelineSection />);

    expect(await screen.findByText("مرشح 12")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockCompanyAwareGet).toHaveBeenCalledWith(
        "/hr/recruitment/applicants",
        { params: { status: "NEW", limit: "all" } },
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "حذف مرشح 1" }));

    await waitFor(() => {
      expect(mockCompanyAwareDelete).toHaveBeenCalledWith(
        "/hr/recruitment/applicants/applicant-1",
      );
    });
  });
});
