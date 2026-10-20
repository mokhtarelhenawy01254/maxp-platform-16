import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Package } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent } from "../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Separator } from "../../../../components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";
import { Checkbox } from "../../../../components/ui/checkbox";
import { buildApiUrl } from "../../../../utils/urlHelper";
import { tToast } from "../../../../utils/i18n-toast";
import {
  type MarketplaceManagementItem,
  getAuthHeaders,
  normalizeBundleApps,
  getBundleAppLabel,
  getBundleAppCategory,
} from "../types/marketplaceAdminTypes";

export interface BundlesAndPricingTabProps {
  pricingRules: MarketplaceManagementItem[];
  bundles: MarketplaceManagementItem[];
  onEdit: (item: MarketplaceManagementItem | null) => void;
  onDelete: (
    id: string,
    typePath: "apps" | "pricing-rules" | "bundles",
  ) => void;
  onRefresh: () => Promise<void> | void;
}

export const BundlesAndPricingTab: React.FC<BundlesAndPricingTabProps> = ({
  pricingRules,
  bundles,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);

  const calculateBundleSavings = (bundle: MarketplaceManagementItem) => {
    return bundle.discount || 0;
  };

  const handleQuickToggle = async (
    bundle: MarketplaceManagementItem,
    field: string,
    value: boolean,
  ) => {
    try {
      await axios.put(
        buildApiUrl(`super-admin/marketplace-management/bundles/${bundle.id}`),
        { [field]: value },
        { headers: getAuthHeaders() },
      );
      toast.success(`تم ${value ? "تفعيل" : "تعطيل"} الباقة بنجاح`);
      onRefresh();
    } catch {
      tToast.error("subscriptionCenter.msg_eb61");
    }
  };

  return (
    <div className="space-y-6">
      {/* Pricing Rules Section */}
      <div>
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold">قواعد التسعير الإضافية</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit({ feature: "", price: 0, unit: "" })}
          >
            <Plus className="h-4 w-4 ml-1" />
            إضافة قاعدة
          </Button>
        </div>
        <div className="mt-3 rounded-lg border bg-card shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>الميزة</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <span className="font-medium">{rule.feature}</span>
                    {rule.description && (
                      <span className="text-xs text-muted-foreground block">{rule.description}</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums font-mono">{rule.price} ج</TableCell>
                  <TableCell>{rule.unit}</TableCell>
                  <TableCell>
                    <Badge
                      variant={rule.isActive ? "default" : "secondary"}
                      className={rule.isActive ? "bg-green-500" : ""}
                    >
                      {rule.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="تعديل قاعدة التسعير"
                      onClick={() => onEdit(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="حذف قاعدة التسعير"
                      onClick={() => rule.id && onDelete(rule.id, "pricing-rules")}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bundles Section */}
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold">باقات العروض (Bundles)</h3>
            <span className="text-xs text-muted-foreground tabular-nums font-mono">
              {bundles.length} باقة | {bundles.filter((b) => b.isActive).length} نشطة
            </span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => onEdit({ name: "", price: 0, apps: [] })}
          >
            <Plus className="h-4 w-4 ml-1" />
            إضافة باقة
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-12 gap-4">
          {bundles.map((bundle) => {
            const isExpanded = expandedBundle === bundle.id;
            const bundleApps = normalizeBundleApps(bundle.apps);
            const appsCount = bundleApps.length;
            const savings = calculateBundleSavings(bundle);

            return (
              <div key={bundle.id} className="col-span-12 md:col-span-6">
                <Card
                  className={`h-full transition-all ${
                    bundle.isActive ? "" : "opacity-70"
                  } ${bundle.isFeatured ? "border-2 border-amber-500" : ""}`}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <h4 className="text-base font-semibold">{bundle.name}</h4>
                          {bundle.isFeatured && (
                            <Badge variant="default" className="bg-amber-500 text-xs">
                              <Star className="h-3 w-3 ml-0.5" />
                              مميزة
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {bundle.description || "لا يوجد وصف"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <Badge
                          variant={bundle.isActive ? "default" : "destructive"}
                          className={bundle.isActive ? "bg-green-500" : ""}
                        >
                          {bundle.isActive ? "نشطة" : "معطلة"}
                        </Badge>
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="rounded-lg border bg-muted/40 p-2 mb-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <span className="text-xs text-muted-foreground block">السعر الحالي</span>
                          <p className="text-xl font-bold text-green-700 dark:text-green-400 tabular-nums font-mono">
                            {bundle.monthlyPrice?.toLocaleString("ar-EG") || 0} ج
                          </p>
                          <span className="text-xs text-muted-foreground">/ شهر</span>
                        </div>
                        <div className="col-span-6 text-right">
                          {savings > 0 && (
                            <>
                              <Badge className="bg-green-500 mb-0.5 tabular-nums font-mono">
                                توفير {savings}%
                              </Badge>
                              <span className="text-xs text-green-600 dark:text-green-400 block">
                                خصم على التطبيقات
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Apps List */}
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-semibold text-muted-foreground">
                          التطبيقات المُضمنة (
                          <span className="tabular-nums font-mono">{appsCount}</span>)
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {appsCount > 0 ? (
                          bundleApps.map((app, idx) => (
                            <TooltipProvider key={idx}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Badge variant="outline" className="text-xs max-w-[120px] truncate">
                                      {getBundleAppLabel(app)}
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{getBundleAppLabel(app)}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">لا توجد تطبيقات مضمنة</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div>
                        <Separator className="my-1.5" />
                        {appsCount > 0 && (
                          <ul className="space-y-1 mb-1">
                            <span className="text-xs text-muted-foreground block">تفاصيل التطبيقات:</span>
                            {bundleApps.map((app, idx) => (
                              <li key={idx} className="py-0.5">
                                <div>
                                  <span className="font-medium">{getBundleAppLabel(app)}</span>
                                  <span className="text-sm text-muted-foreground block">
                                    {getBundleAppCategory(app)}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Toggle Switches */}
                    <div className="flex gap-3 mb-2 flex-wrap">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={!!bundle.isActive}
                          onCheckedChange={(checked) =>
                            handleQuickToggle(bundle, "isActive", checked === true)
                          }
                        />
                        <span className="text-xs">نشطة</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={!!bundle.isFeatured}
                          onCheckedChange={(checked) =>
                            handleQuickToggle(bundle, "isFeatured", checked === true)
                          }
                        />
                        <span className="text-xs">مميزة</span>
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <Button
                        size="sm"
                        onClick={() => setExpandedBundle(isExpanded ? null : (bundle.id ?? null))}
                        variant="ghost"
                      >
                        {isExpanded ? "أقل" : "عرض التفاصيل"}
                      </Button>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="تعديل الباقة"
                                onClick={() => onEdit(bundle)}
                              >
                                <Pencil className="h-4 w-4" />
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
                                aria-label="حذف الباقة"
                                onClick={() => bundle.id && onDelete(bundle.id, "bundles")}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>حذف</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {bundles.length === 0 && (
          <div className="rounded-xl border bg-card/60 text-card-foreground shadow-sm p-6 text-center">
            <Package className="mx-auto h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-muted-foreground mt-2">لا توجد باقات محددة</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundlesAndPricingTab;
