import React from "react";
import {
  Building2,
  Calendar,
  Layers,
  Package,
  Pencil,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import {
  formatDate,
  getCategoryLabel,
  getSpecialtyIcon,
  type BusinessSpecialty,
  type MarketplaceAppOption,
} from "../types";

interface SpecialtyDetailDialogProps {
  specialty: BusinessSpecialty | null;
  appOptionsBySlug: Map<string, MarketplaceAppOption>;
  open: boolean;
  onClose: () => void;
  onEdit: (specialty: BusinessSpecialty) => void;
}

export const SpecialtyDetailDialog: React.FC<SpecialtyDetailDialogProps> = ({
  specialty,
  appOptionsBySlug,
  open,
  onClose,
  onEdit,
}) => {
  if (!specialty) return null;

  const IconComponent = getSpecialtyIcon(specialty.icon);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full max-w-2xl p-0 overflow-hidden rounded-xl border border-border/70 shadow-2xl">
        {/* Clean Single-Chassis Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 text-right">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <IconComponent className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {specialty.nameAr}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono" dir="ltr">
                {specialty.slug} {specialty.nameEn ? `• ${specialty.nameEn}` : ""}
              </DialogDescription>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={specialty.isActive ? "default" : "secondary"}
                  className="text-[0.65rem] px-2 py-0.5"
                >
                  {specialty.isActive ? "نشط في شاشة التسجيل" : "موقوف حالياً"}
                </Badge>

                {specialty.autoInstallOnSignup && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/5 text-primary text-[0.65rem] px-2 py-0.5"
                  >
                    <Zap className="h-2.5 w-2.5 ml-0.5" />
                    تثبيت تلقائي عند التسجيل
                  </Badge>
                )}

                {specialty.companyCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[0.65rem] px-2 py-0.5 font-mono tabular-nums"
                  >
                    <Building2 className="h-2.5 w-2.5 ml-0.5" />
                    {specialty.companyCount.toLocaleString("ar-EG")} شركة مسجلة
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable details */}
        <ScrollArea className="max-h-[65vh] p-4 sm:p-5">
          <div className="space-y-4 text-xs">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-3">
              <div>
                <span className="block text-[0.65rem] text-muted-foreground">
                  الأيقونة
                </span>
                <span className="font-semibold text-foreground font-mono" dir="ltr">
                  {specialty.icon}
                </span>
              </div>

              <div>
                <span className="block text-[0.65rem] text-muted-foreground">
                  الترتيب
                </span>
                <span className="font-semibold text-foreground font-mono tabular-nums">
                  {specialty.sortOrder}
                </span>
              </div>

              <div>
                <span className="block text-[0.65rem] text-muted-foreground">
                  ثيم المتجر
                </span>
                <span className="font-semibold text-foreground truncate block">
                  {specialty.themeId || "افتراضي"}
                </span>
              </div>

              <div>
                <span className="block text-[0.65rem] text-muted-foreground">
                  تاريخ الإنشاء
                </span>
                <span className="font-semibold text-foreground font-mono">
                  {formatDate(specialty.createdAt)}
                </span>
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/10 p-3">
              <div>
                <span className="block text-[0.68rem] font-semibold text-muted-foreground">
                  الوصف بالعربي
                </span>
                <p className="mt-0.5 text-foreground leading-relaxed">
                  {specialty.descriptionAr || "لا يوجد وصف مدخل."}
                </p>
              </div>

              {specialty.descriptionEn && (
                <div className="border-t border-border/40 pt-2" dir="ltr">
                  <span className="block text-[0.68rem] font-semibold text-muted-foreground text-left">
                    English Description
                  </span>
                  <p className="mt-0.5 text-foreground text-left leading-relaxed">
                    {specialty.descriptionEn}
                  </p>
                </div>
              )}
            </div>

            {/* Linked Apps Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  التطبيقات المرتبطة ({specialty.appSlugs.length})
                </span>
                <span className="text-[0.68rem] text-muted-foreground">
                  تُثبت تلقائياً للشركات التابعة لهذا النشاط
                </span>
              </div>

              {specialty.appSlugs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                  لا توجد تطبيقات مرتبطة بهذا النشاط.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {specialty.appSlugs.map((slug) => {
                    const app = appOptionsBySlug.get(slug);
                    return (
                      <div
                        key={slug}
                        className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 shadow-xs"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Package className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-foreground text-xs">
                            {app?.name || slug}
                          </span>
                          <span className="block truncate text-[0.65rem] text-muted-foreground font-mono" dir="ltr">
                            {slug}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0">
                          {getCategoryLabel(app?.category)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs rounded-lg"
          >
            إغلاق
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(specialty);
            }}
            className="h-8 px-3 text-xs font-semibold rounded-lg"
          >
            <Pencil className="h-3.5 w-3.5 ml-1" />
            تعديل النشاط
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
