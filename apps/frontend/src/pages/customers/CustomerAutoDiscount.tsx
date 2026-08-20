import React from "react";
import AutoDiscountSettings from "./AutoDiscountSettings";
import { BadgePercent } from "lucide-react";

/**
 * ╪╡┘ü╪¡╪⌐ "╪º┘ä╪«╪╡┘à ╪¿╪╣╪» ╪º┘ä╪¿┘è╪╣":
 * ╪Ñ╪»╪º╪▒╪⌐ ┘å╪╕╪º┘à ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ╪¿╪╣╪» ╪¬╪│┘ä┘è┘à ╪º┘ä╪╖┘ä╪¿ (┘à┘å┘ü╪╡┘ä╪⌐ ╪╣┘å ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬).
 */
const CustomerAutoDiscount: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <BadgePercent className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">╪º┘ä╪«╪╡┘à ╪¿╪╣╪» ╪º┘ä╪¿┘è╪╣</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ╪Ñ╪»╪º╪▒╪⌐ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ╪¿╪╣╪» ╪¬╪│┘ä┘è┘à ╪º┘ä╪╖┘ä╪¿ ┘ê┘å╪│╪¿╪⌐ ╪º┘ä╪«╪╡┘à ┘ê┘à╪»╪⌐ ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐.
          </p>
        </div>
      </div>

      <AutoDiscountSettings />
    </div>
  );
};

export default CustomerAutoDiscount;
