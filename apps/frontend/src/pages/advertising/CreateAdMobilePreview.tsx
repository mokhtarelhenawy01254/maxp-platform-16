import React from 'react';
import { Smartphone, X } from 'lucide-react';
import { AdFormData, FacebookPage, AdPlacementLivePreview } from '../../components/advertising/ad';

interface CreateAdMobilePreviewProps {
  showMobilePreview: boolean;
  setShowMobilePreview: (show: boolean) => void;
  formData: AdFormData;
  selectedPage?: FacebookPage;
  isEn: boolean;
}

export const CreateAdMobilePreview: React.FC<CreateAdMobilePreviewProps> = ({
  showMobilePreview,
  setShowMobilePreview,
  formData,
  selectedPage,
  isEn,
}) => {
  return (
    <>
      {/* Mobile Floating Preview Pill */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobilePreview(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-medium shadow-lg border border-primary/20 transition active:scale-95"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>{isEn ? "Live Ad Preview" : "معاينة الإعلان الحية"}</span>
        </button>
      </div>

      {/* Mobile Preview Bottom Sheet Modal */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 shadow-2xl border-t border-border/70 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-xs font-bold text-foreground">
                {isEn ? "Live Mobile Ad Preview" : "المعاينة الحية للإعلان"}
              </span>
              <button
                type="button"
                onClick={() => setShowMobilePreview(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AdPlacementLivePreview
              formData={formData}
              page={selectedPage}
              isEn={isEn}
            />
          </div>
        </div>
      )}
    </>
  );
};
