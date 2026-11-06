import React, { useEffect } from "react";
import CreateCompanyModal from "../../components/CreateCompanyModal";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  useMyCompaniesDashboardController,
  MyCompaniesHeader,
  MyCompaniesOverviewTab,
  MyCompaniesAttendanceTab,
  MyCompaniesReportsTab,
  MyCompaniesOrdersTab,
  DashboardSkeleton,
  DashboardTab,
} from "./my-companies-dashboard/index";

interface MyCompaniesDashboardProps {
  defaultTab?: DashboardTab;
}

const MyCompaniesDashboard: React.FC<MyCompaniesDashboardProps> = ({ defaultTab }) => {
  const { user } = useAuth();
  const {
    activeTab,
    setActiveTab,
    isLoading,
    isExporting,
    dashboardData,
    error,
    isCreateModalOpen,
    setIsCreateModalOpen,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    fetchDashboard,
    handleExport,
    switchToCompany,
    handleSetDefaultCompany,
    goToReports,
  } = useMyCompaniesDashboardController();

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, setActiveTab]);

  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {error}
      </div>
    );
  }

  const overview = dashboardData?.overview;
  const companies = dashboardData?.byCompany || [];
  const userCompaniesCount = user?.companies?.length ?? companies.length ?? 0;
  const hasMultipleCompanies = userCompaniesCount > 1;

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      <MyCompaniesHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onExport={handleExport}
        isExporting={isExporting}
        hasMultipleCompanies={hasMultipleCompanies}
      />

      {activeTab === "overview" && overview && (
        <MyCompaniesOverviewTab
          overview={overview}
          companies={companies}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onSwitchCompany={switchToCompany}
          onSetDefaultCompany={handleSetDefaultCompany}
        />
      )}

      {activeTab === "attendance" && (
        <MyCompaniesAttendanceTab
          companies={companies}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      )}

      {activeTab === "reports" && (
        <MyCompaniesReportsTab onGoToReports={goToReports} />
      )}

      {activeTab === "orders" && hasMultipleCompanies && (
        <MyCompaniesOrdersTab companies={companies} />
      )}

      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchDashboard({ background: true });
        }}
      />
    </div>
  );
};

export default MyCompaniesDashboard;
