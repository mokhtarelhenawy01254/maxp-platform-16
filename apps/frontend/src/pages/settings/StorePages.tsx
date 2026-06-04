import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuthSimple";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import RichTextEditor from "../../components/RichTextEditor";
import { buildStorefrontPreviewPath } from "../../storefront/utils/paths";
import i18n from "../../i18n";

interface StorePage {
  id: string;
  title: string;
  slug: string;
  content: string;
  pageType: string;
  isActive: boolean;
  showInFooter: boolean;
  showInMenu: boolean;
  order: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

const PAGE_TYPES = {
  SHIPPING_POLICY: { label: "سياسة الشحن", icon: GlobeAltIcon, color: "text-blue-500" },
  RETURN_POLICY: { label: "سياسة الإرجاع", icon: ShieldCheckIcon, color: "text-indigo-500" },
  REFUND_POLICY: { label: "سياسة الاسترجاع المالي", icon: ShieldCheckIcon, color: "text-rose-500" },
  PRIVACY_POLICY: { label: "سياسة الخصوصية", icon: ShieldCheckIcon, color: "text-emerald-500" },
  TERMS_CONDITIONS: { label: "الشروط والأحكام", icon: DocumentTextIcon, color: "text-amber-500" },
  ABOUT_US: { label: "عن المتجر", icon: InformationCircleIcon, color: "text-purple-500" },
  CONTACT_US: { label: "اتصل بنا", icon: InformationCircleIcon, color: "text-sky-500" },
  FAQ: { label: "الأسئلة الشائعة", icon: InformationCircleIcon, color: "text-orange-500" },
  PAYMENT_METHODS: { label: "طرق الدفع", icon: GlobeAltIcon, color: "text-teal-500" },
  CUSTOM: { label: "صفحة مخصصة", icon: DocumentTextIcon, color: "text-gray-500" },
};

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const StorePages: React.FC = () => {
  const { user } = useAuth();

  /** Build the public storefront URL for a given page slug */
  const getPageUrl = useCallback(
    (slug: string): string => {
      const company = user?.company;
      if (!company) return "";
      return buildStorefrontPreviewPath(`/${slug}`, {
        companyId: user?.companyId ?? undefined,
        companySlug: company.slug ?? undefined,
        customDomain: company.customDomain ?? undefined,
      });
    },
    [user],
  );
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<StorePage | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    pageType: "CUSTOM",
    isActive: true,
    showInFooter: true,
    showInMenu: false,
    order: 0,
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiUrl()}/store-pages/list?includeInactive=true`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ companyId: user?.companyId }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setPages(data.data);
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
      toast.error("حدث خطأ أثناء جلب الصفحات");
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPages = async () => {
    try {
      const toastId = toast.loading("جاري إنشاء الصفحات الافتراضية...");
      const response = await fetch(`${getApiUrl()}/store-pages/initialize`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ companyId: user?.companyId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("تم إنشاء الصفحات الافتراضية بنجاح!", { id: toastId });
        fetchPages();
      } else {
        toast.error(data.error || "فشل في إنشاء الصفحات", { id: toastId });
      }
    } catch (error) {
      console.error("Error initializing pages:", error);
      toast.error("حدث خطأ أثناء إنشاء الصفحات");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.slug) {
      toast.error("يرجى تعبئة الحقول المطلوبة (العنوان والرابط)");
      return;
    }
    
    try {
      const toastId = toast.loading(editingPage ? "جاري التحديث..." : "جاري الحفظ...");
      const url = editingPage
        ? `${getApiUrl()}/store-pages/page/${editingPage.id}`
        : `${getApiUrl()}/store-pages/`;

      const response = await fetch(url, {
        method: editingPage ? "PUT" : "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...formData, companyId: user?.companyId }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingPage ? "تم تحديث الصفحة بنجاح!" : "تم إنشاء الصفحة بنجاح!", { id: toastId });
        setShowModal(false);
        resetForm();
        fetchPages();
      } else {
        toast.error(data.error || "فشل في حفظ الصفحة", { id: toastId });
      }
    } catch (error) {
      console.error("Error saving page:", error);
      toast.error("حدث خطأ أثناء حفظ الصفحة");
    }
  };

  const handleEdit = (page: StorePage) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      pageType: page.pageType,
      isActive: page.isActive,
      showInFooter: page.showInFooter,
      showInMenu: page.showInMenu,
      order: page.order,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (pageId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الصفحة نهائياً؟")) return;

    try {
      const toastId = toast.loading("جاري الحذف...");
      const response = await fetch(
        `${getApiUrl()}/store-pages/page/${pageId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ companyId: user?.companyId }),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("تم حذف الصفحة بنجاح!", { id: toastId });
        fetchPages();
      } else {
        toast.error(data.error || "فشل في حذف الصفحة", { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error("حدث خطأ أثناء حذف الصفحة");
    }
  };

  const toggleStatus = async (pageId: string) => {
    try {
      const response = await fetch(
        `${getApiUrl()}/store-pages/page/${pageId}/toggle`,
        {
          method: "PATCH",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ companyId: user?.companyId }),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("تم تحديث حالة الصفحة");
        fetchPages();
      } else {
        toast.error(data.error || "فشل في تغيير حالة الصفحة");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("حدث خطأ أثناء تغيير حالة الصفحة");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      pageType: "CUSTOM",
      isActive: true,
      showInFooter: true,
      showInMenu: false,
      order: 0,
      metaTitle: "",
      metaDescription: "",
    });
    setEditingPage(null);
  };

  if (loading && pages.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-500"></div>
        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">جاري تحميل الصفحات...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 🌟 Header Section */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-900/30 dark:text-indigo-300">
            <DocumentTextIcon className="mr-1.5 h-3.5 w-3.5" />
            إدارة المحتوى
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            صفحات المتجر
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            أدر محتوى متجرك من سياسات، شروط استخدام، وصفحات تعريفية بطريقة احترافية. ستظهر هذه الصفحات في الفوتر أو الروابط المخصصة في واجهة المتجر.
          </p>
        </div>
        
        <div className="flex shrink-0 items-center gap-3">
          {pages.length === 0 && (
            <button
              onClick={initializeDefaultPages}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <ShieldCheckIcon className="ml-2 h-5 w-5 opacity-70" />
              توليد الصفحات الأساسية
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="ml-2 h-5 w-5" />
            صفحة جديدة
          </button>
        </div>
      </div>

      {/* 🌟 Content Area */}
      {pages.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/20">
          <div className="mb-6 rounded-full bg-white p-4 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-white/10">
            <DocumentTextIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">لا توجد صفحات حالياً</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            يمكنك البدء من الصفر بإنشاء صفحة جديدة، أو استخدام المولد الآلي لإنشاء سياسات المتجر الأساسية لضمان ثقة العملاء.
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={initializeDefaultPages}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              توليد آلي للسياسات
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              إنشاء صفحة مخصصة
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pages.map((page) => {
            const pageTypeData = PAGE_TYPES[page.pageType as keyof typeof PAGE_TYPES] || PAGE_TYPES.CUSTOM;
            const TypeIcon = pageTypeData.icon;

            return (
              <div
                key={page.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-gray-800/80 ${
                  page.isActive
                    ? "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                    : "border-gray-200 opacity-60 dark:border-gray-700"
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 ${pageTypeData.color}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => toggleStatus(page.id)}
                    className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                    title={page.isActive ? "إيقاف الصفحة" : "تفعيل الصفحة"}
                  >
                    {page.isActive ? (
                      <EyeIcon className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <EyeSlashIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="mb-6 flex-1">
                  <h3 className="line-clamp-1 text-lg font-bold text-gray-900 dark:text-white" title={page.title}>
                    {page.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium dark:bg-gray-800">
                      {pageTypeData.label}
                    </span>
                    {getPageUrl(page.slug) ? (
                      <a
                        href={getPageUrl(page.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 truncate text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                        title={i18n.t("storePages.viewPageWithSlug", { slug: page.slug })}
                      >
                        /{page.slug}
                        <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <span className="truncate">/{page.slug}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    {page.showInFooter && (
                      <span className="inline-flex h-6 items-center rounded-full bg-gray-100 px-2.5 text-[10px] font-bold tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        الفوتر
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {getPageUrl(page.slug) && (
                      <a
                        href={getPageUrl(page.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                        title={i18n.t("storePages.viewPageOnStore")}
                      >
                        <GlobeAltIcon className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(page)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 Full Screen Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/70" onClick={() => setShowModal(false)} />

          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <div className="relative w-full max-w-5xl transform overflow-hidden rounded-3xl bg-white text-right align-middle shadow-2xl transition-all dark:bg-gray-900">
              
              {/* Modal Header */}
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-800/30 sm:px-8 sm:py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                      <DocumentTextIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {editingPage ? "تعديل محتوى الصفحة" : "إنشاء صفحة جديدة"}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {editingPage ? "تحديث سياسات ومحتوى الصفحة" : "أضف صفحة جديدة لمتجرك"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="rounded-full bg-white p-2 text-gray-400 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-600 dark:bg-gray-800 dark:ring-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <span className="sr-only">Close panel</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-6 sm:px-8">
                <form id="page-form" onSubmit={handleSubmit} className="space-y-8">
                  {/* Grid 1: Basic Info */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="col-span-1 lg:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-gray-900 dark:text-white">
                        العنوان <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6"
                        placeholder="مثال: سياسة الاسترجاع"
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label className="mb-1.5 block text-sm font-semibold text-gray-900 dark:text-white">
                        نوع الصفحة
                      </label>
                      <select
                        value={formData.pageType}
                        onChange={(e) => setFormData({ ...formData, pageType: e.target.value })}
                        className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6"
                      >
                        {Object.entries(PAGE_TYPES).map(([key, value]) => (
                          <option key={key} value={key}>
                            {value.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 lg:col-span-3">
                      <label className="mb-1.5 block text-sm font-semibold text-gray-900 dark:text-white">
                        مسار الرابط (Slug) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex rounded-xl shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 dark:ring-gray-700">
                        <span className="flex select-none items-center pl-3 pr-4 text-gray-500 dark:text-gray-400 sm:text-sm" dir="ltr">
                          /pages/
                        </span>
                        <input
                          type="text"
                          required
                          value={formData.slug}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                            })
                          }
                          className="block w-full min-w-0 flex-1 rounded-none rounded-r-xl border-0 bg-transparent py-2.5 pl-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 dark:text-white sm:text-sm sm:leading-6"
                          placeholder="return-policy"
                          dir="ltr"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        يجب أن يحتوي على حروف إنجليزية وأرقام وعلامة "-" فقط.
                      </p>
                    </div>
                  </div>

                  {/* Rich Text Editor */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-900 dark:text-white">
                      محتوى الصفحة
                    </label>
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <RichTextEditor
                        value={formData.content}
                        onChange={(val) => setFormData({ ...formData, content: val })}
                        placeholder="اكتب محتوى الصفحة هنا..."
                      />
                    </div>
                  </div>

                  {/* SEO Section */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <h4 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">إعدادات محركات البحث (SEO)</h4>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          عنوان الميتا (Meta Title)
                        </label>
                        <input
                          type="text"
                          value={formData.metaTitle}
                          onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                          className="block w-full rounded-lg border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-xs sm:leading-6"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          وصف الميتا (Meta Description)
                        </label>
                        <input
                          type="text"
                          value={formData.metaDescription}
                          onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                          className="block w-full rounded-lg border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-xs sm:leading-6"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Settings Switches */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="relative flex cursor-pointer items-start justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800/80">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">حالة النشر</span>
                        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">تفعيل ظهور الصفحة للمستخدمين</span>
                      </div>
                      <div className="ml-4 flex h-6 items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[18px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-indigo-800" dir="ltr"></div>
                      </div>
                    </label>

                    <label className="relative flex cursor-pointer items-start justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800/80">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">الفوتر السُفلي</span>
                        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">إظهار الرابط في أسفل المتجر</span>
                      </div>
                      <div className="ml-4 flex h-6 items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.showInFooter}
                          onChange={(e) => setFormData({ ...formData, showInFooter: e.target.checked })}
                        />
                        <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[18px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-indigo-800" dir="ltr"></div>
                      </div>
                    </label>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-100 bg-gray-50/80 px-6 py-5 dark:border-gray-800 dark:bg-gray-800/80 sm:px-8 sm:flex sm:flex-row-reverse sm:gap-3">
                <button
                  type="submit"
                  form="page-form"
                  className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                >
                  {editingPage ? "حفظ التعديلات" : "إضافة الصفحة"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePages;
