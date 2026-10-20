import React from "react";
import { Eye, Star, Archive, Save } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Switch } from "../../../../components/ui/switch";
import { Button } from "../../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import type { StorefrontThemeCatalogItem } from "../../../../services/storefrontThemeCatalogService";

export interface StorefrontThemeCardProps {
  theme: StorefrontThemeCatalogItem;
  isSelected: boolean;
  isSaving: boolean;
  onToggleSelect: (checked: boolean) => void;
  onDraftChange: (patch: Partial<StorefrontThemeCatalogItem>) => void;
  onSetDefaultTheme: (theme: StorefrontThemeCatalogItem) => void;
  onArchiveTheme: (themeId: string) => void;
  onShowTheme: (themeId: string) => void;
  onSaveTheme: (themeId: string) => void;
}

export const StorefrontThemeCard: React.FC<StorefrontThemeCardProps> = ({
  theme,
  isSelected,
  isSaving,
  onToggleSelect,
  onDraftChange,
  onSetDefaultTheme,
  onArchiveTheme,
  onShowTheme,
  onSaveTheme,
}) => {
  const previewColors = theme.preview?.colors?.length > 0 ? theme.preview.colors : [];
  const usageStats = {
    installations: theme.usageStats?.installations || 0,
    activeInstallations: theme.usageStats?.activeInstallations || 0,
    purchases: theme.usageStats?.purchases || 0,
    currentCompanies: theme.usageStats?.currentCompanies || 0,
    installCount: theme.usageStats?.installCount || 0,
  };

  return (
    <div className="col-span-12 lg:col-span-6">
      <Card
        className="h-full overflow-hidden"
        style={{
          border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
          boxShadow: isSelected
            ? "0 10px 15px -3px rgba(0,0,0,0.1)"
            : "0 1px 3px 0 rgba(0,0,0,0.1)",
        }}
      >
        {theme.preview?.imageUrl && (
          <div className="h-[200px] w-full overflow-hidden relative border-b border-border bg-muted/50">
            <img
              src={theme.preview.imageUrl}
              alt={theme.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top center",
              }}
            />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex items-start gap-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onToggleSelect(checked === true)}
                className="mt-[-0.75rem] mr-[-0.5rem]"
              />
              <div>
                <h6 className="text-base font-bold leading-none">{theme.name}</h6>
                <span className="text-xs text-muted-foreground">{theme.themeId}</span>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {theme.isFeatured ? (
                <Badge variant="default" className="bg-amber-500 text-xs">
                  مميز
                </Badge>
              ) : null}
              {theme.isDefaultTheme ? (
                <Badge variant="default" className="bg-blue-500 text-xs">
                  <Star className="h-3 w-3 ml-0.5" />
                  افتراضي للمتاجر الجديدة
                </Badge>
              ) : null}
              <Badge
                variant={theme.isActive ? "default" : "secondary"}
                className={theme.isActive ? "bg-green-500" : ""}
              >
                {theme.isActive ? "نشط" : "موقوف"}
              </Badge>
              <Badge
                variant={theme.isPublic ? "default" : "secondary"}
                className={theme.isPublic ? "bg-blue-500" : ""}
              >
                {theme.isPublic ? "ظاهر" : "مخفي"}
              </Badge>
              {!theme.isActive && !theme.isPublic ? (
                <Badge variant="destructive">مؤرشف</Badge>
              ) : null}
            </div>
          </div>

          <div className="flex gap-1 mb-2">
            {previewColors.map((colorValue, colorIndex) => (
              <div
                key={`${theme.themeId}-${colorValue}-${colorIndex}`}
                className="w-7 h-7 rounded-full border border-border"
                style={{ backgroundColor: `hsl(${colorValue})` }}
              />
            ))}
          </div>

          <div className="rounded-lg border bg-muted/50 p-2 mb-2">
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-6 md:col-span-3">
                <span className="text-xs text-muted-foreground">مفعل</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {usageStats.activeInstallations} شركة
                </p>
              </div>
              <div className="col-span-6 md:col-span-3">
                <span className="text-xs text-muted-foreground">مشتريات</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {usageStats.purchases}
                </p>
              </div>
              <div className="col-span-6 md:col-span-3">
                <span className="text-xs text-muted-foreground">مستخدم الآن</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {usageStats.currentCompanies} شركة
                </p>
              </div>
              <div className="col-span-6 md:col-span-3">
                <span className="text-xs text-muted-foreground">إجمالي</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {usageStats.installations || usageStats.installCount}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-12">
              <div className="space-y-1">
                <Label>رابط الصورة المعاينة (imageUrl)</Label>
                <Input
                  value={theme.preview?.imageUrl || ""}
                  onChange={(event) =>
                    onDraftChange({
                      preview: { ...theme.preview, imageUrl: event.target.value },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  يفضل استخدام مسار يبدأ بـ /assets/themes/...
                </p>
              </div>
            </div>
            <div className="col-span-12">
              <div className="space-y-1">
                <Label>وصف القالب</Label>
                <Textarea
                  value={theme.description}
                  onChange={(event) =>
                    onDraftChange({ description: event.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-2">
                <Label>نموذج التسعير</Label>
                <Select
                  value={theme.pricingModel}
                  onValueChange={(v) =>
                    onDraftChange({
                      pricingModel: v === "ONE_TIME" ? "ONE_TIME" : "FREE",
                      yearlyPrice: v === "ONE_TIME" ? Number(theme.yearlyPrice) || 0 : 0,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">مجاني</SelectItem>
                    <SelectItem value="ONE_TIME">شراء مرة واحدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label>سعر الشراء</Label>
                <Input
                  type="number"
                  className="tabular-nums font-mono"
                  value={theme.monthlyPrice}
                  onChange={(event) =>
                    onDraftChange({ monthlyPrice: Number(event.target.value) || 0 })
                  }
                  disabled={theme.pricingModel !== "ONE_TIME"}
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label>السعر السنوي</Label>
                <Input
                  type="number"
                  className="tabular-nums font-mono"
                  value={theme.yearlyPrice}
                  onChange={(event) =>
                    onDraftChange({ yearlyPrice: Number(event.target.value) || 0 })
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">غير مستخدم في شراء القوالب</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1 mb-2">
            <div className="col-span-12 md:col-span-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={theme.isActive}
                  disabled={theme.isDefaultTheme}
                  onCheckedChange={(checked) => onDraftChange({ isActive: checked })}
                />
                <span className="text-sm">متاح للتفعيل</span>
              </label>
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={theme.isPublic}
                  disabled={theme.isDefaultTheme}
                  onCheckedChange={(checked) => onDraftChange({ isPublic: checked })}
                />
                <span className="text-sm">ظاهر للشركات</span>
              </label>
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={theme.isFeatured}
                  onCheckedChange={(checked) => onDraftChange({ isFeatured: checked })}
                />
                <span className="text-sm">شارة مميز</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 mb-2">
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-6">
                <span className="text-xs text-muted-foreground">الرئيسية</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {theme.pageStats?.homeSections || 0} sections
                </p>
              </div>
              <div className="col-span-6">
                <span className="text-xs text-muted-foreground">المتجر</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {theme.pageStats?.shopSections || 0} sections
                </p>
              </div>
              <div className="col-span-6">
                <span className="text-xs text-muted-foreground">المنتج</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {theme.pageStats?.pdpSections || 0} sections
                </p>
              </div>
              <div className="col-span-6">
                <span className="text-xs text-muted-foreground">السلة/الدفع</span>
                <p className="text-sm font-medium text-muted-foreground tabular-nums font-mono">
                  {(theme.pageStats?.cartSections || 0) + (theme.pageStats?.checkoutSections || 0)} sections
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={`/marketplace/themes?theme=${encodeURIComponent(theme.themeId)}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <Eye className="h-4 w-4 ml-1" />
              معاينة
            </Button>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={theme.isDefaultTheme ? "default" : "outline"}
                size="sm"
                onClick={() => onSetDefaultTheme(theme)}
                disabled={isSaving || theme.isDefaultTheme}
              >
                <Star className="h-4 w-4 ml-1" />
                {theme.isDefaultTheme ? "القالب الافتراضي" : "تعيين كافتراضي"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={
                  theme.isActive || theme.isPublic
                    ? "text-red-500 border-red-500"
                    : "text-green-600 dark:text-green-400 border-green-600"
                }
                onClick={() =>
                  theme.isActive || theme.isPublic
                    ? onArchiveTheme(theme.themeId)
                    : onShowTheme(theme.themeId)
                }
                disabled={isSaving || theme.isDefaultTheme}
              >
                {theme.isActive || theme.isPublic ? (
                  <>
                    <Archive className="h-4 w-4 ml-1" />
                    أرشفة
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 ml-1" />
                    إظهار
                  </>
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onSaveTheme(theme.themeId)}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 ml-1" />
                {isSaving ? "جاري الحفظ..." : "حفظ القالب"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorefrontThemeCard;
