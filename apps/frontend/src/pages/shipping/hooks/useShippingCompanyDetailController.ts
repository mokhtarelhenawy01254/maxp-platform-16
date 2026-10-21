import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { envConfig } from '../../../config/environment';

export interface ShippingCompany {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  apiKey?: string;
  apiUrl?: string;
  providerKey?: string;
  integrationMode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useShippingCompanyDetailController = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<ShippingCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const providerLabels: Record<string, string> = useMemo(() => ({
    MANUAL: t('shipping.k_1'),
    TURBO: 'Turbo',
    BOSTA_DEMO: 'Bosta Demo',
    MYLERZ_DEMO: 'Mylerz Demo',
    ARAMEX_DEMO: 'Aramex Demo',
  }), [t]);

  const integrationLabels: Record<string, string> = useMemo(() => ({
    MANUAL: t('shipping.k_1'),
    DEMO: t('shipping.k_2'),
    LIVE: t('shipping.k_3'),
  }), [t]);

  const fetchCompany = useCallback(async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`${envConfig.backendUrl}/api/v1/shipping-companies/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCompany(data.data);
      } else {
        setError(data.error || t('shipping.k_35'));
      }
    } catch (err) {
      console.error('Error fetching shipping company:', err);
      setError(t('shipping.k_36'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleDelete = async () => {
    if (!id) return;
    if (confirm(t('shipping.k_8'))) {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const response = await fetch(`${envConfig.backendUrl}/api/v1/shipping-companies/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          navigate('/shipping-companies');
        } else {
          alert(data.error || t('shipping.k_9'));
        }
      } catch (err) {
        console.error('Error deleting shipping company:', err);
        alert(t('shipping.k_9'));
      }
    }
  };

  return {
    t,
    company,
    loading,
    error,
    handleDelete,
    providerLabels,
    integrationLabels,
  };
};
