import React from 'react';
import { Rocket, RotateCw } from 'lucide-react';
import {
  AdFormData,
  FacebookPage,
  AdIdentityMediaStep,
  AdCopyVariationsStep,
  AdAdvantageCreativeStep,
  AdDestinationTrackingStep,
  AdReviewStep,
} from '../../components/advertising/ad';

interface CreateAdStepContentProps {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  formData: AdFormData;
  updateFormData: (updates: Partial<AdFormData>) => void;
  facebookPages: FacebookPage[];
  loadingPages: boolean;
  selectedPage?: FacebookPage;
  isEn: boolean;
  submitting: boolean;
  handleNext: () => void;
  handleSubmit: () => void;
}

export const CreateAdStepContent: React.FC<CreateAdStepContentProps> = ({
  currentStep,
  setCurrentStep,
  formData,
  updateFormData,
  facebookPages,
  loadingPages,
  selectedPage,
  isEn,
  submitting,
  handleNext,
  handleSubmit,
}) => {
  return (
    <div className="lg:col-span-7 bg-card rounded-xl border border-border/70 p-4 sm:p-6 shadow-xs">
      {currentStep === 1 && (
        <AdIdentityMediaStep
          formData={formData}
          updateFormData={updateFormData}
          facebookPages={facebookPages}
          loadingPages={loadingPages}
          isEn={isEn}
        />
      )}

      {currentStep === 2 && (
        <AdCopyVariationsStep
          formData={formData}
          updateFormData={updateFormData}
          isEn={isEn}
        />
      )}

      {currentStep === 3 && (
        <AdAdvantageCreativeStep
          formData={formData}
          updateFormData={updateFormData}
          isEn={isEn}
        />
      )}

      {currentStep === 4 && (
        <AdDestinationTrackingStep
          formData={formData}
          updateFormData={updateFormData}
          isEn={isEn}
        />
      )}

      {currentStep === 5 && (
        <AdReviewStep
          formData={formData}
          page={selectedPage}
          isEn={isEn}
        />
      )}

      {/* Navigation Controls */}
      <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-4">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
          className="rounded-lg border border-border/70 bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 transition"
        >
          {isEn ? 'Previous' : 'السابق'}
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition"
          >
            <span>{isEn ? 'Continue' : 'متابعة'}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm transition"
          >
            {submitting ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                <span>{isEn ? 'Publishing to Meta...' : 'جاري النشر على Meta...'}</span>
              </>
            ) : (
              <>
                <Rocket className="h-3.5 w-3.5" />
                <span>{isEn ? 'Launch Ad on Meta' : 'نشر الإعلان على Meta'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
