import { useState, useEffect, useMemo, useCallback } from 'react';
import { companyAwareApi } from '../../../services/companyAwareApi';
import { useCurrency } from '../../../hooks/useCurrency';

export interface LowStockItem {
  id?: string;
  name: string;
  stock: number;
  sku?: string;
  category?: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  potentialRevenue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: LowStockItem[];
  outOfStockItems: LowStockItem[];
}

export type InventoryAlertTab = 'all' | 'low' | 'out';

export const useInventoryAnalyticsController = () => {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<InventoryAlertTab>('all');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get('/reports/inventory-detailed');
      if (response?.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalProducts = stats?.totalProducts || 0;
  const totalStock = stats?.totalStock || 0;
  const totalValue = stats?.totalValue || 0;
  const potentialRevenue = stats?.potentialRevenue || 0;
  const potentialProfit = stats?.potentialProfit || 0;
  const lowCount = stats?.lowStockCount || 0;
  const outCount = stats?.outOfStockCount || 0;

  const profitMargin =
    potentialRevenue > 0
      ? Math.round((potentialProfit / potentialRevenue) * 100)
      : 0;

  const lowItems = useMemo(
    () => (Array.isArray(stats?.lowStockItems) ? stats!.lowStockItems : []),
    [stats]
  );
  const outItems = useMemo(
    () => (Array.isArray(stats?.outOfStockItems) ? stats!.outOfStockItems : []),
    [stats]
  );

  const combinedAlertItems = useMemo(() => {
    const list: (LowStockItem & { status: 'low' | 'out' })[] = [
      ...lowItems.map((item) => ({ ...item, status: 'low' as const })),
      ...outItems.map((item) => ({ ...item, status: 'out' as const })),
    ];
    return list.filter((item) => {
      const term = search.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(term) ||
        (item.sku && item.sku.toLowerCase().includes(term));
      if (!matchesSearch) return false;
      if (activeTab === 'low') return item.status === 'low';
      if (activeTab === 'out') return item.status === 'out';
      return true;
    });
  }, [lowItems, outItems, search, activeTab]);

  return {
    stats,
    loading,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    fetchStats,
    totalProducts,
    totalStock,
    totalValue,
    potentialRevenue,
    potentialProfit,
    profitMargin,
    lowCount,
    outCount,
    lowItems,
    outItems,
    combinedAlertItems,
    formatPrice,
  };
};
