import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, PackageSearch, ShoppingBag, ShoppingCart } from "lucide-react";

import {
  addToCart,
  formatCurrency,
  getCatalog,
  type DentalWorkType,
} from "./shared";
import DentalPortalToast from "./DentalPortalToast";

interface CartNotice {
  message: string;
  to?: string;
  actionLabel?: string;
}

const DentalPortalCatalogPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const navigate = useNavigate();
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<CartNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCatalog()
      .then((items) => {
        if (!cancelled) setWorkTypes(items);
      })
      .catch(() => {
        if (!cancelled) setError(t("dentalPortal.catalog.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleAddToCart = (workType: DentalWorkType) => {
    addToCart({
      workTypeId: workType.id,
      workTypeName: workType.name,
      price: workType.price,
      leadTimeDays: workType.leadTimeDays,
    });
    setNotice({
      message: t("dentalPortal.cart.added"),
      to: "/dental-portal/cart",
      actionLabel: t("dentalPortal.cart.toCart"),
    });
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        <p className="mt-3 text-sm">{t("dentalPortal.catalog.loading")}</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600">{error}</div>;
  }

  if (workTypes.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <PackageSearch size={48} className="mx-auto mb-3 text-gray-300" />
        <p>{t("dentalPortal.catalog.empty")}</p>
      </div>
    );
  }

  return (
    <div>
      {notice ? (
        <DentalPortalToast
          message={notice.message}
          to={notice.to}
          actionLabel={notice.actionLabel}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dentalPortal.catalog.title")}
        </h1>
        <p className="mt-1 text-gray-500">
          {t("dentalPortal.catalog.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workTypes.map((workType) => (
          <div
            key={workType.id}
            className="flex flex-col rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900">{workType.name}</h3>
              {workType.category ? (
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                  {workType.category}
                </span>
              ) : null}
            </div>

            <div className="mb-4 space-y-1.5 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-gray-400" />
                <span className="font-semibold text-gray-900">
                  {formatCurrency(workType.price)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <span>
                  {workType.leadTimeDays}{" "}
                  {t("dentalPortal.catalog.days")} —{" "}
                  {t("dentalPortal.catalog.leadTime")}
                </span>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2">
              <button
                onClick={() =>
                  navigate(
                    `/dental-portal/new-order?workTypeId=${encodeURIComponent(
                      workType.id,
                    )}`,
                  )
                }
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                {t("dentalPortal.catalog.order")}
              </button>
              <button
                onClick={() => handleAddToCart(workType)}
                title={t("dentalPortal.catalog.addToCart")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ShoppingCart size={16} />
                <span className="hidden sm:inline">
                  {t("dentalPortal.catalog.addToCart")}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DentalPortalCatalogPage;