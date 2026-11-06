import React from "react";
import {
  useCompanyPolicyController,
  CompanyPolicyHeader,
  CompanyPolicyStatsGrid,
  CompanyPolicyFilterBar,
  CompanyPolicyTable,
  CompanyPolicyViewDialog,
  CompanyPolicyFormDialog,
} from "./company-policy/index";

const CompanyPolicy: React.FC = () => {
  const {
    policies,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isAddDialogOpen,
    setIsAddDialogOpen,
    editingPolicy,
    setEditingPolicy,
    viewingPolicy,
    setViewingPolicy,
    formData,
    setFormData,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useCompanyPolicyController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <CompanyPolicyHeader onNewPolicy={() => setIsAddDialogOpen(true)} />
        <CompanyPolicyStatsGrid policies={policies} />
      </div>

      {/* Filters & Search */}
      <CompanyPolicyFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Policies Table */}
      <CompanyPolicyTable
        policies={policies}
        loading={loading}
        onView={setViewingPolicy}
        onEdit={setEditingPolicy}
        onDelete={handleDelete}
      />

      {/* View Policy Dialog */}
      <CompanyPolicyViewDialog
        viewingPolicy={viewingPolicy}
        onClose={() => setViewingPolicy(null)}
        onEdit={setEditingPolicy}
      />

      {/* Add Policy Dialog */}
      <CompanyPolicyFormDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        isEditing={false}
        title={formData.title}
        content={formData.content}
        category={formData.category}
        isActive={formData.isActive}
        onTitleChange={(title) => setFormData((prev) => ({ ...prev, title }))}
        onContentChange={(content) =>
          setFormData((prev) => ({ ...prev, content }))
        }
        onCategoryChange={(category) =>
          setFormData((prev) => ({ ...prev, category }))
        }
        onIsActiveChange={(isActive) =>
          setFormData((prev) => ({ ...prev, isActive }))
        }
        onSubmit={handleCreate}
        onCancel={() => setIsAddDialogOpen(false)}
      />

      {/* Edit Policy Dialog */}
      <CompanyPolicyFormDialog
        isOpen={!!editingPolicy}
        onOpenChange={(open) => !open && setEditingPolicy(null)}
        isEditing={true}
        title={editingPolicy?.title || ""}
        content={editingPolicy?.content || ""}
        category={editingPolicy?.category || "general"}
        isActive={editingPolicy?.isActive ?? true}
        onTitleChange={(title) =>
          setEditingPolicy((prev) => (prev ? { ...prev, title } : null))
        }
        onContentChange={(content) =>
          setEditingPolicy((prev) => (prev ? { ...prev, content } : null))
        }
        onCategoryChange={(category) =>
          setEditingPolicy((prev) => (prev ? { ...prev, category } : null))
        }
        onIsActiveChange={(isActive) =>
          setEditingPolicy((prev) => (prev ? { ...prev, isActive } : null))
        }
        onSubmit={handleUpdate}
        onCancel={() => setEditingPolicy(null)}
      />
    </div>
  );
};

export default CompanyPolicy;
