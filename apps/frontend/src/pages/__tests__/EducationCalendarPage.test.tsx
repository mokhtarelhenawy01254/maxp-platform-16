/* @vitest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import EducationCalendarPage from "../admin/EducationCalendarPage";

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

vi.mock("../admin/education-management/SessionModal", () => ({
  SessionModal: ({ session, onClose }: any) => (
    <div data-testid="mock-session-modal">
      <span>Modal Open: {session?.scheduledAt || "New"}</span>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

const mockTeachers = [
  { id: "tea-1", name: "م. أحمد الشناوي", phone: "01011111111", isActive: true },
  { id: "tea-2", name: "د. سارة محمود", phone: "01022222222", isActive: true },
];

const mockSubjects = [
  { id: "sub-1", name: "برمجة بايثون", isActive: true },
  { id: "sub-2", name: "تصميم واجهات UI", isActive: true },
];

const mockStudents = [
  { id: "stu-1", firstName: "زياد", lastName: "طارق", customerId: "c-1", isActive: true },
  { id: "stu-2", firstName: "مريم", lastName: "أحمد", customerId: "c-2", isActive: true },
];

const mockEnrollments = [
  {
    id: "enr-1",
    studentId: "stu-1",
    packageId: "pkg-1",
    teacherId: "tea-1",
    totalHours: 10,
    remainingHours: 8,
    amountPaid: 1000,
    paymentStatus: "PAID",
    enrollmentDate: "2026-11-01",
    isActive: true,
  },
];

const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const todayStr = `${currentYear}-${pad(currentMonth)}-${pad(now.getDate())}`;

const mockSessions = [
  {
    id: "ses-1",
    enrollmentId: "enr-1",
    studentId: "stu-1",
    teacherId: "tea-1",
    subjectId: "sub-1",
    scheduledAt: `${todayStr}T10:00:00.000Z`,
    plannedDuration: 60,
    status: "SCHEDULED",
    topic: "مقدمة الدوال المتكررة",
    student: { firstName: "زياد", lastName: "طارق" },
    teacher: { id: "tea-1", name: "م. أحمد الشناوي" },
    subject: { id: "sub-1", name: "برمجة بايثون" },
  },
  {
    id: "ses-2",
    enrollmentId: "enr-1",
    studentId: "stu-2",
    teacherId: "tea-2",
    subjectId: "sub-2",
    scheduledAt: `${todayStr}T12:00:00.000Z`,
    plannedDuration: 90,
    status: "CONFIRMED",
    topic: "أساسيات فيجما",
    student: { firstName: "مريم", lastName: "أحمد" },
    teacher: { id: "tea-2", name: "د. سارة محمود" },
    subject: { id: "sub-2", name: "تصميم واجهات UI" },
  },
  {
    id: "ses-3",
    enrollmentId: "enr-1",
    studentId: "stu-1",
    teacherId: "tea-1",
    subjectId: "sub-1",
    scheduledAt: `${todayStr}T14:00:00.000Z`,
    plannedDuration: 60,
    status: "SCHEDULED",
    topic: "قواعد البيانات",
    student: { firstName: "زياد", lastName: "طارق" },
    teacher: { id: "tea-1", name: "م. أحمد الشناوي" },
    subject: { id: "sub-1", name: "برمجة بايثون" },
  },
  {
    id: "ses-4",
    enrollmentId: "enr-1",
    studentId: "stu-2",
    teacherId: "tea-2",
    subjectId: "sub-2",
    scheduledAt: `${todayStr}T16:00:00.000Z`,
    plannedDuration: 60,
    status: "CANCELLED",
    topic: "تطبيق عملي",
    student: { firstName: "مريم", lastName: "أحمد" },
    teacher: { id: "tea-2", name: "د. سارة محمود" },
    subject: { id: "sub-2", name: "تصميم واجهات UI" },
  },
];

describe("EducationCalendarPage (Comprehensive Upgrades)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/education/teachers")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, data: mockTeachers }),
          });
        }
        if (url.includes("/education/subjects")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, data: mockSubjects }),
          });
        }
        if (url.includes("/education/students")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, data: mockStudents }),
          });
        }
        if (url.includes("/education/enrollments")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, data: mockEnrollments }),
          });
        }
        if (url.includes("/education/sessions")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, data: mockSessions }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page title, telemetry ribbons, and view switcher buttons", async () => {
    render(<EducationCalendarPage />);

    expect(screen.getByText("جدول ومواعيد الحصص الأكاديمية")).toBeDefined();
    expect(screen.getByText("شهري")).toBeDefined();
    expect(screen.getByText("أسبوعي")).toBeDefined();
    expect(screen.getByText("أجندة")).toBeDefined();
    expect(screen.getByText("حجز حصة جديدة")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("إجمالي الحصص المعروضة")).toBeDefined();
    });
  });

  it("switches view mode to 'أجندة' and displays grouped session items", async () => {
    render(<EducationCalendarPage />);

    await waitFor(() => {
      expect(screen.queryByText("جارٍ تحميل وتحديث الحصص الأكاديمية...")).toBeNull();
    });

    const agendaBtn = screen.getByText("أجندة");
    fireEvent.click(agendaBtn);

    await waitFor(() => {
      expect(screen.getByText("مقدمة الدوال المتكررة")).toBeDefined();
      expect(screen.getByText("أساسيات فيجما")).toBeDefined();
    });
  });

  it("switches view mode to 'أسبوعي' and renders week days", async () => {
    render(<EducationCalendarPage />);

    await waitFor(() => {
      expect(screen.queryByText("جارٍ تحميل وتحديث الحصص الأكاديمية...")).toBeNull();
    });

    const weekBtn = screen.getByText("أسبوعي");
    fireEvent.click(weekBtn);

    expect(screen.getByText("الأسبوع السابق")).toBeDefined();
    expect(screen.getByText("الأسبوع التالي")).toBeDefined();
  });

  it("opens Day Overview modal when '+1 المزيد' is clicked on day with >3 sessions", async () => {
    render(<EducationCalendarPage />);

    await waitFor(() => {
      expect(screen.queryByText("جارٍ تحميل وتحديث الحصص الأكاديمية...")).toBeNull();
    });

    // In mockSessions there are 4 sessions today, so '+1 المزيد' must appear!
    const moreBtn = await screen.findByText("+1 المزيد");
    expect(moreBtn).toBeDefined();

    fireEvent.click(moreBtn);

    // Modal should show Day header and all 4 sessions!
    await waitFor(() => {
      expect(screen.getByText("حجز حصة لهذا اليوم")).toBeDefined();
    });
  });

  it("filters sessions when search query is entered", async () => {
    render(<EducationCalendarPage />);

    await waitFor(() => {
      expect(screen.queryByText("جارٍ تحميل وتحديث الحصص الأكاديمية...")).toBeNull();
    });

    const searchInput = screen.getByPlaceholderText("بحث بالطالب، المهندس، المادة، الموضوع...");
    fireEvent.change(searchInput, { target: { value: "فيجما" } });

    // Switch to agenda to inspect filtered list
    fireEvent.click(screen.getByText("أجندة"));

    await waitFor(() => {
      expect(screen.getByText("أساسيات فيجما")).toBeDefined();
      expect(screen.queryByText("مقدمة الدوال المتكررة")).toBeNull();
    });
  });

  it("opens SessionModal when clicking 'حجز حصة جديدة'", async () => {
    render(<EducationCalendarPage />);

    const addBtn = screen.getByText("حجز حصة جديدة");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByTestId("mock-session-modal")).toBeDefined();
    });
  });
});