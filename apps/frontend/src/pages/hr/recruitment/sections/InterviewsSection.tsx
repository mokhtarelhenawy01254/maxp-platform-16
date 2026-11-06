import React from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../../components/ui/button";
import {
  useInterviewsController,
  InterviewScheduleModal,
  InterviewsGrid,
} from "./interviews";

const InterviewsSection: React.FC = () => {
  const {
    interviews,
    jobs,
    loading,
    showScheduleModal,
    setShowScheduleModal,
    newInterview,
    setNewInterview,
    interviewerInput,
    setInterviewerInput,
    handleScheduleInterview,
    handleUpdateStatus,
    resetForm,
    addInterviewer,
    removeInterviewer,
    getApplicantsForJob,
  } = useInterviewsController();

  return (
    <div className="space-y-5 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <PlusIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              مساحة المقابلات
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              إدارة جداول المقابلات والمواعيد
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setShowScheduleModal(true)}
          className="gap-1.5 text-xs font-semibold shadow-xs"
        >
          <PlusIcon className="size-4" />
          جدولة مقابلة جديدة
        </Button>
      </div>

      {/* Schedule Interview Modal */}
      <InterviewScheduleModal
        open={showScheduleModal}
        jobs={jobs}
        applicantsForJob={getApplicantsForJob()}
        newInterview={newInterview}
        interviewerInput={interviewerInput}
        onChangeInterview={setNewInterview}
        onChangeInterviewerInput={setInterviewerInput}
        onAddInterviewer={addInterviewer}
        onRemoveInterviewer={removeInterviewer}
        onClose={() => {
          setShowScheduleModal(false);
          resetForm();
        }}
        onSubmit={handleScheduleInterview}
      />

      {/* Interviews Grid */}
      <InterviewsGrid
        interviews={interviews}
        loading={loading}
        onOpenScheduleModal={() => setShowScheduleModal(true)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default InterviewsSection;
