import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TruckIcon, ArrowRightIcon, PencilIcon, TrashIcon, GlobeAltIcon, PhoneIcon, EnvelopeIcon, KeyIcon, LinkIcon } from '@heroicons/react/24/outline';
// import { useAuth } from '../../hooks/useAuthSimple';
import { envConfig } from '../../config/environment';

interface ShippingCompany {
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

const ShippingCompanyDetail: React.FC = () => {
  const { t: tVal } = useTranslation();
  const t = tVal as any;

  const providerLabels: Record<string, string> = {
    MANUAL: t('shipping.k_1'),
    TURBO: 'Turbo',
    BOSTA_DEMO: 'Bosta Demo',
    MYLERZ_DEMO: 'Mylerz Demo',
    ARAMEX_DEMO: 'Aramex Demo',
  };

  const integrationLabels: Record<string, string> = {
    MANUAL: t('shipping.k_1'),
    DEMO: t('shipping.k_2'),
    LIVE: t('shipping.k_3'),
  };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<ShippingCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${envConfig.backendUrl}/api/v1/shipping-companies/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCompany(data.data);
      } else {
        setError(data.error || t('shipping.k_35'));
      }
    } catch (error) {
      console.error('Error fetching shipping company:', error);
      setError(t('shipping.k_36'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(t('shipping.k_8'))) {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${envConfig.backendUrl}/api/v1/shipping-companies/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          navigate('/shipping-companies');
        } else {
          alert(data.error || t('shipping.k_9'));
        }
      } catch (error) {
        console.error('Error deleting shipping company:', error);
        alert(t('shipping.k_9'));
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('shipping.k_17')}</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error || t('shipping.k_35')}</h3>
          <Link to="/shipping-companies" className="text-blue-600 hover:underline">
            {t('shipping.k_60')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link to="/shipping-companies" className="flex items-center text-gray-600 hover:text-gray-900 ml-4">
          <ArrowRightIcon className="h-5 w-5 ml-1" />
          {t('shipping.k_61')}
        </Link>
      </div>

      {/* Company Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <TruckIcon className="h-10 w-10 text-white" />
              </div>
              <div className="mr-4">
                <h1 className="text-2xl font-bold text-white">{company.name}</h1>
                <span className={`inline-block px-3 py-1 text-sm rounded-full mt-2 ${
                  company.isActive 
                    ? 'bg-green-400 text-green-900' 
                    : 'bg-red-400 text-red-900'
                }`}>
                  {company.isActive ? t('shipping.k_37') : t('shipping.k_38')}
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                to={`/shipping-companies/${company.id}/edit`}
                className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <PencilIcon className="h-5 w-5 ml-2" />
                {t('shipping.k_22')}
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <TrashIcon className="h-5 w-5 ml-2" />
                {t('shipping.k_23')}
              </button>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('shipping.k_39')}</h3>
              
              {company.phone && (
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-gray-400 ml-3" />
                  <div>
                    <p className="text-sm text-gray-500">{t('shipping.k_29')}</p>
                    <a href={`tel:${company.phone}`} className="text-blue-600 hover:underline">
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}

              {company.email && (
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 ml-3" />
                  <div>
                    <p className="text-sm text-gray-500">{t('shipping.k_40')}</p>
                    <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                      {company.email}
                    </a>
                  </div>
                </div>
              )}

              {company.website && (
                <div className="flex items-center">
                  <GlobeAltIcon className="h-5 w-5 text-gray-400 ml-3" />
                  <div>
                    <p className="text-sm text-gray-500">{t('shipping.k_41')}</p>
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      {company.website}
                      <LinkIcon className="h-4 w-4 mr-1" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* API Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('shipping.k_42')}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                  {providerLabels[company.providerKey || 'MANUAL'] || company.providerKey || t('shipping.k_1')}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                  {integrationLabels[company.integrationMode || 'MANUAL'] || company.integrationMode || t('shipping.k_1')}
                </span>
              </div>
              
              {company.apiKey ? (
                <div className="flex items-center">
                  <KeyIcon className="h-5 w-5 text-gray-400 ml-3" />
                  <div>
                    <p className="text-sm text-gray-500">API Key</p>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {company.apiKey.substring(0, 20)}...
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 italic">{t('shipping.k_43')}</p>
              )}

              {company.apiUrl && (
                <div className="flex items-center">
                  <LinkIcon className="h-5 w-5 text-gray-400 ml-3" />
                  <div>
                    <p className="text-sm text-gray-500">API URL</p>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded block mt-1">
                      {company.apiUrl}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-500 space-x-6">
              <span>{t('shipping.k_44')}{new Date(company.createdAt).toLocaleDateString('ar-EG')}</span>
              <span>{t('shipping.k_45')}{new Date(company.updatedAt).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingCompanyDetail;
