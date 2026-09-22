import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  businessSpecialtyService,
  type BusinessSpecialty,
  type BusinessSpecialtyFormPayload,
  type MarketplaceAppOption,
} from "../../../services/businessSpecialtyService";
import { SpecialtyCardView } from "./components/SpecialtyCardView";
import { SpecialtyControlBar } from "./components/SpecialtyControlBar";
import { SpecialtyDeleteDialog } from "./components/SpecialtyDeleteDialog";
import { SpecialtyDetailDialog } from "./components/SpecialtyDetailDialog";
import { SpecialtyEditSheet } from "./components/SpecialtyEditSheet";
import { SpecialtyStats } from "./components/SpecialtyStats";
import { SpecialtyTableView } from "./components/SpecialtyTableView";
import {
  getErrorMessage,
  type SortOption,
  type StatusFilter,
  type ViewMode,
} from "./types";

export const BusinessSpecialtiesPage: React.FC = () => {
  const [specialties, setSpecialties] = useState<BusinessSpecialty[]>([]);
  const [appOptions, setAppOptions] = useState<MarketplaceAppOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters & View States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("sortOrder");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Dialog & Sheet States
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<BusinessSpecialty | null>(null);
  const [detailSpecialty, setDetailSpecialty] = useState<BusinessSpecialty | null>(null);
  const [specialtyPendingRemoval, setSpecialtyPendingRemoval] = useState<BusinessSpecialty | null>(null);

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [items, options] = await Promise.all([
        businessSpecialtyService.listSpecialties(),
        businessSpecialtyService.listAppOptions(),
      ]);
      setSpecialties(items);
      setAppOptions(options);
    } catch (error) {
      console.error("Failed to load business specialties", error);
      toast.error(getErrorMessage(error, "فشل تحميل النشاطات التجارية"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // App options lookup map
  const appOptionsBySlug = useMemo(
    () => new Map(appOptions.map((opt) => [opt.slug, opt])),
    [appOptions],
  );

  // Status counts
  const statusCounts = useMemo(
    () => ({
      ALL: specialties.length,
      ACTIVE: specialties.filter((s) => s.isActive).length,
      INACTIVE: specialties.filter((s) => !s.isActive).length,
      AUTO: specialties.filter((s) => s.autoInstallOnSignup).length,
    }),
    [specialties],
  );

  // Filtered and sorted specialties
  const filteredSpecialties = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = specialties.filter((specialty) => {
      const matchesSearch =
        !q ||
        [
          specialty.nameAr,
          specialty.nameEn,
          specialty.slug,
          specialty.descriptionAr,
          specialty.descriptionEn,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && specialty.isActive) ||
        (statusFilter === "INACTIVE" && !specialty.isActive) ||
        (statusFilter === "AUTO" && specialty.autoInstallOnSignup);

      return matchesSearch && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sortBy === "name") {
        return a.nameAr.localeCompare(b.nameAr, "ar");
      }
      if (sortBy === "companies") {
        return (b.companyCount || 0) - (a.companyCount || 0);
      }
      return a.sortOrder - b.sortOrder;
    });
  }, [specialties, search, statusFilter, sortBy]);

  // Handler: Instant Active Toggle
  const handleToggleActive = async (specialty: BusinessSpecialty, active: boolean) => {
    // Optimistic UI update
    setSpecialties((prev) =>
      prev.map((s) => (s.id === specialty.id ? { ...s, isActive: active } : s)),
    );

    try {
      await businessSpecialtyService.updateSpecialty(specialty.id, {
        slug: specialty.slug,
        nameAr: specialty.nameAr,
        nameEn: specialty.nameEn,
        descriptionAr: specialty.descriptionAr,
        descriptionEn: specialty.descriptionEn,
        icon: specialty.icon,
        appSlugs: specialty.appSlugs,
        autoInstallOnSignup: specialty.autoInstallOnSignup,
        themeId: specialty.themeId,
        sortOrder: specialty.sortOrder,
        isActive: active,
      });
      toast.success(
        active
          ? `تم تفعيل النشاط: ${specialty.nameAr}`
          : `تم إيقاف النشاط: ${specialty.nameAr}`,
      );
    } catch (error) {
      console.error("Failed to toggle specialty active state", error);
      toast.error(getErrorMessage(error, "فشل تعديل حالة النشاط"));
      // Revert on failure
      setSpecialties((prev) =>
        prev.map((s) => (s.id === specialty.id ? { ...s, isActive: specialty.isActive } : s)),
      );
    }
  };

  // Handler: Create or Update
  const handleSave = async (payload: BusinessSpecialtyFormPayload) => {
    if (!payload.nameAr.trim() || !payload.nameEn.trim()) {
      toast.error("الاسم بالعربي والإنجليزي مطلوب");
      return;
    }

    setSaving(true);
    try {
      if (editingSpecialty) {
        await businessSpecialtyService.updateSpecialty(editingSpecialty.id, payload);
        toast.success("تم تحديث النشاط التجاري بنجاح");
      } else {
        await businessSpecialtyService.createSpecialty(payload);
        toast.success("تم إنشاء النشاط التجاري بنجاح");
      }

      setIsSheetOpen(false);
      setEditingSpecialty(null);
      await loadData();
    } catch (error) {
      console.error("Failed to save specialty", error);
      toast.error(getErrorMessage(error, "فشل حفظ النشاط التجاري"));
    } finally {
      setSaving(false);
    }
  };

  // Handler: Delete or Deactivate
  const handleConfirmDelete = async () => {
    if (!specialtyPendingRemoval) return;

    setDeleting(true);
    try {
      const result = await businessSpecialtyService.removeSpecialty(specialtyPendingRemoval.id);
      const isLinked = (specialtyPendingRemoval.companyCount || 0) > 0;

      if (!isLinked) {
        setSpecialties((prev) => prev.filter((s) => s.id !== specialtyPendingRemoval.id));
        toast.success("تم حذف النشاط التجاري نهائياً");
      } else {
        setSpecialties((prev) =>
          prev.map((s) =>
            s.id === specialtyPendingRemoval.id && result.specialty ? result.specialty : s,
          ),
        );
        toast.success("تم إيقاف تنشيط النشاط التجاري لحماية الشركات التابعة");
      }

      setSpecialtyPendingRemoval(null);
      await loadData();
    } catch (error) {
      console.error("Failed to delete specialty", error);
      toast.error(getErrorMessage(error, "فشل حذف النشاط التجاري"));
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSpecialty(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (specialty: BusinessSpecialty) => {
    setEditingSpecialty(specialty);
    setIsSheetOpen(true);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            النشاطات التجارية والتطبيقات
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            إدارة دليل الأنشطة المتاحة عند التسجيل والتطبيقات الافتراضية المرتبطة بها.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <SpecialtyStats specialties={specialties} />

      {/* Control Bar: Search, Filters, View toggle, Create CTA */}
      <SpecialtyControlBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={() => void loadData()}
        onCreate={handleOpenCreate}
        loading={loading}
        totalCount={specialties.length}
        filteredCount={filteredSpecialties.length}
      />

      {/* Content: Cards View or Table View */}
      {viewMode === "grid" ? (
        <SpecialtyCardView
          specialties={filteredSpecialties}
          appOptionsBySlug={appOptionsBySlug}
          onEdit={handleOpenEdit}
          onDelete={setSpecialtyPendingRemoval}
          onViewDetails={setDetailSpecialty}
          onToggleActive={handleToggleActive}
          onCreate={handleOpenCreate}
        />
      ) : (
        <SpecialtyTableView
          specialties={filteredSpecialties}
          appOptionsBySlug={appOptionsBySlug}
          onEdit={handleOpenEdit}
          onDelete={setSpecialtyPendingRemoval}
          onViewDetails={setDetailSpecialty}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Edit / Create Sheet */}
      <SpecialtyEditSheet
        open={isSheetOpen}
        specialty={editingSpecialty}
        appOptions={appOptions}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingSpecialty(null);
        }}
        onSave={handleSave}
        saving={saving}
      />

      {/* Details Dialog */}
      <SpecialtyDetailDialog
        specialty={detailSpecialty}
        appOptionsBySlug={appOptionsBySlug}
        open={Boolean(detailSpecialty)}
        onClose={() => setDetailSpecialty(null)}
        onEdit={handleOpenEdit}
      />

      {/* Delete / Deactivate Confirmation Dialog */}
      <SpecialtyDeleteDialog
        specialty={specialtyPendingRemoval}
        open={Boolean(specialtyPendingRemoval)}
        onClose={() => setSpecialtyPendingRemoval(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
};

export default BusinessSpecialtiesPage;
