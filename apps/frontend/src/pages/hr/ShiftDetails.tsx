import React from "react";
import { Clock } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import AssignShiftDialog from "../../components/hr/AssignShiftDialog";
import {
  useShiftDetailsController,
  ShiftDetailsHeader,
  ShiftDetailsStatsGrid,
  ShiftAssignedEmployeesCard,
  ShiftEditAndDeleteDialogs,
} from "./shift-details/index";

const ShiftDetails: React.FC = () => {
  const {
    shift,
    loading,
    deleteDialogOpen,
    setDeleteDialogOpen,
    assignDialogOpen,
    setAssignDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    formData,
    setFormData,
    formErrors,
    fetchShiftDetails,
    handleDeleteShift,
    handleUpdateShift,
    openEditDialog,
    handleRemoveAssignment,
    confirmRemoveAssignment,
    goBack,
  } = useShiftDetailsController();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="space-y-6 w-full pb-8" dir="rtl">
        <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">المناوبة غير موجودة</p>
            <Button onClick={goBack} className="mt-4">
              العودة للمناوبات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentAssignments = shift.assignments || [];
  const totalAssignments =
    shift._count?.assignments || shift.assignments?.length || 0;

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <ShiftDetailsHeader
        shift={shift}
        onBack={goBack}
        onAssignOpen={() => setAssignDialogOpen(true)}
        onEditOpen={openEditDialog}
        onDeleteShift={handleDeleteShift}
      />

      <ShiftDetailsStatsGrid
        shift={shift}
        totalAssignments={totalAssignments}
      />

      <ShiftAssignedEmployeesCard
        assignments={recentAssignments}
        totalAssignments={totalAssignments}
        onAssignOpen={() => setAssignDialogOpen(true)}
        onRemoveAssignment={confirmRemoveAssignment}
      />

      <ShiftEditAndDeleteDialogs
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogOpenChange={setDeleteDialogOpen}
        onConfirmRemoveAssignment={handleRemoveAssignment}
        editDialogOpen={editDialogOpen}
        onEditDialogOpenChange={setEditDialogOpen}
        formData={formData}
        onFormDataChange={setFormData}
        formErrors={formErrors}
        onUpdateShift={handleUpdateShift}
      />

      <AssignShiftDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        shiftId={shift.id}
        shiftName={shift.name}
        onSuccess={fetchShiftDetails}
      />
    </div>
  );
};

export default ShiftDetails;
