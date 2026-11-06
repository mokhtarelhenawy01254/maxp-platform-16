import React from "react";
import { Card, CardHeader, CardContent } from "../../components/ui/card";
import {
  useWarningsController,
  WarningsHeader,
  WarningsStatsGrid,
  WarningsFilterBar,
  WarningsCardGrid,
  WarningPreviewModal,
} from "./warnings/index";

const Warnings: React.FC = () => {
  const {
    warnings,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    severityFilter,
    setSeverityFilter,
    selectedWarning,
    setSelectedWarning,
    filteredWarnings,
    handleDelete,
    handleAdminAcknowledge,
    handleNavigateNew,
    handleNavigateDetails,
    handleNavigateEdit,
  } = useWarningsController();

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <WarningsHeader onNewWarning={handleNavigateNew} />

      {/* Stats Cards */}
      <WarningsStatsGrid stats={stats} />

      {/* Main Content Area */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardHeader className="pb-4 border-b">
          <WarningsFilterBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            severityFilter={severityFilter}
            onSeverityChange={setSeverityFilter}
          />
        </CardHeader>

        <CardContent className="p-6">
          <WarningsCardGrid
            warnings={filteredWarnings}
            loading={loading}
            totalWarningsCount={warnings.length}
            onSelectWarning={setSelectedWarning}
            onViewDetails={handleNavigateDetails}
            onEdit={handleNavigateEdit}
            onAdminAcknowledge={handleAdminAcknowledge}
            onDelete={handleDelete}
            onNewWarning={handleNavigateNew}
          />
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <WarningPreviewModal
        selectedWarning={selectedWarning}
        onClose={() => setSelectedWarning(null)}
        onOpenFullFile={handleNavigateDetails}
      />
    </div>
  );
};

export default Warnings;
