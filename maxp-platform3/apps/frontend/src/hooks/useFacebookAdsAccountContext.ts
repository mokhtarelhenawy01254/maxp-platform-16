import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  facebookAdsService,
  FacebookAdAccount,
} from "../services/facebookAdsService";

const STORAGE_KEY = "facebookAds.selectedAdAccountId";

function getAccountSelectionId(account: FacebookAdAccount): string {
  return account.account_id || account.id;
}

function findAccount(
  accounts: FacebookAdAccount[],
  accountId?: string | null,
): FacebookAdAccount | undefined {
  if (!accountId) {
    return undefined;
  }

  const normalized = accountId.startsWith("act_")
    ? accountId.slice(4)
    : accountId;

  return accounts.find((account) => {
    const accountSelectionId = getAccountSelectionId(account);
    return (
      account.id === accountId ||
      accountSelectionId === accountId ||
      accountSelectionId === normalized ||
      `act_${accountSelectionId}` === accountId
    );
  });
}

export function useFacebookAdsAccountContext() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestedAdAccountId = searchParams.get("adAccountId");

  const loadAdAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const accounts = await facebookAdsService.getAdAccounts();
      setAdAccounts(accounts);
    } catch (loadError: any) {
      console.error("Error loading Facebook ad accounts:", loadError);
      setError(
        loadError?.response?.data?.error ||
          "فشل في تحميل الحسابات الإعلانية من Meta",
      );
      setAdAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdAccounts();
  }, []);

  const selectedAdAccountId = useMemo(() => {
    if (loading) {
      return requestedAdAccountId || "";
    }

    const queryAccount = findAccount(adAccounts, requestedAdAccountId);
    if (queryAccount) {
      return getAccountSelectionId(queryAccount);
    }

    const storedAccountId = window.localStorage.getItem(STORAGE_KEY);
    const storedAccount = findAccount(adAccounts, storedAccountId);
    if (storedAccount) {
      return getAccountSelectionId(storedAccount);
    }

    const activeAccount = adAccounts.find((account) => account.isActive);
    if (activeAccount) {
      return getAccountSelectionId(activeAccount);
    }

    return adAccounts.length === 1 ? getAccountSelectionId(adAccounts[0]) : "";
  }, [adAccounts, loading, requestedAdAccountId]);

  const selectedAdAccount = useMemo(
    () => findAccount(adAccounts, selectedAdAccountId) || null,
    [adAccounts, selectedAdAccountId],
  );

  useEffect(() => {
    if (!selectedAdAccountId) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, selectedAdAccountId);

    if (requestedAdAccountId === selectedAdAccountId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("adAccountId", selectedAdAccountId);
    setSearchParams(nextParams, { replace: true });
  }, [
    requestedAdAccountId,
    searchParams,
    selectedAdAccountId,
    setSearchParams,
  ]);

  const setSelectedAdAccountId = (accountId: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (accountId) {
      window.localStorage.setItem(STORAGE_KEY, accountId);
      nextParams.set("adAccountId", accountId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      nextParams.delete("adAccountId");
    }

    setSearchParams(nextParams);
  };

  return {
    adAccounts,
    selectedAdAccount,
    selectedAdAccountId,
    hasMultipleAdAccounts: adAccounts.length > 1,
    requiresAdAccountSelection: !loading && !selectedAdAccountId,
    loading,
    error,
    refreshAdAccounts: loadAdAccounts,
    setSelectedAdAccountId,
  };
}

export type FacebookAdsAccountContext = ReturnType<
  typeof useFacebookAdsAccountContext
>;
