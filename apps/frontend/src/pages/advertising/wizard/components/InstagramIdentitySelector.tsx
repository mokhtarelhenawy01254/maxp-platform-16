import React from "react";
import { Instagram, CheckCircle2, Globe } from "lucide-react";

interface InstagramIdentitySelectorProps {
  pageName?: string;
  instagramActorId: string;
  onInstagramActorIdChange: (val: string) => void;
}

export const InstagramIdentitySelector: React.FC<InstagramIdentitySelectorProps> = ({
  pageName,
  instagramActorId,
  onInstagramActorIdChange,
}) => {
  const isUsingPageIdentity = !instagramActorId;

  return (
    <div className="space-y-2 pt-1">
      <label className="block text-xs font-semibold text-gray-700">
        هوية الحساب على إنستجرام (Instagram Account Identity)
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onInstagramActorIdChange("")}
          className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
            isUsingPageIdentity
              ? "border-pink-500 bg-pink-50/50 text-gray-900 shadow-xs"
              : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100 text-pink-700">
              <Instagram className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">
                استخدام صفحة فيسبوك
              </div>
              <div className="text-[10px] text-gray-500">
                {pageName ? `@${pageName.replace(/\s+/g, "_").toLowerCase()}` : "ظهور بهوية الصفحة على IG"}
              </div>
            </div>
          </div>
          {isUsingPageIdentity && (
            <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onInstagramActorIdChange(instagramActorId || "manual_ig")}
          className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
            !isUsingPageIdentity
              ? "border-pink-500 bg-pink-50/50 text-gray-900 shadow-xs"
              : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">
                حساب إنستجرام مخصص
              </div>
              <div className="text-[10px] text-gray-500">
                إدخال معرف حساب IG مربوط
              </div>
            </div>
          </div>
          {!isUsingPageIdentity && (
            <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
          )}
        </button>
      </div>

      {!isUsingPageIdentity && (
        <div className="pt-1.5">
          <input
            type="text"
            value={instagramActorId === "manual_ig" ? "" : instagramActorId}
            onChange={(e) => onInstagramActorIdChange(e.target.value)}
            placeholder="أدخل معرف حساب إنستجرام المربوط (Instagram Actor ID)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-pink-500"
          />
        </div>
      )}
    </div>
  );
};
