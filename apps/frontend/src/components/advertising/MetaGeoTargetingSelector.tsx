import React, { useEffect, useState } from "react";
import {
  facebookAdsService,
  MetaGeoLocation,
} from "../../services/facebookAdsService";

export interface MetaGeoCountryOption {
  code: string;
  name: string;
  flag?: string;
}

type GeoMode = "COUNTRY" | "LOCAL";
type GeoSearchType = "region" | "city";

interface MetaGeoTargetingSelectorProps {
  countries: MetaGeoCountryOption[];
  selectedCountries: string[];
  selectedRegions: MetaGeoLocation[];
  selectedCities: MetaGeoLocation[];
  locationTypes?: Array<"home" | "recent">;
  error?: string;
  defaultCountryCode?: string;
  onCountriesChange: (countries: string[]) => void;
  onRegionsChange: (regions: MetaGeoLocation[]) => void;
  onCitiesChange: (cities: MetaGeoLocation[]) => void;
  onLocationTypesChange: (locationTypes: Array<"home" | "recent">) => void;
}

const describeGeo = (location: MetaGeoLocation) => {
  const region = location.region ? ` - ${location.region}` : "";
  const typeLabel =
    location.type === "region"
      ? "محافظة"
      : location.type === "city"
        ? "مدينة"
        : "منطقة";

  return `${typeLabel}: ${location.name}${region}`;
};

const MetaGeoTargetingSelector: React.FC<MetaGeoTargetingSelectorProps> = ({
  countries,
  selectedCountries,
  selectedRegions,
  selectedCities,
  locationTypes = ["home", "recent"],
  error,
  defaultCountryCode = "EG",
  onCountriesChange,
  onRegionsChange,
  onCitiesChange,
  onLocationTypesChange,
}) => {
  const [mode, setMode] = useState<GeoMode>(
    selectedRegions.length > 0 || selectedCities.length > 0 ? "LOCAL" : "COUNTRY",
  );
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<GeoSearchType>("region");
  const [searchCountryCode, setSearchCountryCode] = useState(defaultCountryCode);
  const [results, setResults] = useState<MetaGeoLocation[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedLocalCount = selectedRegions.length + selectedCities.length;
  const selectedCountryNames = selectedCountries
    .map((code) => countries.find((country) => country.code === code)?.name || code)
    .join(", ");

  useEffect(() => {
    if (selectedLocalCount > 0 && mode !== "LOCAL") {
      setMode("LOCAL");
    }
  }, [mode, selectedLocalCount]);

  const switchMode = (nextMode: GeoMode) => {
    setMode(nextMode);
    setQuery("");
    setResults([]);

    if (nextMode === "COUNTRY") {
      onRegionsChange([]);
      onCitiesChange([]);
      onLocationTypesChange(["home", "recent"]);
      if (selectedCountries.length === 0) {
        onCountriesChange([defaultCountryCode]);
      }
      return;
    }

    onCountriesChange([]);
    onLocationTypesChange(["home"]);
  };

  const searchLocations = async (nextQuery: string) => {
    if (!nextQuery.trim() || nextQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const nextResults = await facebookAdsService.searchGeoLocations(nextQuery, {
        countryCode: searchCountryCode,
        locationTypes: [searchType],
        limit: 12,
      });
      setResults(nextResults || []);
    } catch (error) {
      console.error("Geo targeting search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addLocation = (location: MetaGeoLocation) => {
    if (location.type === "region") {
      if (!selectedRegions.some((region) => region.key === location.key)) {
        onRegionsChange([...selectedRegions, location]);
      }
    } else if (!selectedCities.some((city) => city.key === location.key)) {
      onCitiesChange([
        ...selectedCities,
        {
          ...location,
          radius: location.radius || 25,
          distance_unit: location.distance_unit || "kilometer",
        },
      ]);
    }

    setQuery("");
    setResults([]);
  };

  const removeRegion = (key: string) => {
    onRegionsChange(selectedRegions.filter((region) => region.key !== key));
  };

  const removeCity = (key: string) => {
    onCitiesChange(selectedCities.filter((city) => city.key !== key));
  };

  const updateCityRadius = (key: string, radius: number) => {
    onCitiesChange(
      selectedCities.map((city) =>
        city.key === key ? { ...city, radius: Math.max(1, radius) } : city,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          المواقع <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => switchMode("COUNTRY")}
            className={`rounded-xl border-2 p-4 text-right transition-all ${
              mode === "COUNTRY"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
            }`}
          >
            <span className="block font-semibold">استهداف دولة كاملة</span>
            <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
              مناسب للاختبار العام أو عندما يكون الشحن متاحًا في كل الدولة.
            </span>
          </button>
          <button
            type="button"
            onClick={() => switchMode("LOCAL")}
            className={`rounded-xl border-2 p-4 text-right transition-all ${
              mode === "LOCAL"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
            }`}
          >
            <span className="block font-semibold">محافظات ومدن محددة</span>
            <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
              يمنع خلط مصر كلها مع القاهرة/الجيزة مثلًا حتى لا يرفض Meta الاستهداف.
            </span>
          </button>
        </div>
      </div>

      {mode === "COUNTRY" ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  const updated = selectedCountries.includes(country.code)
                    ? selectedCountries.filter((code) => code !== country.code)
                    : [...selectedCountries, country.code];
                  onCountriesChange(updated);
                }}
                className={`py-2 px-3 border-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCountries.includes(country.code)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                }`}
              >
                {country.flag ? <span className="ml-1">{country.flag}</span> : null}
                {country.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            محدد: {selectedCountryNames || "لا توجد دول محددة"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                دولة البحث
              </label>
              <select
                value={searchCountryCode}
                onChange={(event) => {
                  setSearchCountryCode(event.target.value);
                  setResults([]);
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                نوع المكان
              </label>
              <select
                value={searchType}
                onChange={(event) => {
                  setSearchType(event.target.value as GeoSearchType);
                  setResults([]);
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="region">محافظة</option>
                <option value="city">مدينة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                نطاق الأشخاص
              </label>
              <select
                value={locationTypes.includes("recent") ? "home_recent" : "home"}
                onChange={(event) =>
                  onLocationTypesChange(
                    event.target.value === "home_recent"
                      ? ["home", "recent"]
                      : ["home"],
                  )
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="home">المقيمون فقط</option>
                <option value="home_recent">المقيمون أو الموجودون حديثًا</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <input
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                void searchLocations(nextQuery);
              }}
              placeholder={
                searchType === "region"
                  ? "ابحث عن محافظة مثل Cairo أو Giza"
                  : "ابحث عن مدينة مثل Mansoura أو Tanta"
              }
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500"
            />
            {loading && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-700 dark:text-emerald-400">
                بحث...
              </span>
            )}
          </div>

          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.key}`}
                  type="button"
                  onClick={() => addLocation(result)}
                  className="flex w-full items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3 text-right last:border-b-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {result.name}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {result.type === "region" ? "محافظة" : "مدينة"} -{" "}
                      {result.region || result.country_name || result.country_code}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    إضافة
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {selectedRegions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  المحافظات المختارة
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedRegions.map((region) => (
                    <button
                      key={region.key}
                      type="button"
                      onClick={() => removeRegion(region.key)}
                      className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                    >
                      {describeGeo(region)} ×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedCities.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  المدن المختارة
                </p>
                <div className="space-y-2">
                  {selectedCities.map((city) => (
                    <div
                      key={city.key}
                      className="flex flex-col gap-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => removeCity(city.key)}
                        className="text-right text-sm font-medium text-emerald-800 dark:text-emerald-300 hover:text-red-600 dark:hover:text-red-400"
                      >
                        {describeGeo(city)} ×
                      </button>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        نصف القطر
                        <input
                          type="number"
                          min={1}
                          max={80}
                          value={city.radius || 25}
                          onChange={(event) =>
                            updateCityRadius(city.key, Number(event.target.value))
                          }
                          className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-center"
                        />
                        كم
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedLocalCount === 0 && (
              <p className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-400">
                ابحث واختر محافظة أو مدينة واحدة على الأقل. لن يتم إرسال الدولة
                كاملة مع المحافظات/المدن حتى لا يحدث تداخل في Meta.
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default MetaGeoTargetingSelector;
