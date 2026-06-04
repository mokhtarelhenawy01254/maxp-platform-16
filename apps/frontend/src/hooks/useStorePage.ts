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

export const useStorePage = (slug?: string, companyId?: string) => {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<StorePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      setPage(null);

      try {
        let resolvedCompanyId = companyId || searchParams.get("companyId");

        if (!resolvedCompanyId) {
          resolvedCompanyId =
            localStorage.getItem("storefront_companyId") ||
            localStorage.getItem("companyId");
        }

        if (!resolvedCompanyId && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          resolvedCompanyId = urlParams.get("companyId");
        }

        if (!resolvedCompanyId) {
          resolvedCompanyId = sessionStorage.getItem("currentCompanyId");
        }

        if (!resolvedCompanyId) {
          setError("معرف الشركة مفقود");
          setLoading(false);
          return;
        }

        if (!slug) {
          setError("الصفحة غير محددة");
          setLoading(false);
          return;
        }

        localStorage.setItem("companyId", resolvedCompanyId);
        sessionStorage.setItem("currentCompanyId", resolvedCompanyId);

        const response = await fetch(
          `${getApiUrl()}/store-pages/${resolvedCompanyId}/slug/${slug}`,
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
  }, [slug, companyId, searchParams]);

  return {
    page,
    loading,
    error,
  };
};
