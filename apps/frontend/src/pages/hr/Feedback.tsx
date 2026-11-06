import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  useFeedbackController,
  FeedbackHeader,
  FeedbackStatsGrid,
  FeedbackFilterBar,
  FeedbackList,
  FeedbackReplyDialog,
} from "./feedback/index";

const Feedback: React.FC = () => {
  const {
    feedback,
    stats,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    ratingFilter,
    setRatingFilter,
    selectedFeedback,
    replyText,
    setReplyText,
    replyLoading,
    isReplyDialogOpen,
    isPrivileged,
    filteredFeedback,
    handleDelete,
    handleReply,
    handleOpenReplyDialog,
    handleCloseReplyDialog,
    handleNavigateNew,
    handleNavigateEdit,
  } = useFeedbackController();

  if (loading && feedback.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      {/* Header Section */}
      <FeedbackHeader onNewFeedback={handleNavigateNew} />

      {/* Stats Overview */}
      <FeedbackStatsGrid stats={stats} feedback={feedback} />

      {/* Main Content Card */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/70 px-5 py-3.5">
          <FeedbackFilterBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            ratingFilter={ratingFilter}
            onRatingChange={setRatingFilter}
          />
        </CardHeader>

        <CardContent className="p-0">
          <FeedbackList
            feedback={filteredFeedback}
            isPrivileged={isPrivileged}
            onOpenReplyDialog={handleOpenReplyDialog}
            onEdit={handleNavigateEdit}
            onDelete={handleDelete}
            onResetFilters={() => {
              setSearchQuery("");
              setRatingFilter("all");
            }}
          />
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <FeedbackReplyDialog
        isOpen={isReplyDialogOpen}
        selectedFeedback={selectedFeedback}
        replyText={replyText}
        replyLoading={replyLoading}
        onReplyTextChange={setReplyText}
        onSubmit={handleReply}
        onClose={handleCloseReplyDialog}
      />
    </div>
  );
};

export default Feedback;
