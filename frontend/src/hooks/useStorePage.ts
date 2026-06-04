import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getApiUrl } from "../config/environment";

interface StorePageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  pageType: string;
  metaTitle?: string;
  metaDescription?: string;
  updatedAt: string;
}

export const useStorePage = (slug?: string) => {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<StorePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        let companyId = searchParams.get("companyId");

        if (!companyId) {
          companyId = localStorage.getItem("companyId");
        }

        if (!companyId && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          companyId = urlParams.get("companyId");
        }

        if (!companyId) {
          companyId = sessionStorage.getItem("currentCompanyId");
        }

        if (!companyId) {
          setError("معرف الشركة مفقود");
          setLoading(false);
          return;
        }

        if (!slug) {
          setError("الصفحة غير محددة");
          setLoading(false);
          return;
        }

        localStorage.setItem("companyId", companyId);
        sessionStorage.setItem("currentCompanyId", companyId);

        const response = await fetch(
          `${getApiUrl()}/store-pages/${companyId}/slug/${slug}`,
        );
        const data = await response.json();

        if (data.success) {
          setPage(data.data);

          if (data.data.metaTitle) {
            document.title = data.data.metaTitle;
          } else {
            document.title = data.data.title;
          }

          if (data.data.metaDescription) {
            const metaDescription = document.querySelector(
              'meta[name="description"]',
            );
            if (metaDescription) {
              metaDescription.setAttribute("content", data.data.metaDescription);
            }
          }
        } else {
          setError(data.error || "الصفحة غير موجودة");
        }
      } catch (fetchError) {
        console.error("Error fetching page:", fetchError);
        setError("حدث خطأ أثناء تحميل الصفحة");
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug, searchParams]);

  return {
    page,
    loading,
    error,
  };
};
