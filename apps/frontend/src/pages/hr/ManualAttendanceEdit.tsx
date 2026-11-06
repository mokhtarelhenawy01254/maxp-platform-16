import React from "react";
import {
  useManualAttendanceController,
  ManualAttendanceHeader,
  ManualAttendanceFilters,
  ManualAttendanceTable,
} from "./manual-attendance-edit/index";

const ManualAttendanceEdit: React.FC = () => {
  const {
    loading,
    saving,
    displayedRecords,
    editingRecords,
    pagination,
    setPagination,
    selectedDate,
    setSelectedDate,
    endDate,
    setEndDate,
    useDateRange,
    setUseDateRange,
    statusFilter,
    setStatusFilter,
    employeeId,
    setEmployeeId,
    showAllEmployees,
    setShowAllEmployees,
    employees,
    startEditing,
    cancelEditing,
    updateEditingField,
    setCurrentTimeForCheckIn,
    setCurrentTimeForCheckOut,
    isEditing,
    resetFilters,
    saveRecord,
  } = useManualAttendanceController();

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      <ManualAttendanceHeader />

      <ManualAttendanceFilters
        showAllEmployees={showAllEmployees}
        setShowAllEmployees={setShowAllEmployees}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        useDateRange={useDateRange}
        setUseDateRange={setUseDateRange}
        endDate={endDate}
        setEndDate={setEndDate}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        employeeId={employeeId}
        setEmployeeId={setEmployeeId}
        employees={employees}
        onReset={resetFilters}
      />

      <ManualAttendanceTable
        loading={loading}
        records={displayedRecords}
        saving={saving}
        editingRecords={editingRecords}
        isEditing={isEditing}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onSaveRecord={saveRecord}
        onUpdateField={updateEditingField}
        onSetCurrentTimeCheckIn={setCurrentTimeForCheckIn}
        onSetCurrentTimeCheckOut={setCurrentTimeForCheckOut}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
      />
    </div>
  );
};

export default ManualAttendanceEdit;
