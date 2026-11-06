import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { AlertCircle, UserPlus } from "lucide-react";
import {
  useAssignShiftController,
  AssignShiftHeader,
  AssignShiftExistingAlert,
  AssignShiftDetailsCard,
  AssignShiftFilters,
  AssignShiftEmployeeList,
  AssignShiftDateSelector,
  AssignShiftSummaryCard,
  AssignShiftActions,
} from "./assign-shift/index";

const AssignShift: React.FC = () => {
  const {
    shift,
    existingAssignments,
    selectedEmployeeIds,
    assignmentDate,
    setAssignmentDate,
    setExistingAssignments,
    endDate,
    setEndDate,
    loading,
    submitting,
    searchTerm,
    setSearchTerm,
    departmentFilter,
    setDepartmentFilter,
    positionFilter,
    setPositionFilter,
    dateRangeMode,
    setDateRangeMode,
    departments,
    positions,
    filteredEmployees,
    assignedEmployeeNames,
    handleAssign,
    toggleEmployeeSelection,
    handleNavigateBack,
  } = useAssignShiftController();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="space-y-6 w-full pb-8 text-center" dir="rtl">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-bold">المناوبة غير موجودة</h2>
        <Button onClick={handleNavigateBack} className="mt-4">
          العودة للمناوبات
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <AssignShiftHeader
        onBack={handleNavigateBack}
        dateRangeMode={dateRangeMode}
        onToggleDateRangeMode={() => setDateRangeMode(!dateRangeMode)}
      />

      {/* Existing Assignments Alert */}
      {existingAssignments.length > 0 && (
        <AssignShiftExistingAlert
          assignmentDate={assignmentDate}
          assignedEmployeeNames={assignedEmployeeNames}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shift Details Card */}
        <AssignShiftDetailsCard shift={shift} />

        {/* Assignment Form Card */}
        <Card className="md:col-span-2 shadow-lg border-none ring-1 ring-gray-200 dark:ring-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-500" />
              بيانات التعيين
            </CardTitle>
            <CardDescription>
              اختر الموظف والتاريخ لإتمام العملية
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Filters */}
            <AssignShiftFilters
              departments={departments}
              positions={positions}
              departmentFilter={departmentFilter}
              onDepartmentFilterChange={setDepartmentFilter}
              positionFilter={positionFilter}
              onPositionFilterChange={setPositionFilter}
              onClearFilters={() => {
                setDepartmentFilter("all");
                setPositionFilter("all");
              }}
            />

            {/* Employee Selection */}
            <AssignShiftEmployeeList
              employees={filteredEmployees}
              selectedEmployeeIds={selectedEmployeeIds}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onToggleEmployee={toggleEmployeeSelection}
            />

            {/* Date Selection */}
            <AssignShiftDateSelector
              dateRangeMode={dateRangeMode}
              assignmentDate={assignmentDate}
              endDate={endDate}
              onAssignmentDateChange={(date) => {
                setAssignmentDate(date);
                setExistingAssignments([]);
              }}
              onEndDateChange={setEndDate}
            />

            {/* Summary */}
            <AssignShiftSummaryCard
              selectedCount={selectedEmployeeIds.length}
              dateRangeMode={dateRangeMode}
              assignmentDate={assignmentDate}
              endDate={endDate}
            />

            {/* Action Buttons */}
            <AssignShiftActions
              selectedCount={selectedEmployeeIds.length}
              submitting={submitting}
              disabled={
                submitting ||
                selectedEmployeeIds.length === 0 ||
                (dateRangeMode && !endDate)
              }
              onSubmit={handleAssign}
              onCancel={handleNavigateBack}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssignShift;
