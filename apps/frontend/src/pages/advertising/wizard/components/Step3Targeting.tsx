import React from "react";
import {
  Sparkles,
  Users,
  Search,
  Loader2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Target,
  GraduationCap,
  Briefcase,
  Heart,
  Smartphone,
  Globe,
  Building2,
  AlertCircle,
} from "lucide-react";
import type { FormData, TargetingOption } from "../types";
import type {
  FacebookCustomAudience,
  FacebookLookalikeAudience,
} from "../../../../services/facebookAdsService";
import MetaGeoTargetingSelector from "../../../../components/advertising/MetaGeoTargetingSelector";
import {
  COUNTRIES,
  INTEREST_CATEGORIES,
  RELATIONSHIP_OPTIONS,
  LANGUAGES,
  DEVICE_PLATFORMS,
  EDUCATION_STATUS_OPTIONS,
} from "../constants";

// Experimental targeting controls flag (disabled until backend targeting schema mapping is finalized)
const SHOW_EXPERIMENTAL_TARGETING_CONTROLS = false;

interface Step3TargetingProps {
  formData: FormData;
  handleChange: (field: keyof FormData, value: any) => void;
  toggleArrayValue: (field: keyof FormData, value: string) => void;
  getError: (field: string) => string;
  showAdvancedTargeting: boolean;
  setShowAdvancedTargeting: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchResults: TargetingOption[];
  searchLoading: boolean;
  handleSearchInterests: (query: string) => void;
  selectedInterests: TargetingOption[];
  addInterest: (interest: TargetingOption) => void;
  removeInterest: (id: string) => void;
  relationshipStatuses: number[];
  toggleRelationshipStatus: (val: number) => void;
  selectedLanguages: number[];
  toggleLanguage: (id: number) => void;
  selectedDevices: string[];
  toggleDevice: (val: string) => void;
  loadingAudiences: boolean;
  customAudiences: FacebookCustomAudience[];
  selectedCustomAudiences: string[];
  toggleCustomAudience: (id: string) => void;
  lookalikeAudiences: FacebookLookalikeAudience[];
  selectedLookalikeAudiences: string[];
  toggleLookalikeAudience: (id: string) => void;
  excludedAudiences: string[];
  setExcludedAudiences: React.Dispatch<React.SetStateAction<string[]>>;
}

export const Step3Targeting: React.FC<Step3TargetingProps> = ({
  formData,
  handleChange,
  toggleArrayValue,
  getError,
  showAdvancedTargeting,
  setShowAdvancedTargeting,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchLoading,
  handleSearchInterests,
  selectedInterests,
  addInterest,
  removeInterest,
  relationshipStatuses,
  toggleRelationshipStatus,
  selectedLanguages,
  toggleLanguage,
  selectedDevices,
  toggleDevice,
  loadingAudiences,
  customAudiences,
  selectedCustomAudiences,
  toggleCustomAudience,
  lookalikeAudiences,
  selectedLookalikeAudiences,
  toggleLookalikeAudience,
  excludedAudiences,
  setExcludedAudiences,
}) => {
  return (
    <div className="space-y-6">
      {/* Advantage+ Audience (v26) */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50/60 to-pink-50 p-4 rounded-xl border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Advantage+ Audience (Meta v26)
              </h4>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                الجيل الذكي
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">
              في إصدار v26، تستخدم خوارزميات الذكاء الاصطناعي اهتماماتك وجماهيرك كنقطة انطلاق أولية (Audience Suggestions)، ثم تتوسع ذاتياً لجلب أفضل المشترين بأقل تكلفة ممكنة مع احترام قيود الدولة والسن الصارمة.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={formData.advantageAudience}
              onChange={(e) =>
                handleChange("advantageAudience", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-3 border-t border-purple-100/80">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span><strong>قيود صارمة (Controls):</strong> الدولة، المحافظة، والحد الأدنى للعمر (تلتزم بها Meta 100%).</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span><strong>مقترحات ذكية (Suggestions):</strong> الاهتمامات والجمهور المشابه (بذور للتوسع الذكي).</span>
          </div>
        </div>
      </div>

      {/* Age Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          الفئة العمرية
        </label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">من</label>
            <select
              value={formData.ageMin}
              onChange={(e) => handleChange("ageMin", parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 53 }, (_, i) => i + 13).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </div>
          <span className="text-gray-400 mt-6">—</span>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">إلى</label>
            <select
              value={formData.ageMax}
              onChange={(e) => handleChange("ageMax", parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 53 }, (_, i) => i + 13).map((age) => (
                <option key={age} value={age}>
                  {age}+
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          الجنس
        </label>
        <div className="flex gap-4">
          {[
            { value: "", label: "الكل" },
            { value: "1", label: "ذكور" },
            { value: "2", label: "إناث" },
          ].map((gender) => (
            <button
              key={gender.value}
              type="button"
              onClick={() =>
                handleChange("genders", gender.value ? [gender.value] : [])
              }
              className={`flex-1 py-3 px-4 border-2 rounded-xl font-medium transition-all ${
                (formData.genders.length === 0 && gender.value === "") ||
                (formData.genders.includes(gender.value) && gender.value !== "")
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {gender.label}
            </button>
          ))}
        </div>
      </div>

      <MetaGeoTargetingSelector
        countries={COUNTRIES}
        selectedCountries={formData.locations}
        selectedRegions={formData.regions}
        selectedCities={formData.cities}
        locationTypes={formData.locationTypes}
        error={getError("locations")}
        onCountriesChange={(locations) => handleChange("locations", locations)}
        onRegionsChange={(regions) => handleChange("regions", regions)}
        onCitiesChange={(cities) => handleChange("cities", cities)}
        onLocationTypesChange={(locationTypes) =>
          handleChange("locationTypes", locationTypes)
        }
      />

      {/* Advanced Targeting Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvancedTargeting(!showAdvancedTargeting)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <Heart className="w-4 h-4" />
          {showAdvancedTargeting
            ? "إخفاء الاستهداف المتقدم"
            : "إظهار الاستهداف المتقدم (الاهتمامات، اللغات، الأجهزة...)"}
        </button>
      </div>

      {/* Advanced Targeting Options */}
      {showAdvancedTargeting && (
        <div className="space-y-6 bg-gray-50 p-4 rounded-xl">
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium leading-5 text-blue-800">
            يتم إرسال الاهتمامات من بحث Meta، الجماهير المخصصة/المشابهة،
            الاستبعادات، اللغات، الأجهزة، والحالة الاجتماعية فقط.
          </p>

          {/* Interests Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              الاهتمامات
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchInterests(e.target.value);
                }}
                placeholder="ابحث عن اهتمام (مثال: تسوق، موضة، تقنية...)"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {searchLoading && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-white">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => addInterest(result)}
                    className="w-full px-4 py-2 text-right hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                  >
                    <span className="text-sm">{result.name}</span>
                    {result.audience_size && (
                      <span className="text-xs text-gray-500">
                        {(result.audience_size / 1000000).toFixed(1)}M
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Interests */}
            {selectedInterests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedInterests.map((interest) => (
                  <span
                    key={interest.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm"
                  >
                    {interest.name}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest.id)}
                      className="p-0.5 hover:bg-pink-200 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Categories */}
            <div className="mt-3 flex flex-wrap gap-2">
              {INTEREST_CATEGORIES.map((cat) => (
                <button
                  key={cat.query}
                  type="button"
                  onClick={() => {
                    setSearchQuery(cat.query);
                    handleSearchInterests(cat.query);
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm flex items-center gap-1"
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة الاجتماعية
            </label>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => toggleRelationshipStatus(status.value)}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    relationshipStatuses.includes(status.value)
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              اللغات
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => toggleLanguage(lang.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedLanguages.includes(lang.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Devices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-500" />
              نظام التشغيل
            </label>
            <div className="flex gap-3">
              {DEVICE_PLATFORMS.map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => toggleDevice(platform.value)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    selectedDevices.includes(platform.value)
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="text-xl ml-2">{platform.icon}</span>
                  {platform.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {selectedDevices.length === 0
                ? "الكل (افتراضي)"
                : `محدد: ${selectedDevices.join(", ")}`}
            </p>
          </div>

          {/* Detailed Demographics */}
          {SHOW_EXPERIMENTAL_TARGETING_CONTROLS && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              الديموغرافيا التفصيلية
            </h4>

            <div className="space-y-4">
              {/* Education */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المستوى التعليمي
                </label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVELS.map((edu) => (
                    <button
                      key={edu.value}
                      type="button"
                      onClick={() => {
                        setSelectedEducation((prev) =>
                          prev.includes(edu.value)
                            ? prev.filter((e) => e !== edu.value)
                            : [...prev, edu.value],
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedEducation.includes(edu.value)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {edu.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Titles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المسمى الوظيفي
                </label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TITLES.map((job) => (
                    <button
                      key={job.value}
                      type="button"
                      onClick={() => {
                        setSelectedJobs((prev) =>
                          prev.includes(job.value)
                            ? prev.filter((j) => j !== job.value)
                            : [...prev, job.value],
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedJobs.includes(job.value)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {job.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Income */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مستوى الدخل
                </label>
                <div className="flex flex-wrap gap-2">
                  {INCOME_LEVELS.map((income) => (
                    <button
                      key={income.value}
                      type="button"
                      onClick={() => {
                        setSelectedIncome((prev) =>
                          prev.includes(income.value)
                            ? prev.filter((i) => i !== income.value)
                            : [...prev, income.value],
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedIncome.includes(income.value)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {income.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Behaviors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السلوكيات
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BEHAVIORS.map((behavior) => (
                    <button
                      key={behavior.id}
                      type="button"
                      onClick={() => {
                        setSelectedBehaviors((prev) =>
                          prev.includes(behavior.id)
                            ? prev.filter((b) => b !== behavior.id)
                            : [...prev, behavior.id],
                        );
                      }}
                      className={`p-3 rounded-lg border text-right transition-colors ${
                        selectedBehaviors.includes(behavior.id)
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{behavior.name}</p>
                      <p className="text-xs text-gray-500">
                        {behavior.category}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Life Events */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  أحداث الحياة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LIFE_EVENTS.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setSelectedLifeEvents((prev) =>
                          prev.includes(event.id)
                            ? prev.filter((e) => e !== event.id)
                            : [...prev, event.id],
                        );
                      }}
                      className={`p-3 rounded-lg border text-right transition-colors ${
                        selectedLifeEvents.includes(event.id)
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="text-xs text-gray-500">{event.category}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الآباء
                </label>
                <div className="space-y-2">
                  {PARENTS_OPTIONS.map((parent) => (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => {
                        setSelectedParents((prev) =>
                          prev.includes(parent.id)
                            ? prev.filter((p) => p !== parent.id)
                            : [...prev, parent.id],
                        );
                      }}
                      className={`w-full p-3 rounded-lg border text-right transition-colors ${
                        selectedParents.includes(parent.id)
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{parent.name}</p>
                      <p className="text-xs text-gray-500">{parent.age}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Custom & Lookalike Audiences */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              الجماهير المخصصة والمشابهة
            </h4>

            {loadingAudiences ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">
                  جاري تحميل الجماهير...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Custom Audiences */}
                {customAudiences.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الجماهير المخصصة ({customAudiences.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {customAudiences.map((audience) => (
                        <label
                          key={audience.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomAudiences.includes(
                              audience.id,
                            )}
                            onChange={() => toggleCustomAudience(audience.id)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {audience.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {audience.audienceSize?.toLocaleString() || 0} شخص
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lookalike Audiences */}
                {lookalikeAudiences.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الجماهير المشابهة ({lookalikeAudiences.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {lookalikeAudiences.map((audience) => (
                        <label
                          key={audience.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLookalikeAudiences.includes(
                              audience.id,
                            )}
                            onChange={() =>
                              toggleLookalikeAudience(audience.id)
                            }
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {audience.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {audience.audienceSize?.toLocaleString() || 0} شخص
                              • {audience.ratio}% تشابه
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {customAudiences.length === 0 &&
                  lookalikeAudiences.length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        لا توجد جماهير متاحة
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        يمكنك إنشاء جماهير مخصصة من صفحة الجماهير
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Exclude Audiences */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              استبعاد جماهير
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              استبعد أشخاصاً معينين من رؤية إعلانك (مثل: العملاء الحاليين،
              المشتركين)
            </p>

            {customAudiences.length > 0 || lookalikeAudiences.length > 0 ? (
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                  {[...customAudiences, ...lookalikeAudiences].map(
                    (audience) => (
                      <label
                        key={`exclude-${audience.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={excludedAudiences.includes(audience.id)}
                          onChange={() => {
                            setExcludedAudiences((prev) =>
                              prev.includes(audience.id)
                                ? prev.filter((id) => id !== audience.id)
                                : [...prev, audience.id],
                            );
                          }}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {audience.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {audience.audienceSize?.toLocaleString() || 0} شخص
                          </p>
                        </div>
                        <span className="text-xs text-red-600 font-medium">
                          استبعاد
                        </span>
                      </label>
                    ),
                  )}
                </div>
                {excludedAudiences.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      ✓ سيتم استبعاد {excludedAudiences.length} جمهور من رؤية
                      هذا الإعلان
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">
                  لا توجد جماهير متاحة للاستبعاد
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
