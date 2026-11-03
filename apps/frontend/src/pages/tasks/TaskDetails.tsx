import React from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  BusinessPageShell,
  BusinessSectionPanel,
} from "../../components/business/BusinessSurface";
import TaskChecklist from "../../components/tasks/TaskChecklist";
import TaskDependencies from "../../components/tasks/TaskDependencies";
import { Button } from "../../components/ui/button";
import {
  useTaskDetailsController,
  TaskTabKey,
  TaskEmptyState,
  TaskDetailsHeader,
  TaskOverviewCard,
  TaskTabsBar,
  TaskSubtasksTab,
  TaskCommentsTab,
  TaskTimeTab,
  TaskAttachmentsTab,
  TaskActivityTab,
  TaskMetaSidebar,
} from "./task-details/index";

const TaskDetailsPage: React.FC = () => {
  const {
    id,
    navigate,
    isApprover,
    canApprove,
    task,
    loading,
    activeTab,
    setActiveTab,
    newComment,
    setNewComment,
    newSubtask,
    setNewSubtask,
    showSubtaskForm,
    setShowSubtaskForm,
    runningTimer,
    users,
    editingComment,
    setEditingComment,
    editCommentContent,
    setEditCommentContent,
    showManualTimeForm,
    setShowManualTimeForm,
    manualTimeEntry,
    setManualTimeEntry,
    uploading,
    showFullDescription,
    setShowFullDescription,
    fetchTaskDetails,
    startTimer,
    stopTimer,
    addComment,
    createSubtask,
    updateComment,
    deleteComment,
    addManualTime,
    updateSubtaskStatus,
    toggleWatcher,
    updateTask,
    deleteTask,
    uploadAttachment,
    deleteAttachment,
  } = useTaskDetailsController();

  if (loading) {
    return (
      <BusinessPageShell className="tasks-page p-3 pb-28 md:px-5 md:py-4 xl:px-6 xl:py-5">
        <div className="mx-auto max-w-[1360px] space-y-4">
          <div className="h-10 w-36 rounded-full bg-muted animate-pulse" />
          <div className="h-44 rounded-[28px] border border-border/70 bg-card/75 p-6 animate-pulse" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_23rem]">
            <div className="h-96 rounded-[28px] border border-border/70 bg-card/75 p-6 animate-pulse" />
            <div className="h-96 rounded-[28px] border border-border/70 bg-card/75 p-6 animate-pulse" />
          </div>
        </div>
      </BusinessPageShell>
    );
  }

  if (!task) {
    return (
      <BusinessPageShell className="tasks-page p-3 pb-20 md:px-5 md:py-4 xl:px-6 xl:py-5">
        <div className="mx-auto max-w-[1360px] space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => navigate("/tasks")}
            >
              <ArrowLeftIcon className="size-4" />
              العودة للمهام
            </Button>
          </div>

          <BusinessSectionPanel
            title="المهمة غير موجودة"
            description="الرابط الحالي لا يعرض مهمة صالحة داخل الشركة الحالية، لذلك أعدنا الصفحة إلى حالة مراجعة بسيطة وواضحة."
            contentClassName="pt-0"
          >
            <TaskEmptyState
              title="لا توجد بيانات لعرضها"
              description="قد يكون الرابط قديمًا أو تم حذف المهمة. ارجع إلى قائمة المهام ثم افتح العنصر من جديد حتى نتأكد أن الرابط والبيانات متطابقان."
            />
          </BusinessSectionPanel>
        </div>
      </BusinessPageShell>
    );
  }

  const currentUserId = localStorage.getItem("userId") || "";

  const tabItems: Array<{ id: TaskTabKey; label: string; count: number }> = [
    { id: "subtasks", label: "المهام الفرعية", count: task.subtasks.length },
    { id: "checklists", label: "قوائم التحقق", count: 0 },
    { id: "dependencies", label: "التبعيات", count: 0 },
    { id: "comments", label: "التعليقات", count: task.comments.length },
    { id: "time", label: "الوقت", count: task.timeEntries.length },
    { id: "attachments", label: "المرفقات", count: task.attachments.length },
    { id: "activity", label: "النشاط", count: task.activities.length },
  ];

  return (
    <BusinessPageShell className="tasks-page p-2.5 pb-6 md:px-5 md:py-4 xl:px-6 xl:py-5">
      <div className="mx-auto max-w-[1360px] space-y-2.5 md:space-y-3">
        {/* Header Section */}
        <TaskDetailsHeader
          task={task}
          runningTimer={runningTimer}
          isApprover={canApprove}
          onStartTimer={startTimer}
          onStopTimer={stopTimer}
          onToggleWatcher={toggleWatcher}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
        />

        {/* 2-Column Content Grid */}
        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.32fr)_23rem]">
          <div className="min-w-0 space-y-3">
            {/* Overview / Execution Board Card */}
            <TaskOverviewCard
              task={task}
              users={users}
              showFullDescription={showFullDescription}
              setShowFullDescription={setShowFullDescription}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />

            {/* Horizontal Tabs Switcher */}
            <TaskTabsBar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabItems={tabItems}
            />

            {/* Tab Views */}
            <div className="space-y-3">
              {activeTab === "subtasks" && (
                <TaskSubtasksTab
                  subtasks={task.subtasks}
                  showSubtaskForm={showSubtaskForm}
                  setShowSubtaskForm={setShowSubtaskForm}
                  newSubtask={newSubtask}
                  setNewSubtask={setNewSubtask}
                  onCreateSubtask={createSubtask}
                  onUpdateSubtaskStatus={updateSubtaskStatus}
                />
              )}

              {activeTab === "checklists" && id && (
                <TaskChecklist taskId={id} onUpdate={fetchTaskDetails} />
              )}

              {activeTab === "dependencies" && id && (
                <TaskDependencies taskId={id} onUpdate={fetchTaskDetails} />
              )}

              {activeTab === "comments" && (
                <TaskCommentsTab
                  comments={task.comments}
                  currentUserId={currentUserId}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  editingComment={editingComment}
                  setEditingComment={setEditingComment}
                  editCommentContent={editCommentContent}
                  setEditCommentContent={setEditCommentContent}
                  onAddComment={addComment}
                  onUpdateComment={updateComment}
                  onDeleteComment={deleteComment}
                />
              )}

              {activeTab === "time" && (
                <TaskTimeTab
                  totalTimeMinutes={task.totalTimeMinutes}
                  estimatedHours={task.estimatedHours}
                  timeEntries={task.timeEntries}
                  showManualTimeForm={showManualTimeForm}
                  setShowManualTimeForm={setShowManualTimeForm}
                  manualTimeEntry={manualTimeEntry}
                  setManualTimeEntry={setManualTimeEntry}
                  onAddManualTime={addManualTime}
                />
              )}

              {activeTab === "attachments" && (
                <TaskAttachmentsTab
                  attachments={task.attachments}
                  currentUserId={currentUserId}
                  uploading={uploading}
                  onUploadAttachment={uploadAttachment}
                  onDeleteAttachment={deleteAttachment}
                />
              )}

              {activeTab === "activity" && (
                <TaskActivityTab activities={task.activities} />
              )}
            </div>
          </div>

          {/* Right Column Context & Ownership Sidebar */}
          <TaskMetaSidebar task={task} />
        </div>
      </div>
    </BusinessPageShell>
  );
};

export default TaskDetailsPage;
