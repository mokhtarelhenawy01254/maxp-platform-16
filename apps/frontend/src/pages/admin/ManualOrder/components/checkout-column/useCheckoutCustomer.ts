import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../../../services/apiClient";
import {
  lookupCustomerByPhone,
  EligiblePreviousOrder,
  ExchangeReturnPolicy,
} from "../../../../../hooks/useCustomerByPhone";
import {
  customerBlocklistService,
  CustomerBlockEvaluation,
} from "../../../../../services/customerBlocklistService";
import {
  GovernmentOption,
  AreaOption,
  TurboLocationApiItem,
  normalizeLocationLabel,
} from "./types";

interface UseCheckoutCustomerOptions {
  userRole?: string;
  paymentMethod: string;
  onSetEligiblePreviousOrders: (orders: EligiblePreviousOrder[]) => void;
  onSetExchangeReturnPolicy: (policy: ExchangeReturnPolicy) => void;
  onSelectPreviousOrder: (orderId: string) => void;
  searchParamExchangeOrder?: string | null;
  searchParamReturnOrder?: string | null;
  searchParamPhone?: string | null;
  initialWholesaleCustomer?: {
    id: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    address?: string;
    governorate?: string;
    area?: string;
    creditLimit?: number;
    currentBalance?: number;
  } | null;
}

export function useCheckoutCustomer({
  userRole,
  paymentMethod,
  onSetEligiblePreviousOrders,
  onSetExchangeReturnPolicy,
  onSelectPreviousOrder,
  searchParamExchangeOrder,
  searchParamReturnOrder,
  searchParamPhone,
  initialWholesaleCustomer,
}: UseCheckoutCustomerOptions) {
  const { t } = useTranslation();
  const canOverrideBlockedCustomer = [
    "OWNER",
    "COMPANY_ADMIN",
    "SUPER_ADMIN",
    "MANAGER",
    "ADMIN",
  ].includes(userRole || "");

  const canUseTurboLocationLookups = Boolean(userRole && userRole !== "AFFILIATE");

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");

  const [searching, setSearching] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const [customerBlock, setCustomerBlock] = useState<CustomerBlockEvaluation | null>(null);
  const [allowBlockedCustomerOverride, setAllowBlockedCustomerOverride] = useState(false);

  // Wholesale State
  const [wholesaleCustomer, setWholesaleCustomer] = useState<{
    id: string;
    customerId?: string;
    creditLimit: number;
    currentBalance: number;
  } | null>(null);
  const [allowWholesaleOverdraft, setAllowWholesaleOverdraft] = useState(false);

  const [governments, setGovernments] = useState<GovernmentOption[]>([]);
  const [availableAreas, setAvailableAreas] = useState<AreaOption[]>([]);
  const [loadingGovernments, setLoadingGovernments] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Initialize wholesale customer data once when prop arrives
  const initializedWholesaleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialWholesaleCustomer?.id && initializedWholesaleIdRef.current !== initialWholesaleCustomer.id) {
      initializedWholesaleIdRef.current = initialWholesaleCustomer.id;

      if (initialWholesaleCustomer.customerPhone && !phone) {
        setPhone(initialWholesaleCustomer.customerPhone);
      }
      if (initialWholesaleCustomer.customerName && !firstName && !lastName) {
        const parts = initialWholesaleCustomer.customerName.trim().split(/\s+/);
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      if (initialWholesaleCustomer.address && !address) {
        setAddress(initialWholesaleCustomer.address);
      }
      if (initialWholesaleCustomer.governorate && !governorate) {
        setGovernorate(normalizeLocationLabel(initialWholesaleCustomer.governorate));
      }
      if (initialWholesaleCustomer.area && !area) {
        setArea(normalizeLocationLabel(initialWholesaleCustomer.area));
      }

      setWholesaleCustomer({
        id: initialWholesaleCustomer.id,
        customerId: initialWholesaleCustomer.customerId,
        creditLimit: Number(initialWholesaleCustomer.creditLimit || 0),
        currentBalance: Number(initialWholesaleCustomer.currentBalance || 0),
      });
    }
  }, [initialWholesaleCustomer?.id]);

  // Initialize phone from URL search param if present
  useEffect(() => {
    if (searchParamPhone && !phone) {
      setPhone(searchParamPhone);
    }
  }, [searchParamPhone]);

  // Load Turbo Governments
  useEffect(() => {
    if (!canUseTurboLocationLookups) {
      setGovernments([]);
      setLoadingGovernments(false);
      return;
    }

    const fetchGovernments = async () => {
      try {
        setLoadingGovernments(true);
        const response = await apiClient.get("/turbo/governments");
        const turboGovernments = response.data?.data?.governments;

        if (
          response.data?.success &&
          Array.isArray(turboGovernments) &&
          turboGovernments.length > 0
        ) {
          setGovernments(
            turboGovernments
              .map((gov: TurboLocationApiItem) => ({
                id: Number(gov.id),
                name: normalizeLocationLabel(gov.name),
              }))
              .filter(
                (gov: GovernmentOption) =>
                  Number.isFinite(gov.id) && Boolean(gov.name),
              ),
          );
        }
      } catch (error) {
        console.debug(
          "[manual-order] Turbo governments unavailable, using fallback list",
          error,
        );
      } finally {
        setLoadingGovernments(false);
      }
    };

    fetchGovernments();
  }, [canUseTurboLocationLookups]);

  // Debounced Phone Search — auto-fill customer data from previous orders
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setSearching(false);
      onSetEligiblePreviousOrders([]);
      return;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        const customer = await lookupCustomerByPhone(phone);

        if (isCancelled || !customer) return;

        if (customer.firstName || customer.lastName || customer.address) {
          setFirstName(customer.firstName || "");
          setLastName(customer.lastName || "");
          setAddress(customer.address || "");
          setGovernorate(normalizeLocationLabel(customer.governorate || ""));
          setArea(normalizeLocationLabel(customer.area || ""));
          if (customer.notes) setNotes(customer.notes);
          if (customer.isWholesale || customer.wholesaleCustomer) {
            setWholesaleCustomer(customer.wholesaleCustomer || {
              id: customer.wholesaleCustomerId || "",
              creditLimit: 0,
              currentBalance: 0,
            });
          } else if (!initialWholesaleCustomer?.id) {
            setWholesaleCustomer(null);
          }
          toast.success(t("manualOrder.k_52"));
        } else if (!initialWholesaleCustomer?.id) {
          setWholesaleCustomer(null);
        }

        if (customer.eligiblePreviousOrders) {
          onSetEligiblePreviousOrders(customer.eligiblePreviousOrders);
          const targetNum = searchParamExchangeOrder || searchParamReturnOrder;
          if (targetNum) {
            const matched = customer.eligiblePreviousOrders.find(
              (o) => o.orderNumber === targetNum || o.id === targetNum,
            );
            if (matched) onSelectPreviousOrder(matched.id);
          } else if (customer.eligiblePreviousOrders.length === 1) {
            onSelectPreviousOrder(customer.eligiblePreviousOrders[0].id);
          }
        }
        if (customer.exchangeReturnPolicy) {
          onSetExchangeReturnPolicy(customer.exchangeReturnPolicy);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        if (!isCancelled) setSearching(false);
      }
    }, 800);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [phone, t]);

  // Block Evaluation Check
  useEffect(() => {
    if (phone.replace(/\D/g, "").length < 10) {
      setCustomerBlock(null);
      setAllowBlockedCustomerOverride(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setCheckingBlock(true);
        const result = await customerBlocklistService.check({
          phone,
          source: "manual",
          paymentMethod,
        });

        if (!isCancelled) {
          setCustomerBlock(result?.rule || result?.blocked ? result : null);
          if (!result?.blocked) {
            setAllowBlockedCustomerOverride(false);
          }
        }
      } catch {
        if (!isCancelled) {
          setCustomerBlock(null);
          setAllowBlockedCustomerOverride(false);
        }
      } finally {
        if (!isCancelled) {
          setCheckingBlock(false);
        }
      }
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [phone, paymentMethod]);

  // Turbo Areas
  useEffect(() => {
    if (!canUseTurboLocationLookups) {
      setAvailableAreas([]);
      setLoadingAreas(false);
      return;
    }
    const selectedGovernment = governments.find(
      (gov) =>
        normalizeLocationLabel(gov.name) === normalizeLocationLabel(governorate),
    );

    if (!selectedGovernment?.id) {
      setAvailableAreas([]);
      setLoadingAreas(false);
      return;
    }

    const fetchAreas = async () => {
      try {
        setLoadingAreas(true);
        const response = await apiClient.get(
          `/turbo/areas/${selectedGovernment.id}`,
        );
        const turboAreas = response.data?.data?.areas;

        if (response.data?.success && Array.isArray(turboAreas)) {
          const uniqueAreas = Array.from(
            new Map(
              turboAreas
                .map((item: TurboLocationApiItem) => ({
                  id: Number(item.id),
                  name: normalizeLocationLabel(item.name),
                }))
                .filter(
                  (item: AreaOption) =>
                    Number.isFinite(item.id) && Boolean(item.name),
                )
                .map((item: AreaOption) => [item.name, item]),
            ).values(),
          );

          setAvailableAreas(uniqueAreas);
        } else {
          setAvailableAreas([]);
        }
      } catch (error) {
        console.debug(
          "[manual-order] Turbo areas unavailable, falling back to free text",
          error,
        );
        setAvailableAreas([]);
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchAreas();
  }, [canUseTurboLocationLookups, governorate, governments]);

  const resetCustomerForm = () => {
    setPhone("");
    setFirstName("");
    setLastName("");
    setAddress("");
    setGovernorate("");
    setArea("");
    setNotes("");
    setCustomerBlock(null);
    setAllowBlockedCustomerOverride(false);
    setWholesaleCustomer(null);
    setAllowWholesaleOverdraft(false);
  };

  return {
    phone,
    setPhone,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    address,
    setAddress,
    governorate,
    setGovernorate,
    area,
    setArea,
    notes,
    setNotes,
    searching,
    checkingBlock,
    customerBlock,
    setCustomerBlock,
    allowBlockedCustomerOverride,
    setAllowBlockedCustomerOverride,
    canOverrideBlockedCustomer,
    wholesaleCustomer,
    setWholesaleCustomer,
    allowWholesaleOverdraft,
    setAllowWholesaleOverdraft,
    governments,
    availableAreas,
    loadingGovernments,
    loadingAreas,
    canUseTurboLocationLookups,
    resetCustomerForm,
  };
}
