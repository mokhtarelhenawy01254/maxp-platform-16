import React from "react";
import { Sparkles, ShoppingBag } from "lucide-react";

interface MultiAdvertiserToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const MultiAdvertiserToggle: React.FC<MultiAdvertiserToggleProps> = ({
  enabled,
  onChange,
}) => {
  return (
    <div className="p-3.5 bg-purple-50/50 border border-purple-200/70 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
          <ShoppingBag className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h5 className="text-xs font-bold text-gray-900">
              إعلانات المعلنين المتعددين (Multi-advertiser ads)
            </h5>
            <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded">
              موصى به
            </span>
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5">
            تمكين إعلانك من الظهور بجانب إعلانات أخرى في سياق تسوق مشترك للمستخدمين ذوي النية الشرائية العالية.
          </p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
      </label>
    </div>
  );
};
