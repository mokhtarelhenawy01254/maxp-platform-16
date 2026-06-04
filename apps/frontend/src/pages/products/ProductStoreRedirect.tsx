import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import { buildStoreUrl } from "../../utils/storeUrl";

const ProductStoreRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!id || hasRedirected || isLoading) return;

    let isCancelled = false;

    const redirectToStorefront = async () => {
      const slug = user?.company?.slug;
      const companyId = user?.companyId || user?.company?.id || null;
      const customDomain = user?.company?.customDomain;
      let productKey = id;

      try {
        const response = await apiClient.get(`/products/${id}`);
        const fetchedProduct = response.data?.data;
        if (typeof fetchedProduct?.slug === "string" && fetchedProduct.slug.trim()) {
          productKey = fetchedProduct.slug.trim();
        }
      } catch (error) {
        console.warn("Could not resolve product slug for storefront redirect, falling back to product id.", error);
      }

      const productPath = `/product/${encodeURIComponent(productKey)}`;

      if (slug && slug.trim().length > 0) {
        const url = buildStoreUrl(
          slug,
          productPath,
          customDomain || undefined,
          companyId,
        );
        if (!isCancelled) {
          setHasRedirected(true);
          window.location.href = url;
        }
        return;
      }

      const fallbackCompanyId =
        user?.companyId ||
        user?.company?.id ||
        localStorage.getItem("companyId") ||
        new URLSearchParams(window.location.search).get("companyId");

      if (fallbackCompanyId) {
        localStorage.setItem("storefront_companyId", fallbackCompanyId);
      }

      const fallbackParams = new URLSearchParams();
      if (fallbackCompanyId) {
        fallbackParams.set("companyId", fallbackCompanyId);
      }

      if (!isCancelled) {
        setHasRedirected(true);
        navigate(`/store${productPath}${fallbackParams.toString() ? `?${fallbackParams.toString()}` : ""}`, { replace: true });
      }
    };

    redirectToStorefront();

    return () => {
      isCancelled = true;
    };
  }, [
    id,
    user?.company?.slug,
    user?.company?.id,
    user?.company?.customDomain,
    user?.companyId,
    hasRedirected,
    isLoading,
    navigate,
  ]);

  if (!id) {
    return <Navigate to="/products" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <div className="text-gray-600 text-sm">جاري فتح المنتج في المتجر...</div>
      </div>
    </div>
  );
};

export default ProductStoreRedirect;
