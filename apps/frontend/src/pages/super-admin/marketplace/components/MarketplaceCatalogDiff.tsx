import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Alert } from "../../../../components/ui/alert";
import { Badge } from "../../../../components/ui/badge";
import { Separator } from "../../../../components/ui/separator";
import type { CatalogDiffPayload } from "../types/marketplaceAdminTypes";

export interface MarketplaceCatalogDiffProps {
  catalogDiff: CatalogDiffPayload | null;
  catalogDiffLoading: boolean;
  catalogDiffError: string | null;
  onRefreshCatalogDiff: () => void;
}

export const formatDiffValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "[]";
  }
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const MarketplaceCatalogDiff: React.FC<MarketplaceCatalogDiffProps> = ({
  catalogDiff,
  catalogDiffLoading,
  catalogDiffError,
  onRefreshCatalogDiff,
}) => {
  const [showCatalogDiffDetails, setShowCatalogDiffDetails] = useState(false);

  const hasDiffData = Boolean(catalogDiff?.totals);
  const comparedAtLabel = catalogDiff?.comparedAt
    ? new Date(catalogDiff.comparedAt).toLocaleString("ar-EG")
    : "غير متاح";

  const appDiffEntries =
    (catalogDiff?.apps?.missingInDb?.length || 0) +
    (catalogDiff?.apps?.extraInDb?.length || 0) +
    (catalogDiff?.apps?.changed?.length || 0);

  const bundleDiffEntries =
    (catalogDiff?.bundles?.missingInDb?.length || 0) +
    (catalogDiff?.bundles?.extraInDb?.length || 0) +
    (catalogDiff?.bundles?.changed?.length || 0);

  return (
    <div
      className={`rounded-2xl border bg-card text-card-foreground shadow-sm p-4 ${
        (catalogDiff?.totals?.diffEntries || 0) > 0
          ? "border-yellow-500/60 dark:border-yellow-500/40"
          : "border-green-500/60 dark:border-green-500/40"
      }`}
    >
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2 mb-3">
        <div>
          <h3 className="text-base font-semibold">
            فرق الكاتالوج (الملفات مقابل قاعدة البيانات)
          </h3>
          <span className="text-xs text-muted-foreground">
            آخر مقارنة: {comparedAtLabel}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshCatalogDiff}
            disabled={catalogDiffLoading}
          >
            <RefreshCw className="h-4 w-4 ml-1" />
            {catalogDiffLoading ? "جارٍ التحديث..." : "تحديث"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCatalogDiffDetails((prev) => !prev)}
            disabled={!hasDiffData}
          >
            {showCatalogDiffDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          </Button>
        </div>
      </div>

      {catalogDiffError && (
        <Alert
          variant="default"
          className="mb-3 border-yellow-500/50 text-yellow-700 dark:border-yellow-500/40 dark:text-yellow-400"
        >
          {catalogDiffError}
        </Alert>
      )}

      {hasDiffData ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl bg-muted/50 p-2.5">
            <span className="text-xs text-muted-foreground">إجمالي الفرق</span>
            <p className="mt-0.5 text-lg font-bold tabular-nums font-mono">
              {catalogDiff?.totals?.diffEntries || 0}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <span className="text-xs text-muted-foreground">التطبيقات (الملفات/قاعدة البيانات)</span>
            <p className="mt-0.5 text-lg font-bold tabular-nums font-mono">
              {catalogDiff?.totals?.catalogApps || 0}/{catalogDiff?.totals?.dbApps || 0}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <span className="text-xs text-muted-foreground">الباقات (الملفات/قاعدة البيانات)</span>
            <p className="mt-0.5 text-lg font-bold tabular-nums font-mono">
              {catalogDiff?.totals?.catalogBundles || 0}/{catalogDiff?.totals?.dbBundles || 0}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <span className="text-xs text-muted-foreground">فروقات التطبيقات</span>
            <p className="mt-0.5 text-lg font-bold tabular-nums font-mono">{appDiffEntries}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">فروقات الباقات</span>
            <p className="mt-0.5 text-lg font-bold tabular-nums font-mono">{bundleDiffEntries}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">لا توجد بيانات فرق متاحة حالياً.</p>
      )}

      {showCatalogDiffDetails && hasDiffData && (
        <div>
          <Separator className="my-2" />
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-6">
              <p className="text-sm font-semibold text-muted-foreground">تطبيقات</p>
              <div className="mb-1">
                <span className="text-xs text-muted-foreground">
                  موجود بالملفات وغير موجود في DB (
                  <span className="tabular-nums font-mono">
                    {catalogDiff?.apps?.missingInDb?.length || 0}
                  </span>
                  )
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {(catalogDiff?.apps?.missingInDb || []).map((slug) => (
                    <Badge key={`app-miss-${slug}`} variant="default" className="bg-amber-500 text-xs">
                      {slug}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mb-1">
                <span className="text-xs text-muted-foreground">
                  موجود في DB وغير موجود بالملفات (
                  <span className="tabular-nums font-mono">
                    {catalogDiff?.apps?.extraInDb?.length || 0}
                  </span>
                  )
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {(catalogDiff?.apps?.extraInDb || []).map((slug) => (
                    <Badge key={`app-extra-${slug}`} variant="default" className="bg-blue-500 text-xs">
                      {slug}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  عناصر مختلفة (
                  <span className="tabular-nums font-mono">
                    {catalogDiff?.apps?.changed?.length || 0}
                  </span>
                  )
                </span>
                <ul className="space-y-1 mt-0.5 max-h-[220px] overflow-auto">
                  {(catalogDiff?.apps?.changed || []).map((entry) => (
                    <li key={`app-changed-${entry.slug}`} className="block py-0.5">
                      <p className="text-sm leading-6 font-bold">{entry.slug}</p>
                      {(entry.changes || []).slice(0, 3).map((change) => (
                        <span
                          key={`${entry.slug}-${change.field}`}
                          className="text-xs text-muted-foreground block font-mono"
                        >
                          {change.field}: [{formatDiffValue(change.catalog)}] {"->"} [
                          {formatDiffValue(change.db)}]
                        </span>
                      ))}
                      {(entry.changes || []).length > 3 && (
                        <span className="text-xs text-muted-foreground block">
                          +{entry.changes.length - 3} تغييرات إضافية
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="col-span-12 md:col-span-6">
              <p className="text-sm font-semibold text-muted-foreground">باقات</p>
              <div className="mb-1">
                <span className="text-xs text-muted-foreground">
                  موجود بالملفات وغير موجود في DB (
                  <span className="tabular-nums font-mono">
                    {catalogDiff?.bundles?.missingInDb?.length || 0}
                  </span>
                  )
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {(catalogDiff?.bundles?.missingInDb || []).map((slug) => (
                    <Badge key={`bundle-miss-${slug}`} variant="default" className="bg-amber-500 text-xs">
                      {slug}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mb-1">
                <span className="text-xs text-muted-foreground">
                  موجود في DB وغير موجود بالملفات (
                  <span className="tabular-nums font-mono">
                    {catalogDiff?.bundles?.extraInDb?.length || 0}
                  </span>
                  )
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {(catalogDiff?.bundles?.extraInDb || []).map((slug) => (
                    <Badge key={`bundle-extra-${slug}`} variant="default" className="bg-blue-500 text-xs">
                      {slug}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  عناصر مختلفة (
                  <span className="tabular-nums font-mono">
                    {catalogDiff?.bundles?.changed?.length || 0}
                  </span>
                  )
                </span>
                <ul className="space-y-1 mt-0.5 max-h-[220px] overflow-auto">
                  {(catalogDiff?.bundles?.changed || []).map((entry) => (
                    <li key={`bundle-changed-${entry.slug}`} className="block py-0.5">
                      <p className="text-sm leading-6 font-bold">{entry.slug}</p>
                      {(entry.changes || []).slice(0, 3).map((change) => (
                        <span
                          key={`${entry.slug}-${change.field}`}
                          className="text-xs text-muted-foreground block font-mono"
                        >
                          {change.field}: [{formatDiffValue(change.catalog)}] {"->"} [
                          {formatDiffValue(change.db)}]
                        </span>
                      ))}
                      {(entry.changes || []).length > 3 && (
                        <span className="text-xs text-muted-foreground block">
                          +{entry.changes.length - 3} تغييرات إضافية
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceCatalogDiff;
