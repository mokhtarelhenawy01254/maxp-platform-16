import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CreditCardIcon,
  CubeIcon,
  HomeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  TagIcon,
  FolderIcon,
  SparklesIcon,
  TruckIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  PhoneIcon,
  UserIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { STUDIO_PAGES, type StudioPageDefinition } from "./StudioTypes";
import { useStudioBridge } from "./hooks/useStorefrontStudioState";

interface StudioPageSelectorProps {
  activePageKey: string;
  onPageChange: (pageKey: string) => void;
  customPages?: StudioPageDefinition[];
  onOpenCreatePageModal?: () => void;
  onDeletePage?: (pageKey: string) => void;
  onDuplicatePage?: (pageKey: string) => void;
  onRenamePage?: (pageKey: string, newTitle: string, newSlug?: string) => void;
  existingSlugs?: string[];
}

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  shop: ShoppingBagIcon,
  pdp: CubeIcon,
  cart: ShoppingCartIcon,
  checkout: CreditCardIcon,
  "thank-you": ShieldCheckIcon,
  sale: TagIcon,
  collections: FolderIcon,
  "size-guide": SparklesIcon,
  shipping: TruckIcon,
  privacy: ShieldCheckIcon,
  terms: DocumentTextIcon,
  returns: ArrowPathIcon,
  contact: PhoneIcon,
  registration: UserIcon,
};

export const StudioPageSelector: React.FC<StudioPageSelectorProps> = ({
  activePageKey,
  onPageChange,
  customPages = [],
  onOpenCreatePageModal,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  existingSlugs = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const bridge = useStudioBridge();
  const handleDelete = onDeletePage || bridge.handleDeletePage;
  const handleDuplicate = onDuplicatePage || bridge.handleDuplicatePage;
  const handleRename = onRenamePage || bridge.handleRenamePage;

  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState("");
  const [renamingSlug, setRenamingSlug] = useState("");

  const allPages = useMemo(() => {
    return [...STUDIO_PAGES, ...customPages];
  }, [customPages]);

  const activePageDef: StudioPageDefinition = useMemo(() => {
    return (
      allPages.find((p) => p.id === activePageKey) || {
        id: activePageKey,
        label: activePageKey,
        icon: "📄",
        description: `/${activePageKey}`,
      }
    );
  }, [allPages, activePageKey]);

  const ActiveIcon = PAGE_ICONS[activePageDef.id] || DocumentTextIcon;

  const normalizedRenameSlug = useMemo(() => {
    return renamingSlug
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }, [renamingSlug]);

  const allKnownSlugs = useMemo(() => {
    if (existingSlugs && existingSlugs.length > 0) return existingSlugs;
    return allPages.map((p) => p.id.toLowerCase());
  }, [existingSlugs, allPages]);

  const renameSlugValidation = useMemo(() => {
    if (!renamingPageId) return { isValid: true, message: null };
    if (!normalizedRenameSlug) {
      return { isValid: false, message: "رابط الصفحة مطلوب" };
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedRenameSlug)) {
      return { isValid: false, message: "يجب أن يحتوي الرابط على أحرف إنجليزية وأرقام وشرطات فقط" };
    }
    const isTaken = allKnownSlugs.some(
      (s) => s.toLowerCase() === normalizedRenameSlug && s.toLowerCase() !== renamingPageId.toLowerCase()
    );
    if (isTaken) {
      return { isValid: false, message: `الرابط "${normalizedRenameSlug}" مستخدم بالفعل` };
    }
    return { isValid: true, message: null };
  }, [renamingPageId, normalizedRenameSlug, allKnownSlugs]);

  const canSaveRename = renamingTitle.trim().length > 0 && renameSlugValidation.isValid;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setDeletingPageId(null);
        setRenamingPageId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setDeletingPageId(null);
        setRenamingPageId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (pageId: string) => {
      onPageChange(pageId);
      setIsOpen(false);
      setDeletingPageId(null);
      setRenamingPageId(null);
    },
    [onPageChange]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button with obvious dropdown affordance */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`تعديل الصفحة: ${activePageDef.label}. انقر لفتح قائمة صفحات المتجر`}
        title="انقر لتبديل الصفحة وتعديل أقسامها"
        className={`group flex h-7 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border bg-card px-2 sm:px-3 text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isOpen
            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
            : "border-border text-foreground hover:border-primary/40 hover:bg-muted/50"
        }`}
      >
        {/* Page Icon */}
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${
            isOpen
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <ActiveIcon className="h-3.5 w-3.5" />
        </span>

        {/* Page Prefix */}
        <span className="hidden items-center text-[11px] font-medium text-muted-foreground sm:inline-flex">
          الصفحة:
        </span>

        {/* Word + Arrow Group (Crystal clear indication of dropdown options) */}
        <span className="inline-flex items-center gap-1.5 font-black text-foreground text-xs sm:text-sm">
          <span>{activePageDef.label}</span>
          <ChevronDownIcon
            className={`h-4 w-4 text-primary stroke-[2.5] transition-transform duration-200 group-hover:scale-110 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>

        {/* Total Pages Counter Badge */}
        <span className="hidden md:inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {allPages.length}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="قائمة صفحات المتجر"
          className="absolute top-full mt-2 start-0 z-50 w-72 sm:w-80 rounded-2xl border border-border/80 bg-card p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 mb-1">
            <div>
              <p className="text-xs font-black text-foreground">صفحات المتجر</p>
              <p className="text-[10px] text-muted-foreground">اختر الصفحة لتعديل أقسامها ومظهرها</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {allPages.length} صفحة
            </span>
          </div>

          {/* List of Pages */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 p-1 [scrollbar-width:thin]">
            {/* Section 1: Standard Pages */}
            <div className="space-y-1">
              <p className="px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                الصفحات الأساسية
              </p>
              {STUDIO_PAGES.map((page) => {
                const isSelected = page.id === activePageKey;
                const PageIcon = PAGE_ICONS[page.id] || Squares2X2Icon;

                return (
                  <div
                    key={page.id}
                    className={`group flex w-full items-center justify-between rounded-xl p-1.5 transition-all ${
                      isSelected
                        ? "border border-primary/25 bg-primary/10 text-primary"
                        : "border border-transparent text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(page.id)}
                      className="flex flex-1 items-center gap-2.5 min-w-0 text-start"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        }`}
                      >
                        <PageIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {page.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {page.description}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        data-testid={`duplicate-page-${page.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(page.id);
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="تكرار الصفحة"
                      >
                        <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                      </button>
                      {isSelected && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ms-0.5">
                          <CheckIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Section 2: Custom Pages («صفحاتي») */}
            <div className="pt-2 border-t border-border/60 space-y-1">
              <div className="flex items-center justify-between px-2 py-0.5">
                <p className="text-[10px] font-bold text-muted-foreground">صفحاتي</p>
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                  {customPages.length}
                </span>
              </div>

              {customPages.length === 0 ? (
                <p className="px-2 py-1.5 text-[10px] text-muted-foreground">
                  لا توجد صفحات مخصصة بعد. أضف صفحتك الأولى!
                </p>
              ) : (
                customPages.map((page) => {
                  const isSelected = page.id === activePageKey;

                  if (deletingPageId === page.id) {
                    return (
                      <div
                        key={page.id}
                        className="flex flex-col gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs animate-in fade-in duration-100"
                      >
                        <p className="font-bold text-destructive text-[11px] leading-tight">
                          هل أنت متأكد من حذف صفحة «{page.label}»؟
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            data-testid={`confirm-delete-${page.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(page.id);
                              setDeletingPageId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground text-[10.5px] font-bold hover:bg-destructive/90 active:scale-95 transition-all shadow-xs"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            data-testid={`cancel-delete-${page.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPageId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-[10.5px]"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (renamingPageId === page.id) {
                    return (
                      <div
                        key={page.id}
                        className="flex flex-col gap-2 rounded-xl border border-primary/50 bg-card p-2.5 shadow-sm text-xs animate-in fade-in duration-100"
                      >
                        <span className="text-[10px] text-muted-foreground font-bold">إعادة تسمية وتعديل الرابط</span>
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">عنوان الصفحة</label>
                            <input
                              type="text"
                              value={renamingTitle}
                              onChange={(e) => setRenamingTitle(e.target.value)}
                              data-testid={`rename-title-input-${page.id}`}
                              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary font-bold"
                              placeholder="عنوان الصفحة"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">رابط الصفحة (Slug)</label>
                            <div className="relative flex items-center">
                              <span className="absolute start-2 font-mono text-[10px] text-muted-foreground select-none">/</span>
                              <input
                                type="text"
                                value={renamingSlug}
                                onChange={(e) => setRenamingSlug(e.target.value)}
                                data-testid={`rename-slug-input-${page.id}`}
                                dir="ltr"
                                className="w-full bg-background border border-border rounded-lg ps-5 pe-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary"
                                placeholder="page-slug"
                              />
                            </div>
                            {renameSlugValidation.message && (
                              <p className="text-[10px] text-destructive mt-0.5 font-medium">{renameSlugValidation.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end pt-1">
                          <button
                            type="button"
                            data-testid={`rename-save-${page.id}`}
                            disabled={!canSaveRename}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canSaveRename) {
                                handleRename(page.id, renamingTitle.trim(), normalizedRenameSlug);
                                setRenamingPageId(null);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold disabled:opacity-50 active:scale-95 transition-all shadow-xs"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            data-testid={`rename-cancel-${page.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingPageId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-[11px]"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={page.id}
                      className={`group flex w-full items-center justify-between rounded-xl p-1.5 transition-all ${
                        isSelected
                          ? "border border-primary/25 bg-primary/10 text-primary"
                          : "border border-transparent text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(page.id)}
                        className="flex flex-1 items-center gap-2.5 min-w-0 text-start"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                          }`}
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {page.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate" dir="ltr">
                            {page.description}
                          </p>
                        </div>
                      </button>

                      {/* Action buttons for custom page */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          data-testid={`duplicate-page-${page.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(page.id);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="تكرار الصفحة"
                        >
                          <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          data-testid={`rename-page-${page.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingPageId(page.id);
                            setRenamingTitle(page.label);
                            setRenamingSlug(page.id);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="إعادة تسمية وتعديل الرابط"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          data-testid={`delete-page-${page.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingPageId(page.id);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                          title="حذف الصفحة"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                        {isSelected && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ms-0.5">
                            <CheckIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Create New Page Trigger Button */}
          {onOpenCreatePageModal && (
            <div className="mt-1 pt-1.5 border-t border-border/70">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreatePageModal();
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 py-2 text-xs font-bold text-primary transition-all active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                <span>+ صفحة جديدة</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
