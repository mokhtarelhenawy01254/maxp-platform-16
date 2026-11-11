/**
 * Lead Forms Management — إدارة نماذج جمع البيانات (Lead Generation)
 */

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, RefreshCw, Search } from "lucide-react";
import {
  facebookAdsService,
  type FacebookPage,
  type LeadFormPageInfo,
  type LeadFormSummary,
} from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import LeadFormsTable from "./LeadFormsTable";
import LeadFormCreateModal from "./LeadFormCreateModal";
import LeadFormLeadsModal from "./LeadFormLeadsModal";

const BTN_GHOST =
  "flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60";
const BTN_PRIMARY =
  "flex items-center gap-2 px-4 py-2 text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-60";

const LeadFormsManagement: React.FC = () => {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [activePage, setActivePage] = useState<LeadFormPageInfo | null>(null);
  const [forms, setForms] = useState<LeadFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leadsForm, setLeadsForm] = useState<LeadFormSummary | null>(null);

  const loadForms = async (pageId: string) => {
    if (!pageId) {
      setForms([]);
      setActivePage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await facebookAdsService.getLeadForms(pageId);
      setForms(result.data);
      setActivePage(result.page);
    } catch (error: any) {
      console.error("Error loading lead forms:", error);
      setForms([]);
      setActivePage({ id: pageId, name: null });
      toast.error(error?.response?.data?.error || "فشل في تحميل النماذج");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setPagesLoading(true);
      let options: FacebookPage[] = [];
      try {
        const result = await facebookAdsService.getFacebookPageOptions();
        options = (result.data || []).filter((page) => Boolean(page?.id));
      } catch (error) {
        console.error("Error loading Facebook pages:", error);
        toast.error("فشل في تحميل الصفحات المتصلة");
      }
      if (cancelled) return;

      const readyPages = options.filter((page) => page.status === "READY");
      const usablePages = readyPages.length > 0 ? readyPages : options;
      setPages(usablePages);
      setPagesLoading(false);

      if (usablePages.length === 0) {
        setLoading(false);
        return;
      }

      setSelectedPageId(usablePages[0].id);
      await loadForms(usablePages[0].id);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePageChange = (pageId: string) => {
    setSelectedPageId(pageId);
    void loadForms(pageId);
  };

  const handleFormCreated = async (pageId: string) => {
    if (pageId === selectedPageId) {
      await loadForms(pageId);
      return;
    }
    handlePageChange(pageId);
  };

  const filteredForms = forms.filter((form) =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const pageLabel = activePage?.name || activePage?.id || "-";

  return (
    <div
      className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900"
      dir="rtl"
    >
      <FacebookAdsModuleNav />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            نماذج جمع البيانات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إدارة نماذج Lead Generation وجمع بيانات العملاء المحتملين
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="lead-forms-page"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              الصفحة
            </label>
            <select
              id="lead-forms-page"
              value={selectedPageId}
              onChange={(e) => handlePageChange(e.target.value)}
              disabled={pagesLoading || pages.length === 0}
              className="min-w-52 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60"
            >
              {pagesLoading && <option value="">جاري تحميل الصفحات...</option>}
              {!pagesLoading && pages.length === 0 && (
                <option value="">لا توجد صفحات متصلة</option>
              )}
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name || page.id}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => void loadForms(selectedPageId)}
            disabled={!selectedPageId}
            className={BTN_GHOST}
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            disabled={pages.length === 0}
            className={BTN_PRIMARY}
          >
            <Plus className="w-4 h-4" />
            إنشاء نموذج جديد
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="البحث في النماذج..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <LeadFormsTable
        loading={loading}
        forms={filteredForms}
        pageLabel={pageLabel}
        hasPages={pages.length > 0}
        onViewLeads={setLeadsForm}
      />

      {showCreateModal && (
        <LeadFormCreateModal
          pages={pages}
          defaultPageId={selectedPageId || pages[0]?.id || ""}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleFormCreated}
        />
      )}

      {leadsForm && (
        <LeadFormLeadsModal
          form={leadsForm}
          onClose={() => setLeadsForm(null)}
        />
      )}
    </div>
  );
};

export default LeadFormsManagement;
