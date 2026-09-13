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
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          نوع المواضع وتوزيع الإعلان
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange("placementType", "AUTOMATIC")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === "AUTOMATIC"
                ? "border-blue-500 bg-blue-50 shadow-xs"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <Sparkles
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "AUTOMATIC" ? "text-blue-500" : "text-gray-400"}`}
            />
            <div className="font-bold text-gray-900 text-sm">
              مواضع Advantage+ (تلقائية - موصى بها)
            </div>
            <div className="text-xs text-gray-500 mt-1">
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
                ? "border-blue-500 bg-blue-50 shadow-xs"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <Layout
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "MANUAL" ? "text-blue-500" : "text-gray-400"}`}
            />
            <div className="font-bold text-gray-900 text-sm">مواضع يدوية مخصصة</div>
            <div className="text-xs text-gray-500 mt-1">
              تحكم يدوي كامل بالأجهزة، المنصات، والمواضع المحددة
            </div>
          </button>
        </div>
      </div>

      {/* Manual Placements Configuration */}
      {formData.placementType === "MANUAL" && (
        <div className="space-y-6 pt-2">
          {/* Devices Filter */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-gray-800">
              الأجهزة المستهدفة (Devices)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDeviceModeChange("all")}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  currentDeviceMode === "all"
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
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
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
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
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                الكمبيوتر فقط
              </button>
            </div>
          </div>

          {/* Platforms Filter */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-gray-800">
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
                        ? "border-blue-400 bg-white shadow-xs text-gray-900"
                        : "border-gray-200 bg-gray-100/70 text-gray-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {platform.icon}
                      <span>{platform.label}</span>
                    </div>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Placements Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-800">
                المواضع المحددة <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChange("placements", PLACEMENTS.map((p) => p.id))}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  تحديد الكل
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => handleChange("placements", [])}
                  className="text-xs text-gray-500 hover:text-gray-700"
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
                        ? "border-blue-500 bg-blue-50/70 shadow-xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={
                          isSelected ? "text-blue-600" : "text-gray-400"
                        }
                      >
                        {placement.icon}
                      </div>
                      <span className="font-medium text-xs text-gray-900">
                        {placement.label}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
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
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-200/70 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-gray-900">
                  عرض الإعلان عند الاتصال بـ Wi-Fi فقط
                </h5>
                <p className="text-[11px] text-gray-500">
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
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
