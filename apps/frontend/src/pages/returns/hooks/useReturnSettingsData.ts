import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReturnSettingsDisplay } from './useReturnSettingsDisplay';
import { useReturnSettingsReasons } from './useReturnSettingsReasons';
import { useReturnSettingsTypes } from './useReturnSettingsTypes';

export const useReturnSettingsData = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'display' | 'reasons' | 'types') || 'display';
  const [activeTab, setActiveTabState] = useState<'display' | 'reasons' | 'types'>(
    ['display', 'reasons', 'types'].includes(initialTab) ? initialTab : 'display'
  );

  const setActiveTab = (tab: 'display' | 'reasons' | 'types') => {
    setActiveTabState(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'display' | 'reasons' | 'types' | null;
    if (tabParam && ['display', 'reasons', 'types'].includes(tabParam) && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [searchParams]);

  const display = useReturnSettingsDisplay();
  const reasons = useReturnSettingsReasons();
  const types = useReturnSettingsTypes(activeTab);

  return {
    activeTab,
    setActiveTab,
    ...display,
    ...reasons,
    ...types,
  };
};
