import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

describe("sidebar education labels & gating", () => {
  const dummyT = (key: string) => {
    const map: Record<string, string> = {
      "sidebar.marketingSection": "التسويق والإعلانات",
      "sidebar.educationModule": "النظام التعليمي",
      "sidebar.educationTeachers": "المدرسين",
      "sidebar.educationTeacherSchedule": "جدول المدرسين",
      "sidebar.educationTeacherPayments": "مرتبات المدرسين",
    };
    return map[key] || key;
  };

  const makeOwner = (activeApps: string[]) => ({
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps,
    },
  });

  it("uses Teachers defaults when no custom sidebar settings are saved", () => {
    const config = getSidebarConfig(dummyT as any, makeOwner(["education-app"]));
    const eduSection = config.find((s) => s.id === "education");
    expect(eduSection).toBeDefined();
    expect(eduSection?.hidden).toBe(false);

    const teachersItem = eduSection?.items.find((i) => i.itemId === "education-teachers");
    const scheduleItem = eduSection?.items.find((i) => i.itemId === "education-teacher-schedule");
    const paymentsItem = eduSection?.items.find((i) => i.itemId === "education-teacher-payments");

    expect(teachersItem?.label).toBe("المدرسين");
    expect(scheduleItem?.label).toBe("جدول المدرسين");
    expect(paymentsItem?.label).toBe("مرتبات المدرسين");
  });

  it("applies per-company custom label via itemId without affecting other companies", () => {
    const companyASettings = [
      { key: "education", order: 10, visible: true, labelAr: "النظام التعليمي" },
      { key: "education-teachers", order: 0, visible: true, labelAr: "المدربين", labelEn: "Trainers" },
      { key: "education-teacher-schedule", order: 1, visible: true, labelAr: "جدول المدربين", labelEn: "Trainer Schedule" },
    ];

    const configA = getSidebarConfig(dummyT as any, makeOwner(["education-app"]), companyASettings);
    const configB = getSidebarConfig(dummyT as any, makeOwner(["education-app"]), []);

    const eduA = configA.find((s) => s.id === "education");
    const eduB = configB.find((s) => s.id === "education");

    expect(eduA?.items.find((i) => i.itemId === "education-teachers")?.label).toBe("المدربين");
    expect(eduA?.items.find((i) => i.itemId === "education-teacher-schedule")?.label).toBe("جدول المدربين");
    expect(eduB?.items.find((i) => i.itemId === "education-teachers")?.label).toBe("المدرسين");
  });

  it("applies custom label via URL key", () => {
    const savedByUrl = [
      { key: "/admin/education/teachers", order: 0, visible: true, labelAr: "المعلمين", labelEn: "Educators" },
    ];

    const config = getSidebarConfig(dummyT as any, makeOwner(["education-app"]), savedByUrl);
    const eduSection = config.find((s) => s.id === "education");
    expect(eduSection?.items.find((i) => i.itemId === "education-teachers")?.label).toBe("المعلمين");
  });

  it("respects visible:false and custom order on education items", () => {
    const saved = [
      { key: "education-teachers", order: 2, visible: false, labelAr: "المدرسين" },
      { key: "education-students", order: 0, visible: true, labelAr: "الطلاب" },
      { key: "education-packages", order: 1, visible: true, labelAr: "الباقات" },
    ];

    const config = getSidebarConfig(dummyT as any, makeOwner(["education-app"]), saved);
    const eduSection = config.find((s) => s.id === "education");
    const teachersItem = eduSection?.items.find((i) => i.itemId === "education-teachers");
    expect(teachersItem?.hidden).toBe(true);

    const studentsIdx = eduSection?.items.findIndex((i) => i.itemId === "education-students") ?? -1;
    const packagesIdx = eduSection?.items.findIndex((i) => i.itemId === "education-packages") ?? -1;
    const teachersIdx = eduSection?.items.findIndex((i) => i.itemId === "education-teachers") ?? -1;

    expect(studentsIdx).toBeGreaterThanOrEqual(0);
    expect(studentsIdx).toBeLessThan(packagesIdx);
    expect(packagesIdx).toBeLessThan(teachersIdx);
  });

  it("keeps education section hidden when education-app is not installed even if saved visible:true", () => {
    const saved = [
      { key: "education", order: 10, visible: true, labelAr: "النظام التعليمي" },
      { key: "education-teachers", order: 0, visible: true, labelAr: "المدربين" },
    ];

    const config = getSidebarConfig(dummyT as any, makeOwner([]), saved);
    const eduSection = config.find((s) => s.id === "education");
    expect(eduSection?.hidden).toBe(true);
  });
});
