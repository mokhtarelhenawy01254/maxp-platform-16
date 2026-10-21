import React from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { Card, CardHeader } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import type { ReorderView } from "./types";

interface ReorderFilterBarProps {
  view: ReorderView;
  onViewChange: (view: ReorderView) => void;
  search: string;
  onSearchChange: (search: string) => void;
  stockFilter: string;
  onStockFilterChange: (filter: string) => void;
}

export const ReorderFilterBar: React.FC<ReorderFilterBarProps> = ({
  view,
  onViewChange,
  search,
  onSearchChange,
  stockFilter,
  onStockFilterChange,
}) => {
  const { t } = useTranslation();

  const viewTabs: { key: ReorderView; label: string }[] = [
    { key: "product", label: t("reorderPoints.viewProduct", "بالكل (مجمع)") },
    { key: "warehouse", label: t("reorderPoints.viewWarehouse", "بالمخزن") },
    { key: "preorder", label: t("reorderPoints.viewPreOrder", "الطلب المسبق") },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onViewChange(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  view === tab.key
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t("reorderPoints.search", "بحث بالاسم أو SKU...") as string}
                className="pl-9 w-56"
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <Select
                value={stockFilter}
                onValueChange={(value) => onStockFilterChange(value ?? "all")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("reorderPoints.all", "الكل")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reorderPoints.all", "الكل")}</SelectItem>
                  <SelectItem value="low">{t("reorderPoints.filterLow", "مخزون منخفض")}</SelectItem>
                  <SelectItem value="out">{t("reorderPoints.filterOut", "نفد")}</SelectItem>
                  <SelectItem value="safe">{t("reorderPoints.filterSafe", "متوفر")}</SelectItem>
                  <SelectItem value="preorder">{t("reorderPoints.filterPreOrder", "طلب مسبق")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
