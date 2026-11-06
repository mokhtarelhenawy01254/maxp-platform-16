import React from "react";
import {
  useMyTrainingController,
  MyTrainingHeaderAndStats,
  MyTrainingCardsAndModal,
} from "./training";

const MyTraining: React.FC = () => {
  const {
    t,
    loading,
    selectedTraining,
    setSelectedTraining,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stats,
    filteredTrainings,
    fetchMyTrainings,
  } = useMyTrainingController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <MyTrainingHeaderAndStats
        t={t}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading}
        stats={stats}
        onRefresh={fetchMyTrainings}
      />

      <MyTrainingCardsAndModal
        t={t}
        loading={loading}
        filteredTrainings={filteredTrainings}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        selectedTraining={selectedTraining}
        onSelectTraining={setSelectedTraining}
        onResetFilters={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
        onRefresh={fetchMyTrainings}
      />
    </div>
  );
};

export default MyTraining;
