import React from "react";
import { Link } from "react-router-dom";
import {
  TruckIcon,
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { useShippingCompaniesData } from "./hooks/useShippingCompaniesData";
import { ShippingCompanyCardsView } from "./components/ShippingCompanyCardsView";
import { ShippingCompanyTableView } from "./components/ShippingCompanyTableView";
import { ShippingCompanyModal } from "./components/ShippingCompanyModal";

const ShippingCompanies: React.FC = () => {
  const {
    displayedCompanies,
    loading,
    viewMode,
    setViewMode,
    togglingId,
    testingConnection,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    modeFilter,
    setModeFilter,
    showModal,
    setShowModal,
    editingCompany,
    showAdvanced,
    setShowAdvanced,
    testedProfile,
    formData,
    setFormData,
    stats,
    fetchCompanies,
    handleToggleActive,
    handleTestConnection,
    handleOpenSettings,
    handleOpenNewModal,
    handleSubmit,
    handleDelete,
    copyWebhookUrl,
  } = useShippingCompaniesData();

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      {/* Unified Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-foreground">
            <TruckIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              شركات الشحن والربط البرمجي
            </h1>
            <p className="text-xs text-muted-foreground">
              إدارة شركات الشحن، مفاتيح الربط البرمجي (API)، وتوليد البوالص آلياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/orders/settlements"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
          >
            <span>تسويات الشحن</span>
          </Link>
          <button
            type="button"
            onClick={fetchCompanies}
            disabled={loading}
            className="p-2 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
            title="تحديث القائمة"
          >
            <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition active:scale-[0.98] shadow-2xs"
          >
            <PlusIcon className="size-4" />
            <span>إضافة شركة شحن</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl border border-border/70 dark:border-border/50 bg-card/60 backdrop-blur-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">إجمالي الشركات</p>
            <p className="text-lg font-bold font-mono tracking-tight text-foreground tabular-nums">
              {stats.total}
            </p>
          </div>
          <span className="size-2 rounded-full bg-primary/40" />
        </div>

        <div className="p-3 rounded-xl border border-border/70 dark:border-border/50 bg-card/60 backdrop-blur-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">الشركات المفعلة</p>
            <p className="text-lg font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.active}
            </p>
          </div>
          <span className="size-2 rounded-full bg-emerald-500" />
        </div>

        <div className="p-3 rounded-xl border border-border/70 dark:border-border/50 bg-card/60 backdrop-blur-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">ربط مباشر (LIVE API)</p>
            <p className="text-lg font-bold font-mono tracking-tight text-primary tabular-nums">
              {stats.live}
            </p>
          </div>
          <span className="size-2 rounded-full bg-primary" />
        </div>

        <div className="p-3 rounded-xl border border-border/70 dark:border-border/50 bg-card/60 backdrop-blur-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">شحن يدوي / مناديب</p>
            <p className="text-lg font-bold font-mono tracking-tight text-muted-foreground tabular-nums">
              {stats.manual}
            </p>
          </div>
          <span className="size-2 rounded-full bg-muted-foreground/40" />
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card/40 backdrop-blur-xs shadow-2xs overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-3 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم، الكود، أو المعرف..."
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-background/80 border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-background/80 border border-border/80 rounded-lg text-foreground focus:outline-hidden"
              >
                <option value="all">كل الحالات</option>
                <option value="active">المفعلة فقط</option>
                <option value="inactive">المتوقفة</option>
              </select>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-background/80 border border-border/80 rounded-lg text-foreground focus:outline-hidden"
              >
                <option value="ALL">كل طرق الربط</option>
                <option value="LIVE">مباشر (LIVE)</option>
                <option value="DEMO">تجريبي (DEMO)</option>
                <option value="MANUAL">يدوي (MANUAL)</option>
              </select>

              {/* View Switcher */}
              <div className="flex items-center border border-border/80 rounded-lg overflow-hidden bg-background/80">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 transition ${viewMode === "cards" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="عرض بطاقات"
                >
                  <Squares2X2Icon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 transition ${viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="عرض جدول"
                >
                  <ListBulletIcon className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
            <p>جاري جلب شركات الشحن وإعدادات الربط...</p>
          </div>
        ) : displayedCompanies.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <TruckIcon className="size-10 text-muted-foreground/30 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">
              لا توجد شركات شحن مسجلة
            </h3>
            <p className="text-xs text-muted-foreground">
              ابدأ بإضافة أول شركة شحن أو تفعيل شركات الشحن المعتمدة
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 shadow-2xs active:scale-[0.98]"
              >
                إضافة شركة شحن الآن
              </button>
            </div>
          </div>
        ) : viewMode === "cards" ? (
          <ShippingCompanyCardsView
            displayedCompanies={displayedCompanies}
            togglingId={togglingId}
            testingConnection={testingConnection}
            handleToggleActive={handleToggleActive}
            handleOpenSettings={handleOpenSettings}
            handleTestConnection={handleTestConnection}
            handleDelete={handleDelete}
          />
        ) : (
          <ShippingCompanyTableView
            displayedCompanies={displayedCompanies}
            togglingId={togglingId}
            handleToggleActive={handleToggleActive}
            handleOpenSettings={handleOpenSettings}
            handleDelete={handleDelete}
          />
        )}
      </div>

      {/* Settings / Configure Drawer Modal */}
      <ShippingCompanyModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingCompany={editingCompany}
        formData={formData}
        setFormData={setFormData}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        testedProfile={testedProfile}
        testingConnection={testingConnection}
        handleTestConnection={handleTestConnection}
        handleSubmit={handleSubmit}
        copyWebhookUrl={copyWebhookUrl}
      />
    </div>
  );
};

export default ShippingCompanies;
