import React from "react";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadAppTile } from "../../downloads/DownloadAppTile";
import type { DownloadPackage } from "../../downloads/downloadsData";

interface AppDownloadsMatrixProps {
  filteredPackages: DownloadPackage[];
  viewMode: "grid" | "list";
  companyToken: string;
  onOpenDetails: (pkg: DownloadPackage) => void;
  onOpenIosModal: () => void;
  onResetFilters: () => void;
}

export function AppDownloadsMatrix({
  filteredPackages,
  viewMode,
  companyToken,
  onOpenDetails,
  onOpenIosModal,
  onResetFilters,
}: AppDownloadsMatrixProps) {
  if (filteredPackages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
        <Monitor className="size-10 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground text-balance">لم يتم العثور على حزم مطابقة</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto text-pretty">
          جرب تغيير عبارة البحث أو اختر "الكل" لإظهار كافة تطبيقات الأجهزة والموبايل.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="mt-4 rounded-xl text-xs font-semibold active:scale-[0.97] duration-160 ease-out"
        >
          عرض جميع التطبيقات
        </Button>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {filteredPackages.map((pkg) => (
          <DownloadAppTile
            key={pkg.id}
            pkg={pkg}
            viewMode="grid"
            onOpenDetails={onOpenDetails}
            onOpenIosModal={onOpenIosModal}
            companyToken={companyToken}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {filteredPackages.map((pkg) => (
        <DownloadAppTile
          key={pkg.id}
          pkg={pkg}
          viewMode="list"
          onOpenDetails={onOpenDetails}
          onOpenIosModal={onOpenIosModal}
          companyToken={companyToken}
        />
      ))}
    </div>
  );
}
