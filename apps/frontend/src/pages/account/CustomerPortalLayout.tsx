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
  ShoppingBag,
  FileText,
  Tag,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { tokenManager } from "../../utils/tokenManager";
import { resolveBrandingLogoUrl, useCompanyBranding } from "../../hooks/useCompanyBranding";
import { apiClient } from "../../services/apiClient";
import { PortalInstallBanner } from "../../components/common/PortalInstallBanner";
import { PortalPushToggle } from "../../components/common/PortalPushToggle";

interface CustomerPortalLayoutProps {
  children: React.ReactNode;
}

const getTokenPayload = (): Record<string, unknown> | null => {
  try {
    const token = tokenManager.getAccessToken();
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1] || "")) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const navItems = [
  { path: "/account", label: "نظرة عامة", icon: LayoutDashboard },
  { path: "/account/cashback", label: "الكاش باك والمحفظة", icon: Wallet },
  { path: "/account/profile", label: "بياناتي", icon: User },
];

const wholesaleItems = [
  { path: "/wholesale-portal/orders", label: "طلباتي (الجملة)", icon: ShoppingBag },
  { path: "/wholesale-portal/statement", label: "رصيدي وكشف الحساب", icon: FileText },
  { path: "/wholesale-portal/prices", label: "أسعاري وقائمتي", icon: Tag },
  { path: "/wholesale-portal/new-order", label: "طلب جملة جديد", icon: PlusCircle },
];

const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, isAuthenticated, logout } = useAuth();

  // دخول سريع من رابط واتساب (زر "صفحة العميل"): ?token= ياتي من /magic-login
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

  const payload = getTokenPayload();
  const tokenCompanyId = typeof payload?.["companyId"] === "string" ? payload["companyId"] : null;
  const role = typeof payload?.["role"] === "string" ? payload["role"] : null;

  const branding = useCompanyBranding(tokenCompanyId);
  const accentColor = branding.accent || "#6366f1";
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(branding.logo) : null;
  const displayBrandName = branding.name || "حسابي";

  React.useEffect(() => {
    setLogoError(false);
  }, [branding.logo]);

  const [wholesaleProfile, setWholesaleProfile] = React.useState<{
    isActive: boolean;
    availableCredit: number;
  } | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .get<{ success?: boolean; data?: { isActive: boolean; availableCredit: number } }>(
          "/wholesale-portal/me",
        )
        .then((res) => {
          if (res.data?.success && res.data?.data?.isActive) setWholesaleProfile(res.data.data);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/auth/customer-register", { replace: true });
    }
  };

  if (isLoading || hasMagicToken) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4">جاري فتح حسابك…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role !== "CUSTOMER") {
    return <Navigate to="/auth/customer-register" replace />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50" style={{ "--auth-accent": accentColor, "--portal-primary": accentColor } as React.CSSProperties}>
      <div className="flex">
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          } fixed right-0 top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-l bg-white shadow-lg transition-transform duration-200 lg:sticky`}
        >
          <div className="border-b p-5">
            {branding.name ? (
              <div className="mb-3 flex items-center gap-2 min-w-0">
                {resolvedLogo ? (
                  <img src={resolvedLogo} alt={branding.name} onError={() => setLogoError(true)} className="h-9 w-9 shrink-0 rounded-full object-cover border border-gray-100" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-bold" style={{ backgroundColor: accentColor }}>
                    {branding.name.charAt(0)}
                  </div>
                )}
                <span className="truncate text-sm font-bold" style={{ color: accentColor }}>{branding.name}</span>
              </div>
            ) : null}
            <Link to="/account" className="flex items-center gap-2 text-lg font-bold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ color: accentColor }}>
              <ShieldCheck size={22} className="shrink-0" />
              <span className="truncate">حسابي</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== "/account" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={isActive ? { backgroundColor: `${accentColor}14`, color: accentColor } : undefined}
                  className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive ? "font-semibold" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {wholesaleProfile?.isActive ? (
              <div className="pt-3 mt-3 border-t border-gray-100">
                <div className="px-3 mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-indigo-600 truncate">بوابة الموزع</span>
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold shrink-0">معتمد</span>
                </div>
                {wholesaleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isActive ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </nav>

          <div className="border-t p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <LogOut size={18} className="shrink-0" />
              <span className="truncate">تسجيل خروج</span>
            </button>
          </div>
        </aside>

        {sidebarOpen ? <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur-sm shadow-2xs">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  aria-label="القائمة"
                >
                  {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <Link to="/account" className="flex min-w-0 items-center gap-2 text-base font-bold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ color: accentColor }}>
                  {resolvedLogo ? (
                    <img src={resolvedLogo} alt={displayBrandName} onError={() => setLogoError(true)} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                  ) : (
                    <ShieldCheck size={20} className="shrink-0" />
                  )}
                  <span className="truncate">{displayBrandName}</span>
                </Link>
              </div>
              <div className="hidden lg:flex items-center gap-2 min-w-0 text-sm font-semibold text-gray-800">
                <span className="truncate">{displayBrandName}</span>
              </div>
              <PortalPushToggle portal="customer" accentColor={accentColor} />
            </div>
          </header>

          <main className="min-h-screen flex-1 p-3 sm:p-6 lg:p-8">
            <PortalInstallBanner
              portal="customer"
              companyId={branding.companyId || tokenCompanyId}
              companyName={displayBrandName}
              companyLogo={branding.logo}
              accentColor={accentColor}
              className="mb-4"
            />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalLayout;
