import { describe, expect, it } from "vitest";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import { getSidebarConfig } from "../sidebar";
import type { EducationSettingsData } from "../../types/layout";

describe("sidebar dynamic education-settings integration", () => {
  const arT = (key: string) => {
    const map: Record<string, string> = {
      "sidebar.marketingSection": "التسويق والإعلانات",
      "sidebar.educationModule": "النظام التعليمي",
      "sidebar.educationDashboard": "لوحة التحكم",
      "sidebar.educationSubjects": "المواد الدراسية",
      "sidebar.educationPackages": "الباقات",
      "sidebar.educationGroups": "المجموعات الدراسية (الجروبات)",
      "sidebar.educationStudents": "الطلاب",
      "sidebar.educationTeachers": "المدرسين",
      "sidebar.educationEnrollments": "التسجيلات",
      "sidebar.educationTeacherSchedule": "جدول المدرسين",
      "sidebar.educationTeacherPayments": "مرتبات المدرسين",
      "sidebar.educationSessions": "الحصص",
      "sidebar.educationCalendar": "التقويم التعليمي",
      "sidebar.educationFunnel": "الإشعارات والفانل",
      "sidebar.educationSettings": "إعدادات وتخصيص السكاشن",
      "sidebar.educationLogs": "سجلات النظام التعليمي",
    };
    return map[key] || key;
  };

  const enT = (key: string) => {
    const map: Record<string, string> = {
      "sidebar.marketingSection": "Marketing & Advertising",
      "sidebar.educationModule": "Education System",
      "sidebar.educationTeachers": "Teachers",
      "sidebar.educationTeacherSchedule": "Teachers Schedule",
      "sidebar.educationTeacherPayments": "Teachers Payments",
      "sidebar.educationStudents": "Students",
    };
    return map[key] || key;
  };

  const makeUser = (role = "OWNER", activeApps: string[] = ["education-app"], permissions: string[] = []) => ({
    role,
    permissions,
    company: {
      isCurrent: true,
      activeApps,
      apps: activeApps.includes("education-app")
        ? [{ appId: "education-app", slug: "education-app", customName: "أكاديمية عربية" }]
        : [],
    },
  });

  it("builds title, labelAr/labelEn, visible, order, and iconName from educationSettings cleanly", () => {
    const eduSettings: EducationSettingsData = {
      systemTitle: "أكاديمية النجوم",
      systemTitleEn: "Stars Academy",
      educationMode: "ACADEMIC",
      enableSubjects: true,
      tabs: [
        { id: "teachers", key: "/admin/education/teachers", labelAr: "المدربين", labelEn: "Coaches", visible: true, order: 0, iconName: "Users" },
        { id: "students", key: "/admin/education/students", labelAr: "المتدربين", labelEn: "Trainees", visible: true, order: 1, iconName: "GraduationCap" },
        { id: "teacher-payments", key: "/admin/education/teacher-payments", labelAr: "مستحقات المدربين", labelEn: "Coach Payroll", visible: false, order: 2 },
        { id: "subjects", key: "/admin/education/subjects", labelAr: "المسارات", labelEn: "Tracks", visible: true, order: 3, iconName: "BookOpen" },
      ],
    };

    const configAr = getSidebarConfig(arT as any, makeUser("OWNER"), undefined, undefined, undefined, eduSettings);
    const eduAr = configAr.find((s) => s.id === "education");
    expect(eduAr?.title).toBe("أكاديمية النجوم");
    expect(eduAr?.hidden).toBe(false);
    expect(eduAr?.items[0].itemId).toBe("education-teachers");
    expect(eduAr?.items[0].label).toBe("المدربين");
    expect(eduAr?.items[0].icon).toBe(Users);
    expect(eduAr?.items[1].itemId).toBe("education-students");
    expect(eduAr?.items[1].icon).toBe(GraduationCap);
    expect(eduAr?.items.find((i) => i.itemId === "education-teacher-payments")?.hidden).toBe(true);
    expect(eduAr?.items.find((i) => i.itemId === "education-subjects")?.hidden).toBe(false);
    expect(eduAr?.items.find((i) => i.itemId === "education-subjects")?.icon).toBe(BookOpen);

    // English UI must keep systemTitleEn and NOT be overwritten by Arabic companyApp.customName
    const configEn = getSidebarConfig(enT as any, makeUser("OWNER"), undefined, undefined, undefined, eduSettings);
    const eduEn = configEn.find((s) => s.id === "education");
    expect(eduEn?.title).toBe("Stars Academy");
    expect(eduEn?.items[0].label).toBe("Coaches");
  });

  it("isolates Company A customizations from uncustomized Company B and hides admin items for non-admin roles", () => {
    const companyAEdu: EducationSettingsData = {
      systemTitle: "مركز التميز",
      tabs: [{ id: "teachers", key: "/admin/education/teachers", labelAr: "المحاضرين", labelEn: "Lecturers", visible: true, order: 0 }],
    };

    const configA = getSidebarConfig(arT as any, makeUser("OWNER"), undefined, undefined, undefined, companyAEdu);
    const configB = getSidebarConfig(arT as any, makeUser("OWNER"), undefined, undefined, undefined, null);

    expect(configA.find((s) => s.id === "education")?.items.find((i) => i.itemId === "education-teachers")?.label).toBe("المحاضرين");
    expect(configB.find((s) => s.id === "education")?.items.find((i) => i.itemId === "education-teachers")?.label).toBe("المدرسين");

    // Non-admin employee without settings permission cannot see education-settings or education-logs
    const empConfig = getSidebarConfig(arT as any, makeUser("EMPLOYEE", ["education-app"], []), undefined, undefined, undefined, companyAEdu);
    const eduEmp = empConfig.find((s) => s.id === "education");
    expect(eduEmp?.items.find((i) => i.itemId === "education-settings")?.hidden).toBe(true);
    expect(eduEmp?.items.find((i) => i.itemId === "education-logs")?.hidden).toBe(true);
  });

  it("hides entire education section when company lacks education-app", () => {
    const eduSettings: EducationSettingsData = {
      systemTitle: "مركز التميز",
      tabs: [{ id: "teachers", key: "/admin/education/teachers", labelAr: "المحاضرين", visible: true, order: 0 }],
    };

    const configNoApp = getSidebarConfig(arT as any, makeUser("OWNER", ["academy-app"]), undefined, undefined, undefined, eduSettings);
    expect(configNoApp.find((s) => s.id === "education")?.hidden).toBe(true);
  });
});
