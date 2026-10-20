import React from "react";
import { Store, Check, Building2, Star, RefreshCw, Search, Eye, Archive } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Alert } from "../../../../components/ui/alert";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Badge } from "../../../../components/ui/badge";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Separator } from "../../../../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import type { StorefrontThemeCatalogItem } from "../../../../services/storefrontThemeCatalogService";

export type ThemeVisibilityFilter =
  | "ALL"
  | "VISIBLE"
  | "HIDDEN"
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED"
  | "FEATURED";

export type ThemePricingFilter = "ALL" | "FREE" | "PAID";

export interface StorefrontThemesToolbarProps {
  draftThemes: StorefrontThemeCatalogItem[];
  filteredThemes: StorefrontThemeCatalogItem[];
  totalCurrentCompanies: number;
  totalPurchases: number;
  defaultTheme: StorefrontThemeCatalogItem | null;
  hiddenOrInactiveThemesCount: number;
  bulkSaving: boolean;
  themeSearchQuery: string;
  setThemeSearchQuery: (q: string) => void;
  visibilityFilter: ThemeVisibilityFilter;
  setVisibilityFilter: (f: ThemeVisibilityFilter) => void;
  pricingFilter: ThemePricingFilter;
  setPricingFilter: (f: ThemePricingFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  themeCategoryOptions: string[];
  allFilteredSelected: boolean;
  toggleFilteredSelection: (checked: boolean) => void;
  selectedThemeIds: string[];
  selectedUsageTotals: { currentCompanies: number; purchases: number };
  bulkPrice: string;
  setBulkPrice: (p: string) => void;
  onRefresh: () => void;
  onEnableAndShowAllThemes: () => void;
  onPersistThemePatch: (
    ids: string[],
    patch: Partial<StorefrontThemeCatalogItem>,
    msg: string,
  ) => void;
  onArchiveThemes: (ids: string[]) => void;
  onApplyBulkPrice: () => void;
}

export const StorefrontThemesToolbar: React.FC<StorefrontThemesToolbarProps> = ({
  draftThemes,
  filteredThemes,
  totalCurrentCompanies,
  totalPurchases,
  defaultTheme,
  hiddenOrInactiveThemesCount,
  bulkSaving,
  themeSearchQuery,
  setThemeSearchQuery,
  visibilityFilter,
  setVisibilityFilter,
  pricingFilter,
  setPricingFilter,
  categoryFilter,
  setCategoryFilter,
  themeCategoryOptions,
  allFilteredSelected,
  toggleFilteredSelection,
  selectedThemeIds,
  selectedUsageTotals,
  bulkPrice,
  setBulkPrice,
  onRefresh,
  onEnableAndShowAllThemes,
  onPersistThemePatch,
  onArchiveThemes,
  onApplyBulkPrice,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">إجمالي القوالب</p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums font-mono">
                {draftThemes.length}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Store className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">قوالب متاحة للتفعيل</p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums font-mono">
                {draftThemes.filter((theme) => theme.isActive).length}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
              <Check className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">شركات تستخدم قالبًا</p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums font-mono">
                {totalCurrentCompanies}
              </p>
            </div>
            <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-500">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">القالب الافتراضي</p>
              <p className="mt-1 text-lg font-bold tracking-tight truncate">
                {defaultTheme ? defaultTheme.name : "غير محدد"}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
              <Star className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert
        variant="default"
        className="border-blue-500/50 text-blue-700 dark:border-blue-500/40 dark:text-blue-400"
      >
        القالب الافتراضي هو الذي يحصل عليه أي متجر جديد عند إنشاء إعدادات المتجر لأول مرة.{" "}
        {defaultTheme
          ? `المحدد حاليًا: ${defaultTheme.name}.`
          : "لم يتم تحديد قالب افتراضي من الكتالوج بعد."}{" "}
        إجمالي عمليات شراء القوالب المسجلة:{" "}
        <span className="tabular-nums font-mono">{totalPurchases}</span>.
      </Alert>

      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2">
        <div>
          <h2 className="text-base font-semibold">كتالوج قوالب المتجر</h2>
          <p className="text-sm text-muted-foreground">
            من هنا يتحكم السوبر أدمن في إتاحة القوالب وتسعيرها للشركات، بينما الشراء
            والتطبيق يتمان من صفحة القوالب داخل متجر التطبيقات.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={onRefresh} disabled={bulkSaving}>
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث البيانات
          </Button>
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            onClick={onEnableAndShowAllThemes}
            disabled={bulkSaving || draftThemes.length === 0}
          >
            <Check className="h-4 w-4 ml-1" />
            {bulkSaving ? "جارٍ الإظهار والتفعيل..." : "إظهار وتفعيل كل القوالب"}
          </Button>
        </div>
      </div>

      {hiddenOrInactiveThemesCount > 0 ? (
        <Alert
          variant="default"
          className="border-yellow-500/50 text-yellow-700 dark:border-yellow-500/40 dark:text-yellow-400"
        >
          يوجد <span className="tabular-nums font-mono">{hiddenOrInactiveThemesCount}</span> قالب غير
          ظاهر للشركات أو غير متاح للتفعيل حاليًا. الزر الجماعي بالأعلى يعيدها كلها إلى
          حالة
          <strong> ظاهر + متاح للتفعيل </strong>
          دفعة واحدة.
        </Alert>
      ) : (
        <Alert
          variant="default"
          className="border-green-500/50 text-green-700 dark:text-green-400 dark:border-green-500/40 dark:text-green-400"
        >
          جميع القوالب الحالية ظاهرة للشركات ومتاحة للتفعيل.
        </Alert>
      )}

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3">
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-12 md:col-span-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-full pr-10"
                placeholder="ابحث بالاسم أو الوصف أو themeId..."
                value={themeSearchQuery}
                onChange={(event) => setThemeSearchQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select
                value={visibilityFilter}
                onValueChange={(v) => setVisibilityFilter(v as ThemeVisibilityFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الحالات</SelectItem>
                  <SelectItem value="VISIBLE">ظاهر للشركات</SelectItem>
                  <SelectItem value="HIDDEN">مخفي</SelectItem>
                  <SelectItem value="ACTIVE">متاح للتفعيل</SelectItem>
                  <SelectItem value="INACTIVE">غير متاح</SelectItem>
                  <SelectItem value="ARCHIVED">مؤرشف</SelectItem>
                  <SelectItem value="FEATURED">مميز</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="space-y-2">
              <Label>التسعير</Label>
              <Select
                value={pricingFilter}
                onValueChange={(v) => setPricingFilter(v as ThemePricingFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الأسعار</SelectItem>
                  <SelectItem value="FREE">مجاني</SelectItem>
                  <SelectItem value="PAID">مدفوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="space-y-2">
              <Label>المجال</Label>
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v ?? "ALL")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل المجالات</SelectItem>
                  {themeCategoryOptions.map((categoryLabel) => (
                    <SelectItem key={categoryLabel} value={categoryLabel}>
                      {categoryLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(checked) => toggleFilteredSelection(checked === true)}
                />
                <span className="text-sm">تحديد المعروض</span>
              </label>
              <Badge variant="secondary" className="text-xs tabular-nums font-mono">
                {filteredThemes.length}/{draftThemes.length}
              </Badge>
            </div>
          </div>
        </div>

        {selectedThemeIds.length > 0 && (
          <div>
            <Separator className="my-2" />
            <div className="flex items-stretch md:items-center justify-between flex-col md:flex-row gap-2">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  <span className="tabular-nums font-mono">{selectedThemeIds.length}</span> قالب محدد
                </p>
                <span className="text-xs text-muted-foreground">
                  مستخدم حاليًا لدى{" "}
                  <span className="tabular-nums font-mono">
                    {selectedUsageTotals.currentCompanies}
                  </span>{" "}
                  شركة • مشتريات مسجلة{" "}
                  <span className="tabular-nums font-mono">
                    {selectedUsageTotals.purchases}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkSaving}
                  onClick={() =>
                    onPersistThemePatch(
                      selectedThemeIds,
                      { isActive: true, isPublic: true },
                      "تم إظهار وتفعيل القوالب المحددة",
                    )
                  }
                >
                  <Eye className="h-4 w-4 ml-1" />
                  إظهار المحدد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-amber-500 border-amber-500"
                  disabled={bulkSaving}
                  onClick={() =>
                    onPersistThemePatch(
                      selectedThemeIds,
                      { isActive: false },
                      "تم تعطيل القوالب المحددة",
                    )
                  }
                >
                  تعطيل المحدد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-500"
                  disabled={bulkSaving}
                  onClick={() => onArchiveThemes(selectedThemeIds)}
                >
                  <Archive className="h-4 w-4 ml-1" />
                  أرشفة المحدد
                </Button>
                <Input
                  className="w-[130px] h-9 tabular-nums font-mono"
                  type="number"
                  placeholder="سعر موحد"
                  value={bulkPrice}
                  onChange={(event) => setBulkPrice(event.target.value)}
                />
                <Button
                  size="sm"
                  variant="default"
                  disabled={bulkSaving}
                  onClick={onApplyBulkPrice}
                >
                  تطبيق السعر
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StorefrontThemesToolbar;
