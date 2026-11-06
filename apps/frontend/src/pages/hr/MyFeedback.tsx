import React from "react";
import {
  useMyFeedbackController,
  MyFeedbackHeaderAndStats,
  MyFeedbackListSection,
  MyFeedbackPreviewDialog,
} from "./my-feedback/index";

const MyFeedback: React.FC = () => {
  const {
    t,
    navigate,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    previewItem,
    isPreviewOpen,
    handleOpenPreview,
    handlePreviewOpenChange,
    stats,
    filteredFeedback,
  } = useMyFeedbackController();

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      <MyFeedbackHeaderAndStats
        t={t}
        stats={stats}
        onNewMessage={() => navigate("/my-feedback/new")}
      />

      <MyFeedbackListSection
        t={t}
        loading={loading}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filteredFeedback={filteredFeedback}
        onOpenPreview={handleOpenPreview}
        onNewMessage={() => navigate("/my-feedback/new")}
      />

      <MyFeedbackPreviewDialog
        t={t}
        open={isPreviewOpen}
        onOpenChange={handlePreviewOpenChange}
        previewItem={previewItem}
      />
    </div>
  );
};

export default MyFeedback;
