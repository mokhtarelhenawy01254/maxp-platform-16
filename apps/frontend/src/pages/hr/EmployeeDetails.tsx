import React from "react";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  useEmployeeDetailsController,
  EmployeeProfileHeader,
  EmployeeProfileHeroCard,
  EmployeeOverviewTab,
  EmployeePersonalTab,
  EmployeeDocumentsTab,
  EmployeeSalaryTab,
  EmployeePerformanceTab,
} from "./employee-details/index";

const EmployeeDetails: React.FC = () => {
  const { t } = useTranslation();
  const {
    id,
    loading,
    employee,
    activeTab,
    setActiveTab,
    navigate,
  } = useEmployeeDetailsController();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <User className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-xl">الموظف غير موجود</p>
        <Button variant="link" onClick={() => navigate("/hr/employees")}>
          العودة لقائمة الموظفين
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Profile Header */}
      <EmployeeProfileHeader
        id={employee.id}
        onBack={() => navigate("/hr/employees")}
        onEdit={() => navigate(`/hr/employees/${id}/edit`)}
      />

      {/* Hero Card */}
      <EmployeeProfileHeroCard employee={employee} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full max-w-3xl h-auto">
          <TabsTrigger value="overview">
            {t("hrDashboard.employeeDetails.overview") || "نظرة عامة"}
          </TabsTrigger>
          <TabsTrigger value="personal">
            {t("hrDashboard.employeeDetails.personal") || "البيانات الشخصية"}
          </TabsTrigger>
          <TabsTrigger value="attendance">
            {t("sidebar.attendance") || "الحضور"}
          </TabsTrigger>
          <TabsTrigger value="leaves">
            {t("sidebar.leaves") || "الإجازات"}
          </TabsTrigger>
          <TabsTrigger value="documents">
            {t("hrDashboard.employeeDetails.documents") || "المستندات"}
          </TabsTrigger>
          <TabsTrigger value="salary">
            {t("hrDashboard.employeeDetails.salary") || "الراتب"}
          </TabsTrigger>
          <TabsTrigger value="performance">
            {t("hrDashboard.employeeDetails.performance") || "الأداء"}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <EmployeeOverviewTab
            employee={employee}
            onNavigateToSubordinate={(subId) =>
              navigate(`/hr/employees/${subId}`)
            }
          />
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal">
          <EmployeePersonalTab employee={employee} />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>سجل الحضور</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                سيتم عرض سجل الحضور التفصيلي هنا
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader>
              <CardTitle>سجل الإجازات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                سيتم عرض سجل الإجازات التفصيلي هنا
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <EmployeeDocumentsTab
            employee={employee}
            onManageDocuments={() => navigate(`/hr/documents/${employee.id}`)}
          />
        </TabsContent>

        {/* Salary History Tab */}
        <TabsContent value="salary">
          <EmployeeSalaryTab
            onViewSalaryHistory={() =>
              navigate(`/hr/salary-history/${employee.id}`)
            }
          />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <EmployeePerformanceTab
            onViewPerformance={() =>
              navigate(`/hr/performance-reviews?employeeId=${employee.id}`)
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetails;
