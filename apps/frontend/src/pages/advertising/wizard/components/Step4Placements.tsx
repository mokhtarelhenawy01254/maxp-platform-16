import React from "react";
import {
  Sparkles,
  Layout,
  Facebook,
  Instagram,
  MessageCircle,
  Globe,
  AlertCircle,
  Smartphone,
  Laptop,
  Monitor,
  Wifi,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { FormData } from "../types";
import { PLACEMENTS } from "../constants";

interface Step4PlacementsProps {
  formData: FormData;
  handleChange: (field: keyof FormData, value: any) => void;
  toggleArrayValue: (field: keyof FormData, value: string) => void;
  getError: (field: string) => string;
}

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4 text-blue-600" /> },
  { id: "instagram", label: "Instagram", icon: <Instagram className="w-4 h-4 text-pink-600" /> },
  { id: "messenger", label: "Messenger", icon: <MessageCircle className="w-4 h-4 text-blue-500" /> },
  { id: "network", label: "Audience Network", icon: <Globe className="w-4 h-4 text-emerald-600" /> },
];

export const Step4Placements: React.FC<Step4PlacementsProps> = ({
  formData,
  handleChange,
  toggleArrayValue,
  getError,
}) => {
  const currentDeviceMode =
    !formData.devicePlatforms || formData.devicePlatforms.length === 0 || formData.devicePlatforms.length === 2
      ? "all"
      : formData.devicePlatforms.includes("mobile")
        ? "mobile"
        : "desktop";

  const handleDeviceModeChange = (mode: "all" | "mobile" | "desktop") => {
    if (mode === "all") {
      handleChange("devicePlatforms", []);
    } else if (mode === "mobile") {
      handleChange("devicePlatforms", ["mobile"]);
    } else {
      handleChange("devicePlatforms", ["desktop"]);
    }
  };

  const handleTogglePlatform = (platformId: string) => {
    // Current placements for this platform
    const platformPlacements = PLACEMENTS.filter((p) => p.platform === platformId).map((p) => p.id);
    const hasAnyActive = platformPlacements.some((id) => formData.placements.includes(id));

    if (hasAnyActive) {
      // Remove all placements belonging to this platform
      handleChange(
        "placements",
        formData.placements.filter((id) => !platformPlacements.includes(id)),
      );
    } else {
      // Add all placements belonging to this platform
      const unique = Array.from(new Set([...formData.placements, ...platformPlacements]));
      handleChange("placements", unique);
    }
  };

  const isPlatformActive = (platformId: string) => {
    const platformPlacements = PLACEMENTS.filter((p) => p.platform === platformId).map((p) => p.id);
    return platformPlacements.some((id) => formData.placements.includes(id));
  };

  return (
    <div className="space-y-6">
      {/* Placement Type (Advantage+ vs Manual) */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          نوع المواضع وتوزيع الإعلان
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange("placementType", "AUTOMATIC")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === "AUTOMATIC"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-xs"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
            }`}
          >
            <Sparkles
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "AUTOMATIC" ? "text-blue-500 dark:text-blue-400" : "text-gray-400"}`}
            />
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              مواضع Advantage+ (تلقائية - موصى بها)
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              خوارزميات Meta توزع الميزانية بذكاء على أفضل المواضع لتحقيق أعلى عائد
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              handleChange("placementType", "MANUAL");
              if (!formData.placements || formData.placements.length === 0) {
                // Default select feeds & reels
                handleChange("placements", [
                  "FACEBOOK_FEED",
                  "INSTAGRAM_FEED",
                  "FACEBOOK_REELS",
                  "INSTAGRAM_REELS",
                  "FACEBOOK_STORIES",
                  "INSTAGRAM_STORIES",
                ]);
              }
            }}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === "MANUAL"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-xs"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
            }`}
          >
            <Layout
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "MANUAL" ? "text-blue-500 dark:text-blue-400" : "text-gray-400"}`}
            />
            <div className="font-bold text-gray-900 dark:text-white text-sm">مواضع يدوية مخصصة</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              تحكم يدوي كامل بالأجهزة، المنصات، والمواضع المحددة
            </div>
          </button>
        </div>
      </div>

      {formData.placementType === "MANUAL" && (
        <div className="space-y-6 pt-2">
          {/* Devices Filter */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
              الأجهزة المستهدفة (Devices)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDeviceModeChange("all")}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  currentDeviceMode === "all"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                الكل (موصى به)
              </button>
              <button
                type="button"
                onClick={() => handleDeviceModeChange("mobile")}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  currentDeviceMode === "mobile"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                الهواتف فقط
              </button>
              <button
                type="button"
                onClick={() => handleDeviceModeChange("desktop")}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  currentDeviceMode === "desktop"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                الكمبيوتر فقط
              </button>
            </div>
          </div>

          {/* Platforms Filter */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
              المنصات (Platforms)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((platform) => {
                const active = isPlatformActive(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handleTogglePlatform(platform.id)}
                    className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                      active
                        ? "border-blue-400 dark:border-blue-600 bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white"
                        : "border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {platform.icon}
                      <span>{platform.label}</span>
                    </div>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Placements Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                المواضع المحددة <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChange("placements", PLACEMENTS.map((p) => p.id))}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  تحديد الكل
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={() => handleChange("placements", [])}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PLACEMENTS.map((placement) => {
                const isSelected = formData.placements.includes(placement.id);
                return (
                  <button
                    key={placement.id}
                    type="button"
                    onClick={() => toggleArrayValue("placements", placement.id)}
                    className={`flex items-center justify-between p-3 border rounded-xl transition-all text-right ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={
                          isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
                        }
                      >
                        {placement.icon}
                      </div>
                      <span className="font-medium text-xs text-gray-900 dark:text-white">
                        {placement.label}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {getError("placements") && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {getError("placements")}
              </p>
            )}
          </div>

          {/* Wi-Fi Only Toggle */}
          <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                  عرض الإعلان عند الاتصال بـ Wi-Fi فقط
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  مفيد لحملات الفيديو عالية الدقة لتوفير باقات الإنترنت وضمان سرعة المشاهدة
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={Boolean(formData.onlyWifi)}
                onChange={(e) => handleChange("onlyWifi", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* Brand Safety / Inventory Filter */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mt-2 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            سلامة العلامة التجارية وفلتر المخزون (Inventory Filter)
          </h4>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          تحكم في مستوى ملاءمة المحتوى وسياق الفيديوهات والصفحات التي يظهر بجوارها إعلانك لضمان عدم ارتباط علامتك بمحتوى حساس.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {[
            {
              id: "STANDARD",
              title: "المخزون القياسي (Standard)",
              badge: "موصى به",
              badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300",
              desc: "توازن معتدل بين أمان العلامة التجارية والوصول الجماهيري الواسع. يستبعد المحتوى الصريح والجدلي للغاية.",
            },
            {
              id: "FULL",
              title: "المخزون الكامل (Expanded)",
              badge: "أقصى وصول",
              badgeColor: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300",
              desc: "أعلى نسبة وصول بأقل تكلفة ممكنة، مناسب عندما لا تكون حساسية المحتوى أولوية قصوى.",
            },
            {
              id: "LIMITED",
              title: "المخزون المحدود (Limited)",
              badge: "أقصى حماية",
              badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
              desc: "أعلى درجات الحماية والحذر للعلامات التجارية الكبرى. يستبعد أي محتوى يحتوي على لغة قوية أو مواضيع حساسة.",
            },
          ].map((tier) => {
            const isSelected = (formData.inventoryFilter || "STANDARD") === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleChange("inventoryFilter", tier.id)}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{tier.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tier.badgeColor}`}>
                      {tier.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{tier.desc}</p>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
