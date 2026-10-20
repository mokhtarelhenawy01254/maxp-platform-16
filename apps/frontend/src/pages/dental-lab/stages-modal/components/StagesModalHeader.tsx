import { Workflow, X as XMarkIcon } from "lucide-react";
import { type DentalWorkType } from "../../shared";

interface StagesModalHeaderProps {
  workType: DentalWorkType;
  saving: boolean;
  onClose: () => void;
}

export function StagesModalHeader({
  workType,
  saving,
  onClose,
}: StagesModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-5 border-b dark:border-gray-800 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center border border-blue-500/20">
          <Workflow className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            قالب مراحل الإنتاج — {workType.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            تسلسل المحطات الفنية، الدور المطلوب (requiredRole)، الحد الأقصى للإنجاز (SLA Hours)، وأجر المرحلة
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => !saving && onClose()}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Close"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

export default StagesModalHeader;
