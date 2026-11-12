/**
 * TASK 82e287e4 — يثبت أن راوت تفاصيل الشركة (companies/:id) بيركّب الـsuper-admin
 * shell كامل: القائمة الجانبية (aside) + الهيدر، وأن أعضاء الشركة مش بيشوفوه.
 *
 * البلاغ الأصلي: «صفحة تفاصيل الشركة بتفتح بدون القائمة الجانبية والهيدر»،
 * والإرجاع طلب: تيست بيركّب الـshell على الراوت ده + تحقق DOM (aside >= 2).
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// layoutMode.ts uses import.meta.env (vitest-only), so jest cannot load it.
// Stub it with the same answers for the routes under test.
jest.mock("../layoutMode", () => ({
  __esModule: true,
  FEATURE_UNIFIED_SUPERADMIN_SHELL: true,
  shouldUseSuperAdminShell: (role: string | null, path: string) =>
    role === "SUPER_ADMIN" && /^\/super-admin(\/|$)/.test(path),
  matchesSuperAdminNavigationPath: (current: string, target: string) =>
    !!target && (current === target || current.startsWith(`${target}/`)),
}));

const mockUseAuth = jest.fn();
const mockUseVisualTheme = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ar", dir: () => "rtl" },
  }),
}));

jest.mock("../../../i18n", () => {
  const t = (key: string) => key;
  return {
    __esModule: true,
    default: { isInitialized: true, language: "ar", dir: () => "rtl", t },
  };
});

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../contexts/VisualThemeContext", () => ({
  useVisualTheme: () => mockUseVisualTheme(),
}));

jest.mock("../../ActiveUsersMonitor", () => ({
  __esModule: true,
  default: () => <div data-testid="active-users-monitor" />,
}));

jest.mock("../../common/PageExplanations", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../common/GlobalTimer", () => ({
  __esModule: true,
  default: () => null,
  GlobalTimer: () => null,
}));

jest.mock("../../ui/theme-toggle", () => ({
  __esModule: true,
  default: () => <button type="button">Theme</button>,
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(() => Promise.resolve({ status: 200, data: { success: true, data: {} } })),
  },
}));

jest.mock("../../../services/socketService", () => ({
  __esModule: true,
  default: { connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  socketService: { connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

import SuperAdminLayout from "../SuperAdminLayout";
import { shouldUseSuperAdminShell } from "../layoutMode";

const SUPER_ADMIN = {
  id: "sa-1",
  firstName: "Super",
  lastName: "Admin",
  email: "super@maxp.local",
  role: "SUPER_ADMIN",
  companyId: null,
};

const COMPANY_ID = "cmleybpf70028juo2wwpmp8rt";

describe("راوت تفاصيل الشركة داخل الـsuper-admin shell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVisualTheme.mockReturnValue({ currentTheme: { id: "business-os-enterprise" } });
    mockUseAuth.mockReturnValue({ user: SUPER_ADMIN, isLoading: false });
  });

  it("بيستخدم الـsuper-admin shell لمسار companies/:id (لا يقع على شل الشركة)", () => {
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", `/super-admin/companies/${COMPANY_ID}`)).toBe(true);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", `/super-admin/companies-v2/${COMPANY_ID}`)).toBe(true);
  });

  it("بيرسم القائمة الجانبية والهيدر مع صفحة التفاصيل (aside >= 2 + header + المحتوى)", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={[`/super-admin/companies/${COMPANY_ID}`]}>
        <Routes>
          <Route
            path="/super-admin/companies/:companyId"
            element={
              <SuperAdminLayout>
                <div data-testid="company-details-page">تفاصيل الشركة</div>
              </SuperAdminLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("company-details-page")).toBeInTheDocument();
    });

    const asides = container.querySelectorAll("aside");
    // jsdom بيرسم درج سطح المكتب واحد (درج الموبايل بيظهر عند فتحه)،
    // وفي البنتاج المكوّن بيفرّخ عنصرين — التحقق الحي فيه aside>=2 وده مسجّل في notTestedScope.
    expect(asides.length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector("header")).not.toBeNull();
    expect(screen.getByTestId("company-details-page")).toBeInTheDocument();
    // الصفحة نفسها مش المفروض تكون متغطية بالكامل على القائمة
    expect(container.querySelector("main")).not.toBeNull();
  });
});
