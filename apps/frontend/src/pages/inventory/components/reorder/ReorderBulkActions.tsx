import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "../../../../components/ui/pagination";

interface ReorderBulkActionsProps {
  selectedCount: number;
  bulkValue: string;
  onBulkValueChange: (val: string) => void;
  onApplyBulk: () => void;
  bulkBusy: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const ReorderBulkActions: React.FC<ReorderBulkActionsProps> = ({
  selectedCount,
  bulkValue,
  onBulkValueChange,
  onApplyBulk,
  bulkBusy,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums font-mono">
          {t("reorderPoints.selected", "المحدد: {{count}}").replace(
            "{{count}}",
            String(selectedCount),
          )}
        </span>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={bulkValue}
              onChange={(event) => onBulkValueChange(event.target.value)}
              placeholder={t("reorderPoints.bulkPlaceholder", "نقطة جديدة...") as string}
              className="w-28 h-9 text-sm tabular-nums font-mono"
            />
            <Button
              onClick={onApplyBulk}
              disabled={bulkBusy}
              className="h-9 text-sm cursor-pointer"
            >
              {bulkBusy
                ? t("reorderPoints.saving", "جاري الحفظ...")
                : t("reorderPoints.applyBulk", "تعيين للمحدد")}
            </Button>
          </div>
        )}
      </div>

      <Pagination>
        <PaginationContent>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
            const page = index + 1;
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(page);
                  }}
                  isActive={page === currentPage}
                  className="tabular-nums font-mono cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
        </PaginationContent>
      </Pagination>
    </div>
  );
};
