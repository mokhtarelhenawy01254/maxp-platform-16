import React from "react";
import { Star, Copy, Download, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Switch } from "../../../../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import type { MarketplaceManagementItem } from "../types/marketplaceAdminTypes";
import {
  categoryLabels,
  getCategoryColor,
  getAppGradient,
  getAppIcon,
} from "../utils/marketplaceCategoryUtils";

export interface MarketplaceAppTableProps {
  apps: MarketplaceManagementItem[];
  onNavigateDetails: (id: string) => void;
  onCopySlug: (slug?: string) => void;
  onEdit: (app: MarketplaceManagementItem) => void;
  onDelete: (id: string) => void;
  onQuickToggle: (
    app: MarketplaceManagementItem,
    field: "isActive" | "isPublic" | "isFeatured",
    value: boolean,
  ) => void;
}

export const MarketplaceAppTable: React.FC<MarketplaceAppTableProps> = ({
  apps,
  onNavigateDetails,
  onCopySlug,
  onEdit,
  onDelete,
  onQuickToggle,
}) => {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">التطبيق والمعرّف</TableHead>
              <TableHead className="w-[140px]">الفئة</TableHead>
              <TableHead className="w-[140px]">التسعير</TableHead>
              <TableHead className="w-[170px]">التثبيتات والإيراد</TableHead>
              <TableHead className="w-[210px]">حالة التشغيل والظهور</TableHead>
              <TableHead className="w-[150px]">المسار</TableHead>
              <TableHead className="w-[120px] text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => {
              const price = app.monthlyPrice || 0;
              const installs = app._count?.installations || app.installCount || 0;
              const monthlyRevenue = price > 0 ? installs * price : 0;
              const monthlyPrice = app.monthlyPrice || 0;

              return (
                <TableRow key={app.id} className="hover:bg-muted/40 transition-colors">
                  {/* App & Slug */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm ${getAppGradient(
                          app.category,
                        )}`}
                      >
                        {getAppIcon(app)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => app.id && onNavigateDetails(app.id)}
                            className="font-bold text-sm cursor-pointer hover:text-primary transition-colors truncate"
                          >
                            {app.name}
                          </span>
                          {app.isFeatured && (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {app.slug && (
                            <button
                              type="button"
                              onClick={() => onCopySlug(app.slug)}
                              className="font-mono text-[0.7rem] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 bg-muted/60 px-1.5 py-0.2 rounded"
                              title="نسخ المعرف"
                            >
                              <span>{app.slug}</span>
                              <Copy className="h-2.5 w-2.5 opacity-60" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    {app.category ? (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap"
                        style={{ backgroundColor: getCategoryColor(app.category) }}
                      >
                        {categoryLabels[app.category] || app.category}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Pricing */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-primary tabular-nums font-mono">
                        {monthlyPrice > 0 ? `${monthlyPrice.toLocaleString("ar-EG")} ج/شهر` : "مجاني"}
                      </p>
                      {app.yearlyPrice ? (
                        <p className="text-[0.7rem] text-muted-foreground tabular-nums font-mono">
                          سنوي: {app.yearlyPrice.toLocaleString("ar-EG")} ج
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* Stats */}
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="tabular-nums font-mono">
                          {installs.toLocaleString("ar-EG")} تثبيت
                        </span>
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums font-mono">
                        {monthlyRevenue > 0
                          ? `${monthlyRevenue.toLocaleString("ar-EG")} ج/ش`
                          : "0 ج/ش"}
                      </div>
                    </div>
                  </TableCell>

                  {/* Status Toggles */}
                  <TableCell>
                    <div className="flex items-center gap-3 text-xs">
                      <label
                        className="flex items-center gap-1 cursor-pointer"
                        title="تفعيل / تعطيل"
                      >
                        <Switch
                          checked={!!app.isActive}
                          onCheckedChange={(checked) =>
                            onQuickToggle(app, "isActive", checked)
                          }
                          className="scale-75 origin-right"
                        />
                        <span
                          className={
                            app.isActive
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          نشط
                        </span>
                      </label>

                      <label
                        className="flex items-center gap-1 cursor-pointer"
                        title="الظهور في المتجر"
                      >
                        <Switch
                          checked={!!app.isPublic}
                          onCheckedChange={(checked) =>
                            onQuickToggle(app, "isPublic", checked)
                          }
                          className="scale-75 origin-right"
                        />
                        <span
                          className={
                            app.isPublic
                              ? "text-blue-600 dark:text-blue-400 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          عام
                        </span>
                      </label>

                      <label
                        className="flex items-center gap-1 cursor-pointer"
                        title="تطبيق مميز"
                      >
                        <Switch
                          checked={!!app.isFeatured}
                          onCheckedChange={(checked) =>
                            onQuickToggle(app, "isFeatured", checked)
                          }
                          className="scale-75 origin-right"
                        />
                        <span
                          className={
                            app.isFeatured
                              ? "text-amber-500 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          مميز
                        </span>
                      </label>
                    </div>
                  </TableCell>

                  {/* Route */}
                  <TableCell>
                    {app.mainRoute ? (
                      <span
                        className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded truncate max-w-[140px] inline-block"
                        title={app.mainRoute}
                      >
                        {app.mainRoute}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-left">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => app.id && onNavigateDetails(app.id)}
                        className="h-8 px-2.5 text-xs text-primary border-primary/20 hover:bg-primary/10 font-semibold"
                      >
                        إدارة
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="تعديل التطبيق"
                              onClick={() => onEdit(app)}
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>تعديل</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="حذف التطبيق"
                              onClick={() => app.id && onDelete(app.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>حذف</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MarketplaceAppTable;
