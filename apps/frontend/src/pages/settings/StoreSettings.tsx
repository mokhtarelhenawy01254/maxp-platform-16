import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import {
  BuildingStorefrontIcon,
  TruckIcon,
  GiftIcon,
  DocumentTextIcon,
  CreditCardIcon,
  WalletIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";
import {
  storeSettingsService,
  Branch,
  ShippingZone,
  CanonicalGovernorate,
} from "../../services/storeSettingsService";
import {
  footerSettingsService,
  FooterSettings,
} from "../../services/footerSettingsService";
import { BranchesSection } from "../../components/store/BranchesSection";
import { ShippingSectionV2 } from "../../components/store/ShippingSectionV2";
import { CheckoutFormSection } from "../../components/store/CheckoutFormSection";
import { FooterSettingsSection } from "../../components/store/FooterSettingsSection";
import { BranchModal } from "../../components/store/BranchModal";
import { ShippingModalV2 } from "../../components/store/ShippingModalV2";
import { CheckoutAddressSettingsSection } from "./CheckoutAddressSettingsSection";
import PromotionSettings from "./PromotionSettings";
import { EGYPT_GOVERNORATES } from "../../constants/egyptGovernorates";
import {
  DEFAULT_SHIPPING_CLASSES,
  ShippingClassOption,
  buildDefaultClassFees,
  ensureShippingClassesForKeys,
  mergeShippingClasses,
  normalizeFeesMap,
  normalizeShippingClassKey,
} from "../../constants/shippingClasses";
import { StorefrontSettings } from "../../services/storefrontSettingsService";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import {
  DEFAULT_STOREFRONT_THEME_ID,
  getStorefrontThemePreset,
} from "../../storefront/themes";
import {
  applyStorefrontPageOverrides,
  getStorefrontPageOverridesFromDesignTokens,
  upsertStorefrontPageOverridesInDesignTokens,
} from "../../storefront/utils/pageOverrides";
import {
  DEFAULT_CHECKOUT_FORM_SETTINGS,
  useCheckoutFormSettings,
} from "../../hooks/useCheckoutFormSettings";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  resolveStorefrontThemeId,
  getErrorMessage,
} from "../../utils/storefrontSettingsHelpers";
import { checkoutFormSettingsService } from "../../services/checkoutFormSettingsService";
import { PDP_CHECKOUT_SECTION_ID } from "../../storefront/utils/pdpCheckout";
import {
  DEFAULT_PDP_QUICK_ORDER_SETTINGS,
  getPdpQuickOrderSettingsFromDesignTokens,
  PdpQuickOrderSettings,
  upsertPdpQuickOrderSettingsInDesignTokens,
} from "../../storefront/utils/pdpQuickOrderSettings";
import type { StorefrontSectionConfig } from "../../storefront/types/theme.types";

type StoreSettingsTab =
  | "branches"
  | "shipping"
  | "storefront"
  | "checkout"
  | "payment"
  | "footer"
  | "promotion"
  | "delivery"
  | "recommendations"
  | "features"
  | "homepage"
  | "product-gallery";

const VALID_STORE_SETTINGS_TABS = new Set<StoreSettingsTab>([
  "branches",
  "shipping",
  "storefront",
  "checkout",
  "payment",
  "footer",
  "promotion",
  "delivery",
  "recommendations",
  "features",
  "homepage",
  "product-gallery",
]);

const resolveRequestedTab = (value: string | null): StoreSettingsTab =>
  VALID_STORE_SETTINGS_TABS.has(value as StoreSettingsTab)
    ? (value as StoreSettingsTab)
    : "branches";

type StorefrontSectionEntry = string | StorefrontSectionConfig;
type PromotionSettingsState = Record<string, unknown>;
const GOVERNORATE_CODE_ALIASES: Record<string, string> = {
  october: "6th-october",
  "6-october": "6th-october",
  zayed: "sheikh-zayed",
  "new-cairo-city": "new-cairo",
  may15: "15th-may",
  assiut: "asyut",
  cairo: "cairo",
  giza: "giza",
  qalyubia: "qalyubia",
  alexandria: "alexandria",
  beheira: "beheira",
  gharbia: "gharbia",
  sharqia: "sharqia",
  monufia: "monufia",
  dakahlia: "dakahlia",
  "port-said": "port-said",
  ismailia: "ismailia",
  suez: "suez",
  fayoum: "fayoum",
  "beni-suef": "beni-suef",
  minya: "minya",
  asyut: "asyut",
  sohag: "sohag",
  qena: "qena",
  luxor: "luxor",
  aswan: "aswan",
  "red-sea": "red-sea",
  "new-valley": "new-valley",
  matrouh: "matrouh",
  "north-sinai": "north-sinai",
  "south-sinai": "south-sinai",
  "6th-october": "6th-october",
  "sheikh-zayed": "sheikh-zayed",
  "new-cairo": "new-cairo",
  helwan: "helwan",
  "15th-may": "15th-may",
};

const getStorefrontSectionType = (section: StorefrontSectionEntry): string =>
  typeof section === "string" ? section : section.type;

const hasPdpCheckoutSection = (sections: StorefrontSectionEntry[]): boolean =>
  sections.some(
    (section) => getStorefrontSectionType(section) === PDP_CHECKOUT_SECTION_ID,
  );

const insertPdpCheckoutSection = (
  sections: StorefrontSectionEntry[],
): StorefrontSectionEntry[] => {
  if (hasPdpCheckoutSection(sections)) {
    return sections;
  }

  const nextSections = [...sections];
  const insertionAnchorTypes = ["conversion-stack", "product-info"];
  const anchorIndex = insertionAnchorTypes
    .map((anchorType) =>
      nextSections.findIndex(
        (section) => getStorefrontSectionType(section) === anchorType,
      ),
    )
    .find((index) => index >= 0);

  const pdpCheckoutSection: StorefrontSectionConfig = {
    type: PDP_CHECKOUT_SECTION_ID,
  };

  if (typeof anchorIndex === "number" && anchorIndex >= 0) {
    nextSections.splice(anchorIndex + 1, 0, pdpCheckoutSection);
    return nextSections;
  }

  nextSections.push(pdpCheckoutSection);
  return nextSections;
};

const removePdpCheckoutSection = (
  sections: StorefrontSectionEntry[],
): StorefrontSectionEntry[] =>
  sections.filter(
    (section) => getStorefrontSectionType(section) !== PDP_CHECKOUT_SECTION_ID,
  );

const resolvePdpCheckoutSections = (
  settings?: StorefrontSettings | null,
): StorefrontSectionEntry[] => {
  const themeId = resolveStorefrontThemeId(settings);
  const baseTheme = getStorefrontThemePreset(themeId);
  const pageOverrides = getStorefrontPageOverridesFromDesignTokens(
    settings?.designTokens,
  );
  const resolvedTheme = applyStorefrontPageOverrides(baseTheme, pageOverrides);

  return (resolvedTheme.pages.pdp?.sections || []) as StorefrontSectionEntry[];
};

const resolvePdpCheckoutEnabled = (
  settings?: StorefrontSettings | null,
): boolean => {
  return settings?.productPageShowCheckoutForm !== false;
};

const applyPdpCheckoutVisibilityToStorefrontSettings = (
  currentSettings?: StorefrontSettings | null,
  enabled = true,
): StorefrontSettings => {
  const nextSettings = {
    ...(currentSettings || ({} as StorefrontSettings)),
  };
  const designTokens =
    typeof nextSettings.designTokens === "object" && nextSettings.designTokens !== null
      ? nextSettings.designTokens
      : {};
  const pageOverrides = getStorefrontPageOverridesFromDesignTokens(designTokens);
  const currentPdpOverride = pageOverrides.pdp;
  const basePdpSections = (
    getStorefrontThemePreset(resolveStorefrontThemeId(nextSettings)).pages.pdp
      ?.sections || []
  ) as StorefrontSectionEntry[];
  const currentPdpSections =
    currentPdpOverride && Array.isArray(currentPdpOverride.sections)
      ? (currentPdpOverride.sections as StorefrontSectionEntry[])
      : basePdpSections;
  const nextPdpSections = enabled
    ? insertPdpCheckoutSection(currentPdpSections)
    : removePdpCheckoutSection(currentPdpSections);
  const nextPageOverrides = {
    ...pageOverrides,
    pdp: {
      ...(currentPdpOverride || {}),
      sections: nextPdpSections,
    },
  };

  return {
    ...nextSettings,
    productPageShowCheckoutForm: enabled,
    designTokens: upsertStorefrontPageOverridesInDesignTokens(
      designTokens,
      nextPageOverrides,
    ),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const applyPdpQuickOrderSettingsToStorefrontSettings = (
  currentSettings?: StorefrontSettings | null,
  pdpQuickOrderSettings?: PdpQuickOrderSettings,
): StorefrontSettings => {
  const nextSettings = {
    ...(currentSettings || ({} as StorefrontSettings)),
  };

  const normalizedSettings =
    pdpQuickOrderSettings || DEFAULT_PDP_QUICK_ORDER_SETTINGS;
  const nextDesignTokens = upsertPdpQuickOrderSettingsInDesignTokens(
    nextSettings.designTokens,
    normalizedSettings,
  );

  if (
    isRecord(nextDesignTokens) &&
    isRecord(nextDesignTokens.pageOverrides) &&
    isRecord((nextDesignTokens.pageOverrides as Record<string, unknown>).pdp)
  ) {
    const pdp = (nextDesignTokens.pageOverrides as Record<string, unknown>)
      .pdp as Record<string, unknown>;
    if (Array.isArray(pdp.sections)) {
      pdp.sections = pdp.sections.map((sectionEntry: unknown) => {
        if (
          sectionEntry &&
          typeof sectionEntry === 'object' &&
          'type' in sectionEntry &&
          ((sectionEntry as { type: string }).type === 'pdp-checkout' ||
            (sectionEntry as { type: string }).type === 'pdpQuickOrder')
        ) {
          const currentSection = sectionEntry as {
            type: string;
            settings?: Record<string, unknown>;
          };
          return {
            ...currentSection,
            settings: {
              ...(currentSection.settings || {}),
              placement: normalizedSettings.placement,
              surfaceMode: normalizedSettings.surfaceMode,
              showQuantity: normalizedSettings.showQuantity,
              showOrderSummary: normalizedSettings.showOrderSummary,
              autoSelectVariants: normalizedSettings.autoSelectVariants,
              fields: normalizedSettings.fields,
            },
          };
        }
        return sectionEntry;
      });
    }
  }

  return {
    ...nextSettings,
    designTokens: nextDesignTokens,
  };
};

const isExpectedOptionalLoadError = (error: unknown): boolean => {
  const status =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status ===
      "number"
      ? Number((error as { response?: { status?: number } }).response?.status)
      : 0;

  return status === 404;
};

interface StoreSettingsProps {
  forcedTab?: StoreSettingsTab;
  hideNavigation?: boolean;
  pageTitle?: string;
  pageDescription?: string;
}

const StoreSettings: React.FC<StoreSettingsProps> = ({
  forcedTab,
  hideNavigation = false,
  pageTitle: propPageTitle,
  pageDescription: propPageDescription,
}) => {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const pageTitle = propPageTitle ?? t("storeSettings.pageTitle");
  const pageDescription = propPageDescription ?? t("storeSettings.pageDescription");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<StoreSettingsTab>(() =>
    forcedTab || resolveRequestedTab(searchParams.get("tab")),
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [canonicalGovernorates, setCanonicalGovernorates] = useState<CanonicalGovernorate[]>([]);
  const [footerSettings, setFooterSettings] = useState<Partial<FooterSettings>>(
    {},
  );
  const [storefrontSettings, setStorefrontSettings] = useState<StorefrontSettings>({} as StorefrontSettings);
  const [promotionSettings, setPromotionSettings] =
    useState<PromotionSettingsState>({});
  const [loading, setLoading] = useState(true);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingShipping, setEditingShipping] = useState<ShippingZone | null>(
    null,
  );
  const [shippingClassMode, setShippingClassMode] = useState<
    "max" | "per_item"
  >("max");
  const [shippingClassFees, setShippingClassFees] = useState<
    Record<string, number>
  >({ ...buildDefaultClassFees(DEFAULT_SHIPPING_CLASSES) });
  const [shippingClasses, setShippingClasses] = useState<ShippingClassOption[]>(
    DEFAULT_SHIPPING_CLASSES,
  );
  const [savingShippingClassFees, setSavingShippingClassFees] =
    useState(false);
  const [newShippingClassLabel, setNewShippingClassLabel] = useState("");
  const [newShippingClassKey, setNewShippingClassKey] = useState("");
  const [processingCheckoutTab, setProcessingCheckoutTab] = useState(false);
  const checkoutSettingsEnabled =
    activeTab === "checkout" && isAuthenticated && Boolean(user?.companyId);
  const {
    settings: checkoutFormSettings,
    loading: checkoutFormSettingsLoading,
    saving: checkoutFormSettingsSaving,
    applySettings: applyCheckoutFormSettings,
    handleSave: handleSaveCheckoutFormSettings,
    loadSettings: reloadCheckoutFormSettings,
  } = useCheckoutFormSettings({
    enabled: checkoutSettingsEnabled,
  });

  // Branch form state
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    workingHours: "",
    isActive: true,
  });

  // Shipping form state
  const [shippingForm, setShippingForm] = useState<Partial<ShippingZone>>({
    name: "",
    governorateIds: [],
    governorates: [],
    pricingType: "flat",
    price: 0,
    deliveryTime: "",
    deliveryTimeType: "1-2",
    isActive: true,
  });

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated || !user?.companyId) {
      setLoading(false);
      return;
    }

    loadData();
  }, [isAuthLoading, isAuthenticated, user?.companyId]);

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
      return;
    }

    if (searchParams.get("tab")) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("tab", "branches");
    setSearchParams(nextSearchParams, { replace: true });
  }, [forcedTab, searchParams, setSearchParams]);

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
      return;
    }

      const requestedTab = resolveRequestedTab(searchParams.get("tab"));
      if (requestedTab === "storefront") {
        navigate("/settings/storefront/editor", { replace: true });
        return;
      }
    setActiveTab((currentTab) =>
      currentTab === requestedTab ? currentTab : requestedTab,
    );
  }, [forcedTab, navigate, searchParams]);

  const loadOptionalTabData = async (tab: StoreSettingsTab) => {
    if (tab === "footer") {
      try {
        const footerRes = await footerSettingsService.getSettings({
          _skipErrorToast: true,
        });
        setFooterSettings(footerRes.data.data || {});
      } catch (error) {
        if (!isExpectedOptionalLoadError(error)) {
          console.error("Error loading footer settings:", error);
        }
      }

      return;
    }

    if (tab === "promotion" || tab === "shipping") {
      try {
        const promotionRes = await apiClient.get("/promotion-settings", {
          _skipErrorToast: true,
        });
        setPromotionSettings(promotionRes.data.data || {});
      } catch (error) {
        if (!isExpectedOptionalLoadError(error)) {
          console.error("Error loading promotion settings:", error);
        }
      }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        branchesRes,
        zonesRes,
        canonicalGovernoratesRes,
        storefrontRes,
        settingsRes,
      ] = await Promise.allSettled([
        storeSettingsService.getBranches(),
        storeSettingsService.getShippingZones(),
        storeSettingsService.getCanonicalGovernorates(),
        storefrontSettingsService.getSettings(undefined, {
          allowFallback: false,
        }),
        apiClient.get("/settings/company"),
      ]);

      if (branchesRes.status === "fulfilled") {
        setBranches(branchesRes.value.data.data || []);
      }

      if (zonesRes.status === "fulfilled") {
        setShippingZones(zonesRes.value.data.data || []);
      }

      if (canonicalGovernoratesRes.status === "fulfilled") {
        setCanonicalGovernorates(canonicalGovernoratesRes.value.data.data || []);
      }

      if (storefrontRes.status === "fulfilled") {
        const nextStorefrontSettings = (storefrontRes.value.data ||
          {}) as StorefrontSettings;
        setStorefrontSettings(nextStorefrontSettings);
      }

      const companySettings =
        settingsRes.status === "fulfilled"
          ? settingsRes.value?.data?.data?.settings || {}
          : {};
      const feesFromSettings = normalizeFeesMap(
        companySettings.shippingClassFees || companySettings.classFees || {},
      );
      const modeFromSettings =
        companySettings.shippingClassMode || companySettings.classMode || "max";
      const storedClasses =
        companySettings.shippingClasses ||
        companySettings.shippingClassOptions ||
        companySettings.classOptions ||
        [];
      let mergedClasses = mergeShippingClasses(storedClasses);
      mergedClasses = ensureShippingClassesForKeys(
        mergedClasses,
        Object.keys(feesFromSettings),
      );
      setShippingClasses(mergedClasses);

      const baseFees = buildDefaultClassFees(mergedClasses);
      setShippingClassFees({ ...baseFees, ...feesFromSettings });
      setShippingClassMode(modeFromSettings === "per_item" ? "per_item" : "max");

      const hasBlockingFailures = [
        branchesRes,
        zonesRes,
        canonicalGovernoratesRes,
        storefrontRes,
        settingsRes,
      ].some((result) => result.status === "rejected");

      if (hasBlockingFailures) {
        toast.error(t("storeSettings.dataLoadedPartial"));
      }
    } catch (error) {
      toast.error(t("storeSettings.failedToLoadData"));
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncStorefrontSettingsState = (nextStorefrontSettings: StorefrontSettings) => {
    setStorefrontSettings(nextStorefrontSettings);
  };

  // Branch operations
  const handleAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      workingHours: "",
      isActive: true,
    });
    setShowBranchModal(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm(branch);
    setShowBranchModal(true);
  };

  const handleSaveBranch = async () => {
    try {
      if (!branchForm.name || !branchForm.phone) {
        toast.error(t("storeSettings.requiredFieldsMissing"));
        return;
      }

      if (editingBranch) {
        await storeSettingsService.updateBranch(editingBranch.id, branchForm);
        toast.success(t("storeSettings.branchUpdated"));
      } else {
        await storeSettingsService.createBranch(branchForm);
        toast.success(t("storeSettings.branchAdded"));
      }

      setShowBranchModal(false);
      loadData();
    } catch (error) {
      toast.error(t("storeSettings.branchSaveFailed"));
      console.error("Error saving branch:", error);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm(t("storeSettings.deleteBranchConfirm"))) return;

    try {
      await storeSettingsService.deleteBranch(id);
      toast.success(t("storeSettings.branchDeleted"));
      loadData();
    } catch (error) {
      toast.error(t("storeSettings.branchDeleteFailed"));
      console.error("Error deleting branch:", error);
    }
  };

  // Shipping operations
  const handleAddShipping = () => {
    setEditingShipping(null);
    setShippingForm({
      name: "",
      governorateIds: [],
      governorates: [],
      pricingType: "flat",
      price: 0,
      deliveryTime: "1-2 يوم",
      deliveryTimeType: "1-2",
      isActive: true,
    });
    setShowShippingModal(true);
  };

  const normalizeGovernorateCode = useCallback((value: string) => {
    const raw = String(value || '').trim();
    return GOVERNORATE_CODE_ALIASES[raw] || raw;
  }, []);

  const resolveZoneGovernorateIds = useCallback(
    (zone: ShippingZone): string[] => {
      const ids = new Set<string>();
      const governorateNameToId = new Map(
        EGYPT_GOVERNORATES.map((gov) => [gov.nameAr, gov.id]),
      );

      (zone.governorateIds || []).forEach((id) => {
        const normalizedId = normalizeGovernorateCode(id);
        if (normalizedId) ids.add(normalizedId);
      });

      (zone.canonicalGovernorates || []).forEach((gov) => {
        const normalizedCode = normalizeGovernorateCode(gov?.code || '');
        if (normalizedCode) ids.add(normalizedCode);
      });

      const zoneGovernorates = Array.isArray(zone.governorates)
        ? zone.governorates
        : [];

      zoneGovernorates.forEach((name) => {
        const normalized = String(name || '').trim();
        if (!normalized) return;

        const directUiId = governorateNameToId.get(normalized);
        if (directUiId) {
          ids.add(directUiId);
        }

        const canonical = canonicalGovernorates.find((gov) => {
          const normalizedCode = normalizeGovernorateCode(gov.code);
          if (
            gov.nameAr === normalized ||
            gov.nameEn === normalized ||
            normalizedCode === normalized ||
            gov.code === normalized
          ) {
            return true;
          }

          return (gov.aliases || []).some((alias) => alias.alias === normalized);
        });

        if (canonical?.code) {
          ids.add(normalizeGovernorateCode(canonical.code));
        }
      });

      return [...ids];
    },
    [canonicalGovernorates, normalizeGovernorateCode],
  );

  const handleEditShipping = (zone: ShippingZone) => {
    setEditingShipping(zone);
    setShippingForm({
      ...zone,
      governorateIds: resolveZoneGovernorateIds(zone),
      pricingType: zone.pricingType || "flat",
      deliveryTimeType: zone.deliveryTimeType || "custom",
    });
    setShowShippingModal(true);
  };

  useEffect(() => {
    if (!showShippingModal || !editingShipping || canonicalGovernorates.length === 0) {
      return;
    }

    setShippingForm((prev) => ({
      ...prev,
      ...editingShipping,
      governorateIds: resolveZoneGovernorateIds(editingShipping),
      pricingType: editingShipping.pricingType || prev.pricingType || 'flat',
      deliveryTimeType: editingShipping.deliveryTimeType || prev.deliveryTimeType || 'custom',
    }));
  }, [
    showShippingModal,
    editingShipping,
    canonicalGovernorates,
    resolveZoneGovernorateIds,
  ]);

  const handleSaveShipping = async () => {
    try {
      if (
        !shippingForm.governorateIds?.length ||
        !shippingForm.deliveryTime
      ) {
        toast.error(t("storeSettings.shippingRequiredFields"));
        return;
      }

      if (
        shippingForm.pricingType === "flat" &&
        (!shippingForm.price || shippingForm.price <= 0)
      ) {
        toast.error(t("storeSettings.enterValidPrice"));
        return;
      }

      if (
        shippingForm.pricingType === "tiered" &&
        (!shippingForm.pricingTiers?.length ||
          shippingForm.pricingTiers.some((pt) => !pt.price || pt.price <= 0))
      ) {
        toast.error(t("storeSettings.enterValidTieredPrices"));
        return;
      }

      const governorateNames = shippingForm.governorateIds
        ?.map((id) => {
          const canonical = canonicalGovernorates.find((g) => g.code === id);
          if (canonical?.nameAr) return canonical.nameAr;
          const gov = EGYPT_GOVERNORATES.find((g) => g.id === id);
          return gov?.nameAr;
        })
        .filter(Boolean) as string[];

      const fallbackVariations: string[] = [];
      governorateNames.forEach((name) => {
        const variations =
          storeSettingsService.generateGovernorateVariations(name);
        fallbackVariations.push(...variations);
      });

      const dataToSave = {
        ...shippingForm,
        governorates: governorateNames.length > 0 ? governorateNames : fallbackVariations,
      };

      if (editingShipping) {
        await storeSettingsService.updateShippingZone(
          editingShipping.id,
          dataToSave,
        );
        toast.success(t("storeSettings.shippingUpdated"));
      } else {
        await storeSettingsService.createShippingZone(dataToSave);
        toast.success(t("storeSettings.shippingAdded"));
      }

      setShowShippingModal(false);
      loadData();
    } catch (error) {
      toast.error(t("storeSettings.shippingSaveFailed"));
      console.error("Error saving shipping zone:", error);
    }
  };

  const handleDeleteShipping = async (id: string) => {
    if (!confirm(t("storeSettings.deleteShippingConfirm"))) return;

    try {
      await storeSettingsService.deleteShippingZone(id);
      toast.success(t("storeSettings.shippingDeleted"));
      loadData();
    } catch (error) {
      toast.error(t("storeSettings.shippingDeleteFailed"));
      console.error("Error deleting shipping zone:", error);
    }
  };

  const handleUpdatePromotionSettings = async (
    data: PromotionSettingsState,
  ) => {
    try {
      setLoading(true);
      await apiClient.post("/promotion-settings", data);
      setPromotionSettings(data);
      toast.success(t("storeSettings.promotionUpdated"));
    } catch (error) {
      toast.error(t("storeSettings.promotionUpdateFailed"));
      console.error("Error updating promotion settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShippingClass = async () => {
    const rawLabel = newShippingClassLabel.trim();
    const rawKey = newShippingClassKey.trim() || rawLabel;
    if (!rawLabel && !rawKey) {
      toast.error(t("storeSettings.shippingClassNameRequired"));
      return;
    }

    const normalizedKey = normalizeShippingClassKey(rawKey) || `class-${Date.now()}`;
    const exists = shippingClasses.some(
      (option) => normalizeShippingClassKey(option.key) === normalizedKey,
    );
    if (exists) {
      toast.error(t("storeSettings.shippingClassExists"));
      return;
    }

    const nextLabel = rawLabel || normalizedKey;
    const newClass = { key: normalizedKey, label: nextLabel };

    // Keep track of previous state for rollback
    const prevClasses = [...shippingClasses];
    const prevFees = { ...shippingClassFees };

    // Update local state optimistically
    const nextClasses = [...shippingClasses, newClass];
    const nextFees = {
      ...shippingClassFees,
      [normalizedKey]: shippingClassFees[normalizedKey] ?? 0,
    };

    setShippingClasses(nextClasses);
    setShippingClassFees(nextFees);
    setNewShippingClassLabel("");
    setNewShippingClassKey("");

    try {
      const classesToSave = nextClasses.length > 0 ? nextClasses : DEFAULT_SHIPPING_CLASSES;
      const normalizedClasses = classesToSave
        .map((option) => ({
          key: normalizeShippingClassKey(option.key),
          label: option.label?.trim() || option.key,
        }))
        .filter((option) => option.key);
      const normalizedFees = normalizeFeesMap(nextFees);
      const baseFees = buildDefaultClassFees(normalizedClasses);
      const mergedFees = { ...baseFees, ...normalizedFees };
      normalizedClasses.forEach((option) => {
        if (mergedFees[option.key] === undefined) {
          mergedFees[option.key] = 0;
        }
      });

      await apiClient.put("/settings/company", {
        settings: {
          shippingClassFees: mergedFees,
          shippingClassMode,
          shippingClasses: normalizedClasses,
        },
      });

      toast.success(t("storeSettings.classAdded"));
    } catch (error) {
      // Revert optimistic updates
      setShippingClasses(prevClasses);
      setShippingClassFees(prevFees);
      // Restore input values
      setNewShippingClassLabel(rawLabel);
      setNewShippingClassKey(rawKey !== rawLabel ? rawKey : "");

      toast.error(t("storeSettings.classSaveFailed"));
      console.error("Error saving shipping class:", error);
    }
  };

  const handleUpdateShippingClassLabel = (key: string, label: string) => {
    setShippingClasses((prev) =>
      prev.map((option) =>
        normalizeShippingClassKey(option.key) === normalizeShippingClassKey(key)
          ? { ...option, label }
          : option,
      ),
    );
  };

  const handleRemoveShippingClass = (key: string) => {
    const defaultKeys = new Set(
      DEFAULT_SHIPPING_CLASSES.map((option) =>
        normalizeShippingClassKey(option.key),
      ),
    );
    const normalizedKey = normalizeShippingClassKey(key);
    if (defaultKeys.has(normalizedKey)) {
      toast.error(t("storeSettings.defaultClassesNotDeletable"));
      return;
    }

    setShippingClasses((prev) =>
      prev.filter(
        (option) => normalizeShippingClassKey(option.key) !== normalizedKey,
      ),
    );
    setShippingClassFees((prev) => {
      const next = { ...prev };
      delete next[normalizedKey];
      return next;
    });
  };

  const handleSaveShippingClassFees = async () => {
    try {
      setSavingShippingClassFees(true);
      const classesToSave =
        shippingClasses.length > 0 ? shippingClasses : DEFAULT_SHIPPING_CLASSES;
      const normalizedClasses = classesToSave
        .map((option) => ({
          key: normalizeShippingClassKey(option.key),
          label: option.label?.trim() || option.key,
        }))
        .filter((option) => option.key);
      const normalizedFees = normalizeFeesMap(shippingClassFees);
      const baseFees = buildDefaultClassFees(normalizedClasses);
      const mergedFees = { ...baseFees, ...normalizedFees };
      normalizedClasses.forEach((option) => {
        if (mergedFees[option.key] === undefined) {
          mergedFees[option.key] = 0;
        }
      });
      await apiClient.put("/settings/company", {
        settings: {
          shippingClassFees: mergedFees,
          shippingClassMode,
          shippingClasses: normalizedClasses,
        },
      });
      setShippingClassFees(mergedFees);
      setShippingClasses(normalizedClasses);
      toast.success(t("storeSettings.classFeesSaved"));
    } catch (error) {
      toast.error(t("storeSettings.classFeesSaveFailed"));
      console.error("Error saving shipping class fees:", error);
    } finally {
      setSavingShippingClassFees(false);
    }
  };

  // Footer settings operations
  const handleSaveFooter = async () => {
    try {
      setLoading(true);
      await footerSettingsService.updateSettings(footerSettings);
      const storefrontResponse = await storefrontSettingsService.updateSettings({
        themeId: resolveStorefrontThemeId(storefrontSettings),
        designTokens: storefrontSettings.designTokens || {},
      });
      syncStorefrontSettingsState(storefrontResponse.data);
      toast.success(t("storeSettings.footerSaved"));
      loadData();
    } catch (error) {
      toast.error(t("storeSettings.footerSaveFailed"));
      console.error("Error saving footer settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFooter = async () => {
    if (
      !confirm(t("storeSettings.resetFooterConfirm"))
    )
      return;

    try {
      setLoading(true);
      await footerSettingsService.resetSettings();
      toast.success(t("storeSettings.footerReset"));
      loadData();
    } catch (error) {
      toast.error(t("storeSettings.footerResetFailed"));
      console.error("Error resetting footer settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void loadOptionalTabData(activeTab);
  }, [activeTab, isAuthLoading, isAuthenticated, user?.companyId]);

  const handleTabChange = (nextTab: StoreSettingsTab) => {
    if (forcedTab) {
      return;
    }

    setActiveTab(nextTab);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("tab", nextTab);
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleToggleProductPageCheckout = (enabled: boolean) => {
    setStorefrontSettings((current) =>
      applyPdpCheckoutVisibilityToStorefrontSettings(current, enabled),
    );
  };

  const handleChangePdpQuickOrderSettings = (
    nextPdpQuickOrderSettings: PdpQuickOrderSettings,
  ) => {
    setStorefrontSettings((current) =>
      applyPdpQuickOrderSettingsToStorefrontSettings(
        current,
        nextPdpQuickOrderSettings,
      ),
    );
  };

  const handleSaveCheckoutTabSettings = async () => {
    const checkoutFieldsSaved = await handleSaveCheckoutFormSettings(undefined, {
      silent: true,
    });

    if (!checkoutFieldsSaved) {
      toast.error(t("storeSettings.checkoutSaveFailed"));
      return false;
    }

    try {
      setProcessingCheckoutTab(true);
      const nextStorefrontDraft = applyPdpQuickOrderSettingsToStorefrontSettings(
        applyPdpCheckoutVisibilityToStorefrontSettings(
          storefrontSettings,
          resolvePdpCheckoutEnabled(storefrontSettings),
        ),
        getPdpQuickOrderSettingsFromDesignTokens(storefrontSettings.designTokens),
      );
      const storefrontResponse = await storefrontSettingsService.updateSettings({
        themeId: resolveStorefrontThemeId(nextStorefrontDraft),
        productPageShowCheckoutForm:
          nextStorefrontDraft.productPageShowCheckoutForm,
        designTokens: nextStorefrontDraft.designTokens || {},
      });

      syncStorefrontSettingsState(storefrontResponse.data);
      toast.success(t("storeSettings.checkoutSaved"));
      return true;
    } catch (error) {
      console.error("Error saving product page checkout settings:", error);
      toast.error(
        getErrorMessage(
          error,
          t("storeSettings.checkoutPartialSave"),
        ),
      );
      return false;
    } finally {
      setProcessingCheckoutTab(false);
    }
  };

  const handleResetCheckoutTabSettings = async () => {
    if (!window.confirm(t("storeSettings.resetCheckoutConfirm"))) {
      return;
    }

    try {
      setProcessingCheckoutTab(true);
      await checkoutFormSettingsService.resetSettings();
      await reloadCheckoutFormSettings();

      const nextStorefrontDraft = applyPdpQuickOrderSettingsToStorefrontSettings(
        applyPdpCheckoutVisibilityToStorefrontSettings(storefrontSettings, true),
        DEFAULT_PDP_QUICK_ORDER_SETTINGS,
      );
      const storefrontResponse = await storefrontSettingsService.updateSettings({
        themeId: resolveStorefrontThemeId(nextStorefrontDraft),
        productPageShowCheckoutForm: true,
        designTokens: nextStorefrontDraft.designTokens || {},
      });

      syncStorefrontSettingsState(storefrontResponse.data);
      toast.success(t("storeSettings.checkoutReset"));
    } catch (error) {
      console.error("Error resetting checkout tab settings:", error);
      toast.error(
        getErrorMessage(error, t("storeSettings.checkoutResetFailed")),
      );
    } finally {
      setProcessingCheckoutTab(false);
    }
  };

  const handleToggleWishlist = async (enabled: boolean) => {
    try {
      const updated = {
        ...storefrontSettings,
        wishlistEnabled: enabled,
      };
      setStorefrontSettings(updated);
      await storefrontSettingsService.updateSettings({
        wishlistEnabled: enabled,
      });
      toast.success(enabled ? t("storeSettings.wishlistEnabledSuccess", "تم تفعيل زر المفضلة") : t("storeSettings.wishlistDisabledSuccess", "تم إيقاف زر المفضلة"));
    } catch (error) {
      toast.error(t("storeSettings.saveFailed", "تعذر حفظ التغيير"));
    }
  };

  const handleToggleComparison = async (enabled: boolean) => {
    try {
      const updated = {
        ...storefrontSettings,
        comparisonEnabled: enabled,
      };
      setStorefrontSettings(updated);
      await storefrontSettingsService.updateSettings({
        comparisonEnabled: enabled,
      });
      toast.success(enabled ? t("storeSettings.comparisonEnabledSuccess", "تم تفعيل زر المقارنة") : t("storeSettings.comparisonDisabledSuccess", "تم إيقاف زر المقارنة"));
    } catch (error) {
      toast.error(t("storeSettings.saveFailed", "تعذر حفظ التغيير"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const effectiveCheckoutFormSettings =
    checkoutFormSettings || DEFAULT_CHECKOUT_FORM_SETTINGS;
  const productPageCheckoutEnabled =
    resolvePdpCheckoutEnabled(storefrontSettings);
  const pdpQuickOrderSettings = getPdpQuickOrderSettingsFromDesignTokens(
    storefrontSettings.designTokens,
  );
  const storefrontDesignTokens =
    storefrontSettings.designTokens && typeof storefrontSettings.designTokens === "object"
      ? storefrontSettings.designTokens
      : {};
  const storefrontSocialLinks =
    storefrontDesignTokens.socialLinks &&
    typeof storefrontDesignTokens.socialLinks === "object" &&
    !Array.isArray(storefrontDesignTokens.socialLinks)
      ? (storefrontDesignTokens.socialLinks as Record<string, string>)
      : {};
  const handleChangeStorefrontSocialLinks = (
    socialLinks: Record<string, string>,
  ) => {
    setStorefrontSettings((current) => ({
      ...current,
      designTokens: {
        ...(current.designTokens || {}),
        socialLinks,
      },
    }));
  };
  const checkoutTabBusy =
    checkoutFormSettingsLoading ||
    checkoutFormSettingsSaving ||
    processingCheckoutTab;
  const tabs = [
    { id: "branches", label: t("storeSettings.tabBranches"), icon: BuildingStorefrontIcon },
    { id: "shipping", label: t("storeSettings.tabShipping"), icon: TruckIcon },
    { id: "footer", label: t("storeSettings.tabFooter"), icon: DocumentTextIcon },
    { id: "promotion", label: t("storeSettings.tabPromotion"), icon: GiftIcon },
  ];

  const tabsWithCheckout = [
    ...tabs.slice(0, 2),
    { id: "checkout", label: t("storeSettings.tabCheckout"), icon: CreditCardIcon },
    { id: "payment", label: t("storeSettings.tabPayment"), icon: CreditCardIcon },
    ...tabs.slice(2),
  ];

  return (
    <div className="space-y-6" dir={getDirection()}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {pageTitle}
          </h2>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            {pageDescription}
          </p>
        </div>
      </div>

      <div className={hideNavigation ? "block" : "space-y-6"}>
        {!hideNavigation ? (
          <div className="border-b border-gray-200 dark:border-gray-700/60 pb-1">
            <nav className="flex space-x-2 rtl:space-x-reverse overflow-x-auto no-scrollbar py-1">
              {tabsWithCheckout.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id as StoreSettingsTab)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap shrink-0
                      ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none"
                          : "bg-gray-100/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                  >
                    <tab.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-500 dark:text-gray-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : null}

        <main className="w-full">
          <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 lg:p-8 shadow-xl shadow-gray-200/20 dark:shadow-none min-h-[600px]">
            {activeTab === "branches" ? (
              <BranchesSection
                branches={branches}
                onAdd={handleAddBranch}
                onEdit={handleEditBranch}
                onDelete={handleDeleteBranch}
              />
            ) : activeTab === "shipping" ? (
              <div className="space-y-6">
                <ShippingSectionV2
                  zones={shippingZones}
                  canonicalGovernorates={canonicalGovernorates}
                  onAdd={handleAddShipping}
                  onEdit={handleEditShipping}
                  onDelete={handleDeleteShipping}
                  shippingClasses={shippingClasses}
                  promotionSettings={promotionSettings}
                  onUpdatePromotionSettings={handleUpdatePromotionSettings}
                />

                <CheckoutAddressSettingsSection
                  settings={storefrontSettings}
                  onChange={(patch) =>
                    setStorefrontSettings((prev) => ({ ...prev, ...patch }))
                  }
                />

                <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("storeSettings.shippingClassFeesTitle")}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t("storeSettings.shippingClassFeesDesc")}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("storeSettings.calculationMethod")}
                      </label>
                      <select
                        value={shippingClassMode}
                        onChange={(e) =>
                          setShippingClassMode(
                            e.target.value === "per_item" ? "per_item" : "max",
                          )
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="max">{t("storeSettings.maxValue")}</option>
                        <option value="per_item">{t("storeSettings.perItem")}</option>
                      </select>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-end">
                      {t("storeSettings.maxValueDesc")}
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t("storeSettings.className")}
                        </label>
                        <input
                          type="text"
                          value={newShippingClassLabel}
                          onChange={(e) => setNewShippingClassLabel(e.target.value)}
                          placeholder={t("storeSettings.classNamePlaceholder")}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t("storeSettings.classIdentifier")}
                        </label>
                        <input
                          type="text"
                          value={newShippingClassKey}
                          onChange={(e) => setNewShippingClassKey(e.target.value)}
                          placeholder={t("storeSettings.classIdentifierPlaceholder")}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddShippingClass}
                        className="px-4 py-2 h-11 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        {t("storeSettings.addClass")}
                      </button>
                    </div>

                    <div className="space-y-3">
                      {shippingClasses.map((option) => {
                        const isDefaultClass = DEFAULT_SHIPPING_CLASSES.some(
                          (defaultOption) =>
                            normalizeShippingClassKey(defaultOption.key) ===
                            normalizeShippingClassKey(option.key),
                        );
                        return (
                          <div
                            key={option.key}
                            className="flex flex-col md:flex-row md:items-end gap-3 p-3 bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl"
                          >
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t("storeSettings.name")}
                              </label>
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) =>
                                  handleUpdateShippingClassLabel(
                                    option.key,
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t("storeSettings.identifier")}: {option.key}
                              </p>
                            </div>
                            <div className="w-full md:w-40">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t("storeSettings.fees")}
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={shippingClassFees[option.key] ?? 0}
                                onChange={(e) =>
                                  setShippingClassFees((prev) => ({
                                    ...prev,
                                    [option.key]: Number(e.target.value) || 0,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveShippingClass(option.key)}
                                disabled={isDefaultClass}
                                className={`px-3 py-2 rounded-md text-sm font-semibold ${isDefaultClass
                                  ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                                  : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300"
                                  }`}
                              >
                                 {t("storeSettings.delete")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSaveShippingClassFees}
                      disabled={savingShippingClassFees}
                      className={`px-4 py-2 rounded-md text-sm font-semibold ${savingShippingClassFees
                        ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                    >
                      {savingShippingClassFees ? t("storeSettings.saving") : t("storeSettings.saveFees")}
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === "checkout" ? (
              <div className="space-y-6">
                <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("storeSettings.checkoutFieldsTitle")}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t("storeSettings.checkoutFieldsDesc")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => navigate("/settings/store/tools")}
                        className="px-4 py-2 rounded-md text-sm font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        {t("storeSettings.openConversionTools")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleResetCheckoutTabSettings();
                        }}
                        disabled={checkoutTabBusy}
                        className={`px-4 py-2 rounded-md text-sm font-semibold ${
                          checkoutTabBusy
                            ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                        }`}
                      >
                        {t("storeSettings.resetToDefault")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* أزرار تفاعل صفحة المنتج: المفضلة والمقارنة */}
                <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">
                        {t("storeSettings.productPageActionsTitle", "أزرار التفاعل على صور المنتج")}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("storeSettings.productPageActionsDesc", "التحكم في ظهور زري المفضلة والمقارنة العائمين فوق صور المنتج في المتجر.")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/settings/store/product-conversion")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      {t("storeSettings.viewInConversionTools", "عرض في أدوات التحويل ↗")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-base shadow-sm">
                          ❤️
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {t("storeSettings.wishlistToggle", "زر قائمة المفضلة")}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {t("storeSettings.wishlistToggleDesc", "إظهار أيقونة القلب لحفظ المنتج")}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={storefrontSettings?.wishlistEnabled !== false}
                        onChange={(e) => handleToggleWishlist(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shadow-sm">
                          ⇄
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {t("storeSettings.comparisonToggle", "زر مقارنة المنتجات")}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {t("storeSettings.comparisonToggleDesc", "إظهار زر المقارنة بين المواصفات")}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={storefrontSettings?.comparisonEnabled !== false}
                        onChange={(e) => handleToggleComparison(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {checkoutFormSettingsLoading && !checkoutFormSettings ? (
                  <div className="flex items-center justify-center min-h-[240px] rounded-2xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <CheckoutFormSection
                    settings={effectiveCheckoutFormSettings}
                    onChange={applyCheckoutFormSettings}
                    productPageCheckoutEnabled={productPageCheckoutEnabled}
                    onProductPageCheckoutToggle={handleToggleProductPageCheckout}
                    pdpQuickOrderSettings={pdpQuickOrderSettings}
                    onPdpQuickOrderSettingsChange={
                      handleChangePdpQuickOrderSettings
                    }
                    onSave={() => {
                      void handleSaveCheckoutTabSettings();
                    }}
                    onReset={() => {
                      void handleResetCheckoutTabSettings();
                    }}
                    loading={checkoutTabBusy}
                  />
                )}
              </div>
            ) : activeTab === "footer" ? (
              <FooterSettingsSection
                settings={footerSettings}
                onChange={setFooterSettings}
                socialLinks={storefrontSocialLinks}
                onSocialLinksChange={handleChangeStorefrontSocialLinks}
                onSave={handleSaveFooter}
                onReset={handleResetFooter}
                loading={loading}
              />
            ) : activeTab === "promotion" ? (
              <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                <PromotionSettings />
              </div>
            ) : activeTab === "payment" ? (
              <PaymentSettingsPanel
                settings={storefrontSettings}
                onChange={setStorefrontSettings}
                loading={loading}
              />
            ) : null}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showBranchModal && (
        <BranchModal
          onClose={() => setShowBranchModal(false)}
          onSave={handleSaveBranch}
          branch={branchForm}
          onChange={setBranchForm}
          isEditing={!!editingBranch}
        />
      )}



      {showShippingModal && (
        <ShippingModalV2
          key={editingShipping?.id || 'new-shipping-zone'}
          onClose={() => setShowShippingModal(false)}
          onSave={handleSaveShipping}
          zone={shippingForm}
          onChange={(nextZone) =>
            setShippingForm((prev) => ({
              ...prev,
              ...nextZone,
            }))
          }
          canonicalGovernorates={canonicalGovernorates}
          isEditing={!!editingShipping}
        />
      )}
    </div>
  );
};

const PAYMENT_CARD_CLS =
  "bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5 shadow-sm";
const PAYMENT_LABEL_CLS =
  "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5";
const PAYMENT_INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-gray-900 placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30";
const PAYMENT_PRIMARY_BTN_CLS =
  "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-600/20";

const WalletPaymentSettingsSection: React.FC<{
  settings: StorefrontSettings;
  onChange: (settings: Partial<StorefrontSettings>) => void;
  loading: boolean;
}> = ({ settings, onChange, loading }) => {
  const parseWalletSettings = (): {
    enabled: boolean;
    walletNumber: string;
    recipientName: string;
    instructions: string;
    discountEnabled: boolean;
    discountPercent: number;
    showDiscountBadge: boolean;
  } => {
    const raw = settings.walletPaymentSettings as
      | string
      | Record<string, unknown>
      | null
      | undefined;
    if (!raw) {
      return {
        enabled: false,
        walletNumber: "",
        recipientName: "",
        instructions: "",
        discountEnabled: false,
        discountPercent: 0,
        showDiscountBadge: true,
      };
    }
    const parsed =
      typeof raw === "string"
        ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return {};
            }
          })()
        : raw;
    return {
      enabled: parsed?.enabled === true,
      walletNumber: String(parsed?.walletNumber || ""),
      recipientName: String(parsed?.recipientName || ""),
      instructions: String(parsed?.instructions || ""),
      discountEnabled: parsed?.discountEnabled === true,
      discountPercent: Number(parsed?.discountPercent || 0),
      showDiscountBadge: parsed?.showDiscountBadge !== false,
    };
  };

  const parseEnabledMethods = (raw: unknown): string[] => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.map(String) : ["cod"];
    } catch {
      return ["cod"];
    }
  };

  const computeIsWalletActive = (
    walletRaw: unknown,
    methodsRaw: unknown
  ): boolean => {
    const parsedWallet =
      typeof walletRaw === "string"
        ? (() => {
            try {
              return JSON.parse(walletRaw);
            } catch {
              return {};
            }
          })()
        : (walletRaw as Record<string, unknown> | null | undefined);

    const methods = parseEnabledMethods(methodsRaw);

    // If explicitly disabled in walletPaymentSettings, it's inactive
    if (parsedWallet?.enabled === false) {
      return false;
    }
    // If explicitly enabled in walletPaymentSettings
    if (parsedWallet?.enabled === true) {
      return true;
    }
    // Otherwise check enabledMethods
    return methods.includes("wallet");
  };

  const [form, setForm] = useState(parseWalletSettings);
  const [saving, setSaving] = useState(false);
  const [isWalletActive, setIsWalletActive] = useState<boolean>(() =>
    computeIsWalletActive(settings.walletPaymentSettings, settings.enabledPaymentMethods)
  );

  const [enabledMethods, setEnabledMethods] = useState<string[]>(
    parseEnabledMethods(settings.enabledPaymentMethods)
  );

  useEffect(() => {
    setForm(parseWalletSettings());
    const active = computeIsWalletActive(settings.walletPaymentSettings, settings.enabledPaymentMethods);
    setIsWalletActive(active);
    const methods = parseEnabledMethods(settings.enabledPaymentMethods);
    setEnabledMethods(
      active
        ? Array.from(new Set([...methods, "wallet"]))
        : methods.filter((m) => m !== "wallet")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.walletPaymentSettings, settings.enabledPaymentMethods]);

  const update = (key: keyof typeof form, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleWallet = async () => {
    const nextActive = !isWalletActive;
    setIsWalletActive(nextActive);
    setForm((prev) => ({ ...prev, enabled: nextActive }));

    const nextMethods = nextActive
      ? Array.from(new Set([...enabledMethods, "wallet"]))
      : enabledMethods.filter((m) => m !== "wallet");
    setEnabledMethods(nextMethods);

    setSaving(true);
    try {
      const result = await storefrontSettingsService.updateSettings({
        walletPaymentSettings: { ...form, enabled: nextActive },
        enabledPaymentMethods: JSON.stringify(nextMethods),
      });
      if (result?.data) {
        onChange(result.data);
      }
      toast.success(
        nextActive
          ? "تم تفعيل طريقة الدفع بالمحفظة"
          : "تم إيقاف طريقة الدفع بالمحفظة"
      );
    } catch (error: any) {
      // Revert on error
      setIsWalletActive(!nextActive);
      setForm((prev) => ({ ...prev, enabled: !nextActive }));
      console.error("[WALLET-SETTINGS] Failed to toggle:", error);
      toast.error("حدث خطأ أثناء تعديل حالة التفعيل: " + (error?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextMethods = isWalletActive
        ? Array.from(new Set([...enabledMethods, "wallet"]))
        : enabledMethods.filter((m) => m !== "wallet");

      const result = await storefrontSettingsService.updateSettings({
        walletPaymentSettings: { ...form, enabled: isWalletActive },
        enabledPaymentMethods: JSON.stringify(nextMethods),
      });
      if (result?.data) {
        onChange(result.data);
      }
      toast.success("تم حفظ إعدادات الدفع بالمحفظة بنجاح");
    } catch (error: any) {
      console.error("[WALLET-SETTINGS] Failed to save:", error);
      toast.error("حدث خطأ أثناء الحفظ: " + (error?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={PAYMENT_CARD_CLS}>
      <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-800/50 dark:bg-indigo-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            تفعيل طريقة الدفع بالمحفظة
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            اظهر خيار «محفظة إلكترونية» للعملاء أثناء إتمام الطلب.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleWallet}
          disabled={saving || loading}
          aria-pressed={isWalletActive}
          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all select-none ${
            isWalletActive
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-600/10"
              : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-gray-700/40"
          }`}
        >
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isWalletActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isWalletActive ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
          <span>محفظة إلكترونية</span>
          <span
            className={`text-xs font-bold ${
              isWalletActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-400"
            }`}
          >
            {isWalletActive ? "مفعّل" : "غير مفعّل"}
          </span>
        </button>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          الدفع بالمحفظة (تحويل + رفع إيصال)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
          يظهر للعميل في صفحة الشيك أوت خيار تحويل المبلغ على رقم محفظة ثم رفع صورة الإيصال. فعّل خيار «محفظة إلكترونية» من الزرار بالأعلى، واكتب رقم المحفظة واسم المستلم.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={PAYMENT_LABEL_CLS}>
            رقم المحفظة (مثال: فودافون كاش)
          </label>
          <input
            type="text"
            value={form.walletNumber}
            onChange={(e) => update("walletNumber", e.target.value)}
            className={PAYMENT_INPUT_CLS}
            dir="ltr"
            placeholder="01xxxxxxxxx"
          />
        </div>
        <div>
          <label className={PAYMENT_LABEL_CLS}>
            اسم المستلم
          </label>
          <input
            type="text"
            value={form.recipientName}
            onChange={(e) => update("recipientName", e.target.value)}
            className={PAYMENT_INPUT_CLS}
            placeholder="مثال: سوان ستور"
          />
        </div>
      </div>

      <div>
        <label className={PAYMENT_LABEL_CLS}>
          تعليمات إضافية للعميل (اختياري)
        </label>
        <textarea
          value={form.instructions}
          onChange={(e) => update("instructions", e.target.value)}
          className={`${PAYMENT_INPUT_CLS} resize-none`}
          rows={3}
          placeholder="مثال: برجاء كتابة اسمك في خانة البيان عند التحويل"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={PAYMENT_PRIMARY_BTN_CLS}
        >
          {saving ? "جارٍ الحفظ..." : "حفظ إعدادات المحفظة"}
        </button>
      </div>
    </div>
  );
};

const PaymentGatewaySettingsSection: React.FC<{
  settings: StorefrontSettings;
  onChange: (settings: Partial<StorefrontSettings>) => void;
  loading: boolean;
}> = ({ settings, onChange, loading }) => {
  const [gatewayConfig, setGatewayConfig] = useState<{
    merchantId: string;
    apiKey: string;
    secretKey: string;
    mode: "test" | "live";
  }>({
    merchantId: "",
    apiKey: "",
    secretKey: "",
    mode: "test",
  });

  const [isEditing, setIsEditing] = useState(false);

  const parseEnabledMethods = (raw: unknown): string[] => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.map(String) : ["cod"];
    } catch {
      return ["cod"];
    }
  };

  const [enabledMethods, setEnabledMethods] = useState<string[]>(
    parseEnabledMethods(settings.enabledPaymentMethods)
  );

  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "testing">("disconnected");
  const [testMessage, setTestMessage] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const isConfigured = gatewayConfig.merchantId && gatewayConfig.apiKey && gatewayConfig.secretKey;

  useEffect(() => {
    console.log('[LOAD] Settings received:', {
      hasPaymentConfig: !!settings.paymentGatewayConfig,
      configType: typeof settings.paymentGatewayConfig,
      configValue: settings.paymentGatewayConfig ? (typeof settings.paymentGatewayConfig === 'string' ? 'STRING' : 'OBJECT') : 'NONE',
      enabledMethods: settings.enabledPaymentMethods,
    });
    let hasConfig = false;
    if (settings.paymentGatewayConfig) {
      const config = typeof settings.paymentGatewayConfig === "string"
        ? JSON.parse(settings.paymentGatewayConfig)
        : settings.paymentGatewayConfig;
      setGatewayConfig({
        merchantId: config.merchantId || "",
        apiKey: config.apiKey || "",
        secretKey: config.secretKey || "",
        mode: config.mode || "test",
      });
      hasConfig = Boolean(config.merchantId && config.apiKey && config.secretKey);
    }
    if (settings.enabledPaymentMethods) {
      setEnabledMethods(parseEnabledMethods(settings.enabledPaymentMethods));
    }
    // Check connection status on load using the parsed settings
    const config = settings.paymentGatewayConfig
      ? (typeof settings.paymentGatewayConfig === "string"
        ? JSON.parse(settings.paymentGatewayConfig)
        : settings.paymentGatewayConfig)
      : null;
    const hasConfigLoaded = config && config.merchantId && config.apiKey && config.secretKey;
    setConnectionStatus(
      hasConfigLoaded ? "connected" : "disconnected"
    );
    // Default to read-only if configured, otherwise show edit inputs
    setIsEditing(!hasConfigLoaded);
  }, [settings]);

  const handleConfigChange = (key: string, value: string) => {
    setGatewayConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleMethodToggle = (method: string) => {
    setEnabledMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const handleDelete = async () => {
    if (!window.confirm("هل أنت متأكد من رغبتك في إزالة إعدادات بوابة الدفع؟ سيؤدي ذلك إلى تعطيل الدفع الإلكتروني.")) {
      return;
    }

    const remainingMethods = enabledMethods.filter((m) => m !== "card");
    const updatedSettings = {
      paymentGatewayConfig: null,
      enabledPaymentMethods: JSON.stringify(remainingMethods),
    };

    try {
      const result = await storefrontSettingsService.updateSettings(updatedSettings);
      if (result?.data) {
        onChange(result.data);
        setGatewayConfig({
          merchantId: "",
          apiKey: "",
          secretKey: "",
          mode: "test",
        });
        setEnabledMethods(remainingMethods);
        setIsEditing(true);
      }
      tToast.success("StoreSettings.msg_126b");
    } catch (error) {
      console.error("[DELETE] Failed to delete settings:", error);
      toast.error("حدث خطأ أثناء الحذف: " + (error?.message || "Unknown error"));
    }
  };

  const handleSave = async () => {
    const updatedSettings = {
      paymentGatewayConfig: {
        merchantId: gatewayConfig.merchantId,
        apiKey: gatewayConfig.apiKey,
        secretKey: gatewayConfig.secretKey,
        mode: gatewayConfig.mode,
      },
      enabledPaymentMethods: JSON.stringify(enabledMethods),
    };

    console.log('[SAVE] Sending settings:', { ...updatedSettings, paymentGatewayConfig: '***MASKED***' });

    try {
      const result = await storefrontSettingsService.updateSettings(updatedSettings);
      console.log('[SAVE] Result:', result);
      // Update parent state with server response, but preserve the local
      // gatewayConfig values (the server returns masked keys which would
      // overwrite our real values via the useEffect).
      if (result?.data) {
        onChange({
          ...result.data,
          // Keep the un-masked config we just sent so the useEffect
          // doesn't replace our local state with masked tokens.
          paymentGatewayConfig: updatedSettings.paymentGatewayConfig,
        });
        setIsEditing(false);
      }
      tToast.success("StoreSettings.success_save_ccce");
    } catch (error) {
      console.error("[SAVE] Failed to save payment gateway settings:", error);
      toast.error("حدث خطأ أثناء الحفظ: " + (error?.message || error?.response?.data?.message || "Unknown error"));
    }
  };

  const testConnection = async () => {
    if (!isConfigured) {
      setTestMessage("أكمل البيانات أولاً");
      return;
    }

    setConnectionStatus("testing");
    setTestMessage("جاري الاختبار...");

    try {
      console.log('[TEST] Sending config:', { ...gatewayConfig, secretKey: '***' });
      const response = await fetch("/api/v1/payment/kashier/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(gatewayConfig),
      });

      console.log('[TEST] Response status:', response.status);
      const responseText = await response.text();
      console.log('[TEST] Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: 'Invalid JSON response' };
      }

      if (response.ok && data.success) {
        setConnectionStatus("connected");
        setTestMessage("✅ تم الاتصال بنجاح!");
      } else {
        setConnectionStatus("disconnected");
        setTestMessage(`❌ ${data.error || data.message || responseText || "فشل الاتصال"}`);
      }
    } catch (error) {
      console.error('[TEST] Error:', error);
      setConnectionStatus("disconnected");
      setTestMessage(`❌ خطأ: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              إعدادات بوابة الدفع - Kashier
            </h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              connectionStatus === "connected"
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                : connectionStatus === "testing"
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            }`}>
              {connectionStatus === "connected" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  متصل
                </>
              )}
              {connectionStatus === "testing" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  جاري الاختبار...
                </>
              )}
              {connectionStatus === "disconnected" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  غير متصل
                </>
              )}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            أدخل مفاتيح Kashier لتفعيل الدفع بالبطاقات في متجرك.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {isConfigured && connectionStatus !== "testing" && (
            <button
              onClick={testConnection}
              disabled={connectionStatus === "testing" || loading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 shadow-sm dark:bg-gray-800 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {connectionStatus === "testing" ? "جاري الاختبار..." : "اختبار الاتصال"}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-800/50 dark:bg-indigo-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            تفعيل الدفع عند الاستلام (الكاشير)
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            اظهر خيار «الدفع عند الاستلام» للعملاء أثناء إتمام الطلب.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleMethodToggle("cod")}
          aria-pressed={enabledMethods.includes("cod")}
          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all select-none ${
            enabledMethods.includes("cod")
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-600/10"
              : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-gray-700/40"
          }`}
        >
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enabledMethods.includes("cod") ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabledMethods.includes("cod") ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
          <span>الكاشير (الدفع عند الاستلام)</span>
          <span
            className={`text-xs font-bold ${
              enabledMethods.includes("cod")
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-400"
            }`}
          >
            {enabledMethods.includes("cod") ? "مفعّل" : "غير مفعّل"}
          </span>
        </button>
      </div>
      {testMessage && (
        <p className={`text-sm ${connectionStatus === "connected" ? "text-green-600 dark:text-green-400" : connectionStatus === "disconnected" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
          {testMessage}
        </p>
      )}

      {isEditing ? (
        <div className={PAYMENT_CARD_CLS}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                بيانات الاعتماد (Credentials)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                أدخل مفاتيح التاجر من لوحة تحكم Kashier.
              </p>
            </div>
            {isConfigured && (
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
              >
                إلغاء التعديل
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={PAYMENT_LABEL_CLS}>
                Merchant ID
              </label>
              <input
                type="text"
                value={gatewayConfig.merchantId}
                onChange={(e) => handleConfigChange("merchantId", e.target.value)}
                className={PAYMENT_INPUT_CLS}
                placeholder="MID-XXXX-XXX"
              />
            </div>
            <div>
              <label className={PAYMENT_LABEL_CLS}>
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={gatewayConfig.apiKey}
                  onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                  className={`${PAYMENT_INPUT_CLS} pl-10`}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  dir="ltr"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="absolute inset-y-0 left-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label={showApiKey ? "إخفاء المفتاح" : "إظهار المفتاح"}
                >
                  {showApiKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={PAYMENT_LABEL_CLS}>
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecretKey ? "text" : "password"}
                  value={gatewayConfig.secretKey}
                  onChange={(e) => handleConfigChange("secretKey", e.target.value)}
                  className={`${PAYMENT_INPUT_CLS} pl-10`}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  dir="ltr"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowSecretKey((prev) => !prev)}
                  className="absolute inset-y-0 left-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label={showSecretKey ? "إخفاء المفتاح" : "إظهار المفتاح"}
                >
                  {showSecretKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={PAYMENT_LABEL_CLS}>
                الوضع
              </label>
              <select
                value={gatewayConfig.mode}
                onChange={(e) => handleConfigChange("mode", e.target.value)}
                className={PAYMENT_INPUT_CLS}
              >
                <option value="test">Test (Sandbox)</option>
                <option value="live">Live</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className={PAYMENT_CARD_CLS}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                بيانات الاعتماد (Credentials)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                تفاصيل الاتصال النشط ببوابة دفع Kashier.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-900 transition-colors"
              >
                <PencilIcon className="w-3.5 h-3.5" />
                تعديل البيانات
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/30 transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                إزالة الإعدادات
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block">Merchant ID</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800/80 inline-block">
                {gatewayConfig.merchantId}
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block">الوضع (Mode)</span>
              <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg inline-block uppercase ${
                gatewayConfig.mode === "live"
                  ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50"
                  : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
              }`}>
                {gatewayConfig.mode === "live" ? "Live" : "Test (Sandbox)"}
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block">API Key</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800/80 inline-block">
                {gatewayConfig.apiKey}
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block">Secret Key</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800/80 inline-block">
                {gatewayConfig.secretKey}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={PAYMENT_CARD_CLS}>
        <div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
            طرق الدفع المفعّلة
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            حدد الطرق التي ستظهر للعملاء أثناء إتمام الطلب.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {["card"].map((method) => {
            const isOn = enabledMethods.includes(method);
            const methodLabel = "بطاقة ائتمان / خصم";
            return (
              <button
                key={method}
                type="button"
                onClick={() => handleMethodToggle(method)}
                aria-pressed={isOn}
                className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all select-none ${
                  isOn
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-600/10"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-gray-700/40"
                }`}
              >
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    isOn ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isOn ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
                <span>{methodLabel}</span>
                <span
                  className={`text-xs font-bold ${
                    isOn
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400"
                  }`}
                >
                  {isOn ? "مفعّل" : "غير مفعّل"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          اختر طرق الدفع التي تريد إظهارها للعملاء.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        {isEditing && isConfigured && (
          <button
            onClick={() => setIsEditing(false)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            إلغاء
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className={PAYMENT_PRIMARY_BTN_CLS}
        >
          {loading ? "جاري الحفظ..." : "حفظ إعدادات البوابة"}
        </button>
      </div>
    </div>
  );
};

const PAYMENT_SUB_TABS = [
  { id: "gateway", label: "بطاقات الدفع", icon: CreditCardIcon },
  { id: "wallet", label: "الدفع بالمحفظة", icon: WalletIcon },
] as const;

type PaymentSubTabId = (typeof PAYMENT_SUB_TABS)[number]["id"];

const PaymentSettingsPanel: React.FC<{
  settings: StorefrontSettings;
  onChange: (settings: Partial<StorefrontSettings>) => void;
  loading: boolean;
}> = ({ settings, onChange, loading }) => {
  const [activeSubTab, setActiveSubTab] = useState<PaymentSubTabId>("gateway");

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-1 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
        {PAYMENT_SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={activeSubTab === "gateway" ? "block" : "hidden"}>
        <PaymentGatewaySettingsSection
          settings={settings}
          onChange={onChange}
          loading={loading}
        />
      </div>
      <div className={activeSubTab === "wallet" ? "block" : "hidden"}>
        <WalletPaymentSettingsSection
          settings={settings}
          onChange={onChange}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default StoreSettings;
