/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import EducationManagementPage from "../admin/EducationManagementPage";

vi.mock("../../utils/tokenManager", () => ({
  default: {
    createAuthHeaders: (h?: any) => ({ Authorization: "Bearer mock-token", ...h }),
    getAccessToken: () => "mock-token",
  },
  tokenManager: {
    createAuthHeaders: (h?: any) => ({ Authorization: "Bearer mock-token", ...h }),
    getAccessToken: () => "mock-token",
  },
}));

const mockSubjects = [
  { id: "sub-1", name: "الرياضيات المتقدمة", description: "شرح تفصيلي للمنهج", isActive: true },
  { id: "sub-2", name: "الفيزياء الحديثة", description: "تجارب ونظريات", isActive: true },
];

const mockPackages = [
  {
    id: "pkg-1",
    subjectId: "sub-1",
    name: "باقة التفوق",
    hoursCount: 10,
    sessionDuration: 60,
    price: 1500,
    isActive: true,
    subject: { id: "sub-1", name: "الرياضيات المتقدمة" },
  },
];

const mockStudents = [
  {
    id: "stu-1",
    customerId: "cust-1",
    firstName: "عمر",
    lastName: "مختار",
    phone: "01012345678",
    gender: "male",
    grade: "الثانوية العامة",
    isActive: true,
    customer: { id: "cust-1", firstName: "مختار", lastName: "الحناوي", phone: "01000000000" },
  },
];

const mockTeachers = [
  {
    id: "tea-1",
    name: "أستاذ مصطفى",
    phone: "01122334455",
    email: "mostafa@example.com",
    isActive: true,
    subjectRates: [{ id: "sr-1", subjectId: "sub-1", hourlyRate: 200, subject: { id: "sub-1", name: "الرياضيات المتقدمة" } }],
  },
];

const mockEnrollments = [
  {
    id: "enr-1",
    studentId: "stu-1",
    packageId: "pkg-1",
    teacherId: "tea-1",
    totalHours: 10,
    remainingHours: 6,
    amountPaid: 1500,
    paymentStatus: "PAID",
    enrollmentDate: "2026-10-01",
    isActive: true,
    student: { id: "stu-1", firstName: "عمر", lastName: "مختار" },
    package: { id: "pkg-1", name: "باقة التفوق", subject: { id: "sub-1", name: "الرياضيات المتقدمة" } },
    teacher: { id: "tea-1", name: "أستاذ مصطفى" },
  },
];

const mockSessions = [
  {
    id: "ses-1",
    enrollmentId: "enr-1",
    studentId: "stu-1",
    teacherId: "tea-1",
    subjectId: "sub-1",
    scheduledAt: "2026-10-30T14:00:00Z",
    plannedDuration: 60,
    status: "SCHEDULED",
    createdAt: "2026-10-25T00:00:00Z",
    student: { id: "stu-1", firstName: "عمر", lastName: "مختار" },
    teacher: { id: "tea-1", name: "أستاذ مصطفى" },
    subject: { id: "sub-1", name: "الرياضيات المتقدمة" },
    enrollment: { id: "enr-1", remainingHours: 6 },
  },
];

const renderWithRouter = (initialEntry = "/admin/education") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/education/*" element={<EducationManagementPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("EducationManagementPage (Batch 483)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/education/subjects")) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: mockSubjects }),
          });
        }
        if (url.includes("/education/packages")) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: mockPackages }),
          });
        }
        if (url.includes("/education/students")) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: mockStudents }),
          });
        }
        if (url.includes("/education/teachers")) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: mockTeachers }),
          });
        }
        if (url.includes("/education/enrollments")) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: mockEnrollments }),
          });
        }
        if (url.includes("/education/sessions")) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: mockSessions }),
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders page header and sector badge without redundant tabs bar", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("إدارة المراكز والأكاديميات التعليمية")).toBeTruthy();
    });

    expect(screen.getByText("القطاع التعليمي")).toBeTruthy();
    expect(screen.getByRole("button", { name: /إعدادات النظام/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^لوحة التحكم$/ })).toBeNull();
  });

  it("renders dashboard statistics and quick widgets", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("المواد الدراسية")).toBeTruthy();
    });

    expect(screen.getByText("الباقات المتاحة")).toBeTruthy();
    expect(screen.getByText("الطلاب المسجلين")).toBeTruthy();
    expect(screen.getByText(/(?:المدرسين|المهندسين|Instructors) المتاحين/)).toBeTruthy();
    expect(screen.getByText("أحدث الحصص المجدولة")).toBeTruthy();
    expect(screen.getByText("التسجيلات النشطة")).toBeTruthy();
  });

  it("switches to subjects tab and displays subject list and add modal", async () => {
    renderWithRouter("/admin/education/subjects");

    await waitFor(() => {
      expect(screen.getByText("إدارة المواد الأكاديمية")).toBeTruthy();
    });

    expect(screen.getAllByText("الرياضيات المتقدمة").length).toBeGreaterThan(0);
    expect(screen.getAllByText("الفيزياء الحديثة").length).toBeGreaterThan(0);

    const addBtn = screen.getByRole("button", { name: /إضافة مادة/ });
    fireEvent.click(addBtn);

    expect(screen.getByText("إضافة مادة جديدة")).toBeTruthy();
    expect(screen.getByText("اسم المادة *")).toBeTruthy();
  });

  it("switches to packages tab and displays package list and add modal", async () => {
    renderWithRouter("/admin/education/packages");

    await waitFor(() => {
      expect(screen.getByText("إدارة باقات الحصص")).toBeTruthy();
    });

    expect(screen.getByText("باقة التفوق")).toBeTruthy();
    expect(screen.getByText("10 ساعة")).toBeTruthy();

    const addBtn = screen.getByRole("button", { name: /إضافة باقة/ });
    fireEvent.click(addBtn);

    expect(screen.getByText("إضافة باقة جديدة")).toBeTruthy();
    expect(screen.getByText("اسم الباقة *")).toBeTruthy();
  });

  it("switches to students tab and displays student record", async () => {
    renderWithRouter("/admin/education/students");

    await waitFor(() => {
      expect(screen.getByText("إدارة الطلاب")).toBeTruthy();
    });

    expect(screen.getByText("عمر مختار")).toBeTruthy();
    expect(screen.getByText("الثانوية العامة")).toBeTruthy();
    expect(screen.getByText(/01012345678/)).toBeTruthy();
  });

  it("switches to teachers tab and displays teacher record", async () => {
    renderWithRouter("/admin/education/teachers");

    await waitFor(() => {
      expect(screen.getByText(/إدارة (?:المدرسين|المهندسين) والكوادر التعليمية/)).toBeTruthy();
    });

    expect(screen.getByText("أستاذ مصطفى")).toBeTruthy();
    expect(screen.getByText(/200 ج\.م\/س/)).toBeTruthy();
  });
});
