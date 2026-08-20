import React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuthSimple";
import { tokenManager } from "../../utils/tokenManager";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";

interface CustomerPortalLayoutProps {
  children: React.ReactNode;
}

const getTokenRole = (): string | null => {
  try {
    const token = tokenManager.getAccessToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
};

const navItems = [
  { path: "/account", label: "نظرة عامة", icon: LayoutDashboard },
  { path: "/account/cashback", label: "الكاش باك والمحفظة", icon: Wallet },
  { path: "/account/profile", label: "بياناتي", icon: User },
];

const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, isAuthenticated, logout } = useAuth();

  // 🔗 دخول سريع من رابط واتساب (زر "صفحة العميل"):
  // ?token= بيجي من /magic-login — بنخزنه وبعدين نعمل reload عشان الـ auth يقراه.
  const [hasMagicToken, setHasMagicToken] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get("token");
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get("token");
    if (magicToken) {
      tokenManager.setAccessToken(magicToken);
      localStorage.removeItem("user");
      setHasMagicToken(false);
      window.location.replace("/account");
    }
  }, []);

  // هوية الشركة (لوجو + اسم + لون) — من الـ token أو subdomain المتجر
  const tokenCompanyId = (() => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload?.companyId || null;
    } catch {
      return null;
    }
  })();
  const branding = useCompanyBranding(tokenCompanyId);
  const accentColor = branding.accent || "#6366f1";

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/auth/customer-register", { replace: true });
    }
  };

  if (isLoading || hasMagicToken) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-50"
      >
        <div className="text-center text-gray-500">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4">جاري فتح حسابك...</p>
        </div>
      </div>
    );
  }

  const role = getTokenRole();
  if (!isAuthenticated || role !== "CUSTOMER") {
    return <Navigate to="/auth/customer-register" replace />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50" style={{ "--auth-accent": accentColor } as React.CSSProperties}>
      {/* Mobile header */}
      <header className="border-b bg-white shadow-sm lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 hover:bg-gray-100"
            aria-label="القائمة"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link
            to="/account"
            className="flex items-center gap-2 text-lg font-bold"
            style={{ color: accentColor }}
          >
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name || "logo"} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <ShieldCheck size={20} />
            )}
            {branding.name || "حسابي"}
          </Link>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } fixed right-0 top-0 z-40 h-screen w-64 border-l bg-white shadow-lg lg:sticky lg:block`}
        >
          <div className="border-b p-6">
            {branding.name && (
              <div className="mb-3 flex items-center gap-2">
                {branding.logo ? (
                  <img
                    src={branding.logo}
                    alt={branding.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {branding.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-bold" style={{ color: accentColor }}>
                  {branding.name}
                </span>
              </div>
            )}
            <Link
              to="/account"
              className="mb-1 flex items-center gap-2 text-xl font-bold"
              style={{ color: accentColor }}
            >
              <ShieldCheck size={22} />
              حسابي
            </Link>
          </div>

          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <LogOut size={20} />
              تسجيل خروج
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-h-screen flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default CustomerPortalLayout;
