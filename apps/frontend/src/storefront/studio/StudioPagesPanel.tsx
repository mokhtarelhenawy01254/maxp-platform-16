import React, { useState, useMemo } from "react";
import {
  XMarkIcon,
  HomeIcon,
  ShoppingBagIcon,
  CubeIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
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
  CheckIcon,
  PhoneIcon,
  UserIcon,
  ArrowPathIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { STUDIO_PAGES, type StudioPageDefinition } from "./StudioTypes";
import { useStudioBridge } from "./hooks/useStorefrontStudioState";

interface StudioPagesPanelProps {
  activePageKey: string;
  onSelectPage: (pageKey: string) => void;
  onClose: () => void;
  pageSectionCounts?: Record<string, number>;
  customPages?: StudioPageDefinition[];
  onOpenCreatePageModal?: () => void;
  onDeletePage?: (pageKey: string) => void;
  onDuplicatePage?: (pageKey: string) => void;
  onRenamePage?: (pageKey: string, newTitle: string, newSlug?: string) => void;
  onOpenPageSeo?: (pageKey: string) => void;
  existingSlugs?: string[];
}

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  shop: ShoppingBagIcon,
  pdp: CubeIcon,
  cart: ShoppingCartIcon,
  checkout: CreditCardIcon,
  "thank-you": CheckCircleIcon,
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

export const StudioPagesPanel: React.FC<StudioPagesPanelProps> = ({
  activePageKey,
  onSelectPage,
  onClose,
  pageSectionCounts = {},
  customPages = [],
  onOpenCreatePageModal,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  onOpenPageSeo,
  existingSlugs = [],
}) => {
  const bridge = useStudioBridge();
  const handleDelete = onDeletePage || bridge.handleDeletePage;
  const handleDuplicate = onDuplicatePage || bridge.handleDuplicatePage;
  const handleRename = onRenamePage || bridge.handleRenamePage;

  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState<string>("");
  const [renamingSlug, setRenamingSlug] = useState<string>("");
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);

  const normalizedRenameSlug = useMemo(() => {
    return renamingSlug
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }, [renamingSlug]);

  const allKnownSlugs = useMemo(() => {
    if (existingSlugs && existingSlugs.length > 0) return existingSlugs;
    return [...STUDIO_PAGES.map((p) => p.id.toLowerCase()), ...customPages.map((p) => p.id.toLowerCase())];
  }, [existingSlugs, customPages]);

  const renameSlugValidation = useMemo(() => {
    if (!renamingPageId) return { isValid: true, message: null };
    if (!normalizedRenameSlug) {
      return { isValid: false, message: "رابط الصفحة مطلوب" };
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedRenameSlug)) {
      return { isValid: false, message: "أحرف إنجليزية وأرقام وشرطات فقط" };
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
  return (
    <div className="flex h-full w-[280px] max-w-[85vw] shrink-0 flex-col border-e border-[#0c0d0f] bg-[#202226] text-[#e8eaee] select-none z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2c2f35]">
        <div>
          <b className="text-[12.5px] font-bold text-[#f0f2f5]">صفحات المتجر</b>
          <p className="text-[10px] text-[#8b9199] mt-0.5">تبديل وتحرير صفحات المتجر</p>
        </div>
        <div className="flex items-center gap-1">
          {onOpenCreatePageModal && (
            <button
              type="button"
              onClick={onOpenCreatePageModal}
              className="rounded-lg p-1 text-[#2b6cf6] hover:bg-[#2b6cf6]/10 hover:text-[#60a5fa] transition-colors"
              title="إنشاء صفحة جديدة"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#8a8f96] hover:bg-[#2a2d33] hover:text-white"
            title="إغلاق اللوحة"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:thin]">
        {/* Section 1: Standard Pages */}
        <div className="space-y-1.5">
          <span className="px-1 text-[10px] font-bold text-[#717782] uppercase tracking-wider">
            الصفحات الأساسية ({STUDIO_PAGES.length})
          </span>
          {STUDIO_PAGES.map((page) => {
            const Icon = PAGE_ICONS[page.id] || HomeIcon;
            const isActive = activePageKey === page.id;
            const sectionCount = pageSectionCounts[page.id];

            return (
              <div
                key={page.id}
                className={`w-full text-start flex items-center justify-between gap-2 rounded-xl border p-2 transition-all ${
                  isActive
                    ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-white shadow-xs ring-1 ring-[#2b6cf6]/30"
                    : "border-[#33363c] bg-[#26292f] text-[#c3c7cd] hover:border-[#424752] hover:bg-[#2a2e36] hover:text-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPage(page.id)}
                  className="flex flex-1 items-start gap-3 min-w-0 text-start"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-[#2b6cf6] text-white" : "bg-[#1d1f24] text-[#8fa4c8]"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11.5px] font-bold truncate">{page.label}</span>
                      {isActive && (
                        <span className="flex items-center gap-0.5 text-[9.5px] text-[#60a5fa] font-bold">
                          <CheckCircleIcon className="h-3 w-3" />
                          <span>الحالية</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#8a8f96] line-clamp-1 mt-0.5">
                      {page.description}
                    </p>
                    {typeof sectionCount === "number" && (
                      <span className="inline-block mt-1 text-[9.5px] font-mono text-[#717782]">
                        {sectionCount} {sectionCount === 1 ? "قسم" : "أقسام"}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0 self-center">
                  {onOpenPageSeo && (
                    <button
                      type="button"
                      data-testid={`seo-page-${page.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPageSeo(page.id);
                      }}
                      className="p-1 rounded-md text-[#8a8f96] hover:bg-[#343840] hover:text-[#60a5fa] transition-colors"
                      title="إعدادات SEO الصفحة"
                      aria-label="إعدادات SEO الصفحة"
                    >
                      <GlobeAltIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid={`duplicate-page-${page.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(page.id);
                    }}
                    className="p-1 rounded-md text-[#8a8f96] hover:bg-[#343840] hover:text-white transition-colors"
                    title="تكرار الصفحة"
                  >
                    <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                  </button>
                  <ChevronLeftIcon className="h-4 w-4 shrink-0 text-[#676c76] rtl:rotate-180" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 2: Custom Pages («صفحاتي») */}
        <div className="pt-2 border-t border-[#2c2f35] space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-[#717782] uppercase tracking-wider">
              صفحاتي
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#1d1f24] text-[#8b9199] font-bold">
              {customPages.length}
            </span>
          </div>

          {customPages.length === 0 ? (
            <p className="px-2 py-2 text-[10px] text-[#717782] leading-relaxed">
              لا توجد صفحات مخصصة بعد. انقر على «+ صفحة جديدة» بالأسفل لإنشاء صفحة من قالب.
            </p>
          ) : (
            customPages.map((page) => {
              const isActive = activePageKey === page.id;
              const sectionCount = pageSectionCounts[page.id];

              const isRenaming = renamingPageId === page.id;
              const isDeleting = deletingPageId === page.id;

              return (
                <div
                  key={page.id}
                  className={`group w-full text-start flex flex-col rounded-xl border p-2 transition-all ${
                    isDeleting
                      ? "border-red-500/40 bg-red-950/30"
                      : isRenaming
                      ? "border-[#2b6cf6] bg-[#1d1f24]"
                      : isActive
                      ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-white shadow-xs ring-1 ring-[#2b6cf6]/30"
                      : "border-[#33363c] bg-[#26292f] text-[#c3c7cd] hover:border-[#424752] hover:bg-[#2a2e36] hover:text-white"
                  }`}
                >
                  {isRenaming && (
                    <div className="flex flex-col gap-2 p-1 shadow-sm">
                      <span className="text-[10px] text-[#8b9199] font-bold">إعادة تسمية وتعديل الرابط</span>
                      <div className="space-y-1.5">
                        <div>
                          <label className="text-[9.5px] text-[#8b9199] block mb-0.5">عنوان الصفحة</label>
                          <input
                            type="text"
                            value={renamingTitle}
                            onChange={(e) => setRenamingTitle(e.target.value)}
                            autoFocus
                            data-testid={`rename-title-input-${page.id}`}
                            className="w-full bg-[#26292f] border border-[#3b414d] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#2b6cf6] font-bold"
                            placeholder="اسم الصفحة"
                          />
                          <input
                            type="text"
                            value={renamingTitle}
                            onChange={(e) => setRenamingTitle(e.target.value)}
                            data-testid={`rename-input-${page.id}`}
                            className="sr-only"
                            tabIndex={-1}
                            aria-hidden="true"
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] text-[#8b9199] block mb-0.5">رابط الصفحة (Slug)</label>
                          <div className="relative flex items-center">
                            <span className="absolute start-2 font-mono text-[10px] text-[#8a8f96] select-none">/</span>
                            <input
                              type="text"
                              value={renamingSlug}
                              onChange={(e) => setRenamingSlug(e.target.value)}
                              dir="ltr"
                              data-testid={`rename-slug-input-${page.id}`}
                              className="w-full bg-[#26292f] border border-[#3b414d] rounded-lg ps-5 pe-2.5 py-1 text-xs font-mono text-white outline-none focus:border-[#2b6cf6]"
                              placeholder="page-slug"
                            />
                          </div>
                          {renameSlugValidation.message && (
                            <p className="text-[9.5px] text-red-400 mt-0.5">{renameSlugValidation.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end pt-1">
                        <button
                          type="button"
                          data-testid={`rename-save-${page.id}`}
                          disabled={!canSaveRename}
                          onClick={() => {
                            if (canSaveRename) {
                              if (normalizedRenameSlug && normalizedRenameSlug !== page.id) {
                                handleRename(page.id, renamingTitle.trim(), normalizedRenameSlug);
                              } else {
                                handleRename(page.id, renamingTitle.trim());
                              }
                              setRenamingPageId(null);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#2b6cf6] text-white text-[10.5px] font-bold disabled:opacity-50 hover:bg-[#2b6cf6]/80 active:scale-95 transition-all"
                          title="حفظ"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          data-testid={`rename-cancel-${page.id}`}
                          onClick={() => setRenamingPageId(null)}
                          className="px-2.5 py-1 rounded-lg bg-[#2c2f35] text-[#8a8f96] hover:text-white text-[10.5px]"
                          title="إلغاء"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {isDeleting && (
                    <div className="flex flex-col gap-2 p-1 shadow-sm">
                      <p className="text-[11px] text-red-200 font-bold leading-tight">
                        هل أنت متأكد من حذف صفحة «{page.label}»؟
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          data-testid={`confirm-delete-${page.id}`}
                          onClick={() => {
                            handleDelete(page.id);
                            setDeletingPageId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold active:scale-95 transition-all shadow-xs"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          data-testid={`cancel-delete-${page.id}`}
                          onClick={() => setDeletingPageId(null)}
                          className="px-2.5 py-1 rounded-lg bg-[#2c2f35] hover:bg-[#343840] text-[#c3c7cd] hover:text-white text-[10px]"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={`w-full flex items-center justify-between gap-1 ${isRenaming || isDeleting ? "hidden" : ""}`}>
                    <button
                      type="button"
                      onClick={() => onSelectPage(page.id)}
                      className="flex flex-1 items-start gap-2.5 min-w-0 text-start"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? "bg-[#2b6cf6] text-white" : "bg-[#1d1f24] text-[#8fa4c8]"
                        }`}
                      >
                        <DocumentTextIcon className="h-4.5 w-4.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11.5px] font-bold truncate">{page.label}</span>
                          {isActive && (
                            <span className="flex items-center gap-0.5 text-[9.5px] text-[#60a5fa] font-bold">
                              <CheckCircleIcon className="h-3 w-3" />
                              <span>الحالية</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8a8f96] font-mono truncate mt-0.5" dir="ltr">
                          {page.description}
                        </p>
                        {typeof sectionCount === "number" && (
                          <span className="inline-block mt-1 text-[9.5px] font-mono text-[#717782]">
                            {sectionCount} {sectionCount === 1 ? "قسم" : "أقسام"}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Actions for custom pages: SEO, Duplicate, Rename, Delete */}
                    <div className="flex items-center gap-0.5 shrink-0 self-center">
                      {onOpenPageSeo && (
                        <button
                          type="button"
                          data-testid={`seo-page-${page.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPageSeo(page.id);
                          }}
                          className="p-1 rounded-md text-[#8a8f96] hover:bg-[#343840] hover:text-[#60a5fa] transition-colors"
                          title="إعدادات SEO الصفحة"
                          aria-label="إعدادات SEO الصفحة"
                        >
                          <GlobeAltIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`duplicate-page-${page.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(page.id);
                        }}
                        className="p-1 rounded-md text-[#8a8f96] hover:bg-[#343840] hover:text-white transition-colors"
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
                        className="p-1 rounded-md text-[#8a8f96] hover:bg-[#343840] hover:text-white transition-colors"
                        title="إعادة تسمية"
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
                        className="p-1 rounded-md text-[#8a8f96] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="حذف الصفحة"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {onOpenCreatePageModal && (
            <button
              type="button"
              onClick={onOpenCreatePageModal}
              className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2b6cf6]/50 bg-[#2b6cf6]/5 py-2 text-xs font-bold text-[#60a5fa] hover:bg-[#2b6cf6]/15 transition-all active:scale-[0.98]"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>+ صفحة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-[#2c2f35] p-3 text-[10px] text-[#8a8f96] leading-relaxed">
        <span>💡 يتم حفظ تعديلاتك تلقائيًا وتُطبَّق على متجرك مباشرة — زر «نشر» يحفظ فورًا بدون انتظار.</span>
      </div>
    </div>
  );
};
