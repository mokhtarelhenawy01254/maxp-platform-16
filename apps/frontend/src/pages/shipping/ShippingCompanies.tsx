import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
// import { useAuth } from '../../hooks/useAuthSimple';
import { envConfig } from '../../config/environment';
import tokenManager from '../../utils/tokenManager';

interface ShippingCompany {
  id: string;
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  website?: string;
  apiKey?: string;
  apiUrl?: string;
  providerKey?: string;
  integrationMode?: string;
  settings?: string | null;
  isActive: boolean;
  createdAt: string;
}

const parseSettings = (value?: string | null) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const ShippingCompanies: React.FC = () => {
  const { t: tVal } = useTranslation();
  const t = tVal as any;

  const providerLabels: Record<string, string> = {
    MANUAL: t('shipping.k_1'),
    TURBO: "Turbo",
    BOSTA: "Bosta",
    BOSTA_DEMO: "Bosta Demo",
    MYLERZ_DEMO: "Mylerz Demo",
    ARAMEX_DEMO: "Aramex Demo",
  };

  const integrationLabels: Record<string, string> = {
    MANUAL: t('shipping.k_1'),
    DEMO: t('shipping.k_2'),
    LIVE: t('shipping.k_3'),
  };

  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    phone: '',
    email: '',
    website: '',
    apiKey: '',
    apiUrl: '',
    providerKey: 'MANUAL',
    integrationMode: 'MANUAL',
    autoCreateShipments: false,
    isActive: true
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch(
        `${envConfig.backendUrl}/api/v1/shipping-companies`,
        {
          headers: tokenManager.createAuthHeaders(),
        },
      );
      const data = await response.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (error) {
      console.error("Error fetching shipping companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = `${envConfig.backendUrl}/api/v1/shipping-companies${editingCompany ? `/${editingCompany.id}` : ""}`;
      const method = editingCompany ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        await fetchCompanies();
        setShowModal(false);
        setEditingCompany(null);
        setFormData({ name: '', slug: '', phone: '', email: '', website: '', apiKey: '', apiUrl: '', providerKey: 'MANUAL', integrationMode: 'MANUAL', autoCreateShipments: false, isActive: true });
      } else {
        alert(data.error || t('shipping.k_4'));
      }
    } catch (error) {
      console.error("Error saving shipping company:", error);
      alert(t('shipping.k_5'));
    }
  };

  const handleEdit = (company: ShippingCompany) => {
    const settings = parseSettings(company.settings);
    setEditingCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      apiKey: company.apiKey || '',
      apiUrl: company.apiUrl || '',
      providerKey: company.providerKey || 'MANUAL',
      integrationMode: company.integrationMode || 'MANUAL',
      autoCreateShipments: Boolean((settings as { autoCreateShipments?: boolean }).autoCreateShipments),
      isActive: company.isActive
    });
    setShowModal(true);
  };

  const handleEnsureDemoCarriers = async () => {
    try {
      setCreatingDemo(true);
      const response = await fetch(
        `${envConfig.backendUrl}/api/v1/shipping-companies/demo-carriers`,
        {
          method: "POST",
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        alert(data.error || t('shipping.k_6'));
        return;
      }
      await fetchCompanies();
    } catch (error) {
      console.error("Error creating demo carriers:", error);
      alert(t('shipping.k_7'));
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('shipping.k_8'))) {
      try {
        const response = await fetch(
          `${envConfig.backendUrl}/api/v1/shipping-companies/${id}`,
          {
            method: "DELETE",
            headers: tokenManager.createAuthHeaders(),
          },
        );
        const data = await response.json();
        if (data.success) {
          await fetchCompanies();
        } else {
          alert(data.error || t('shipping.k_9'));
        }
      } catch (error) {
        console.error("Error deleting shipping company:", error);
        alert(t('shipping.k_9'));
      }
    }
  };

  const resetForm = () => {
    setEditingCompany(null);
    setFormData({ name: '', slug: '', phone: '', email: '', website: '', apiKey: '', apiUrl: '', providerKey: 'MANUAL', integrationMode: 'MANUAL', autoCreateShipments: false, isActive: true });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <TruckIcon className="h-8 w-8 text-blue-600 ml-3" />
          <h1 className="text-2xl font-bold text-gray-900">{t('shipping.k_10')}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleEnsureDemoCarriers}
            disabled={creatingDemo}
            className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {creatingDemo ? t('shipping.k_11') : t('shipping.k_12')}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            {t('shipping.k_25')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <TruckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm text-gray-500">{t('shipping.k_13')}</p>
              <p className="text-2xl font-bold">{companies.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <div className="h-6 w-6 text-green-600 flex items-center justify-center">
                ✓
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm text-gray-500">{t('shipping.k_14')}</p>
              <p className="text-2xl font-bold">
                {companies.filter((c) => c.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <div className="h-6 w-6 text-yellow-600 flex items-center justify-center">
                !
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm text-gray-500">{t('shipping.k_15')}</p>
              <p className="text-2xl font-bold">
                {companies.filter((c) => !c.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{t('shipping.k_16')}</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">{t('shipping.k_17')}</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center">
            <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('shipping.k_46')}
            </h3>
            <p className="text-gray-500 mb-4">{t('shipping.k_18')}</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('shipping.k_25')}
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('shipping.k_47')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('shipping.k_48')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('shipping.k_49')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('shipping.k_50')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('shipping.k_51')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      to={`/shipping-companies/${company.slug || company.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900 hover:underline"
                    >
                      {company.name}
                    </Link>
                    {company.slug && (
                      <span className="block text-xs text-gray-400 mt-1">/{company.slug}</span>
                    )}
                    {company.website && (
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block text-xs text-gray-400 hover:text-gray-600 mt-1"
                      >
                        {company.website}
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.phone || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {providerLabels[company.providerKey || "MANUAL"] || company.providerKey || t('shipping.k_1')}
                    </span>
                    <span className="mr-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                      {integrationLabels[company.integrationMode || "MANUAL"] || company.integrationMode || t('shipping.k_1')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${company.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {company.isActive ? t('shipping.k_19') : t('shipping.k_20')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link 
                      to={`/shipping-companies/${company.slug || company.id}`}
                      className="text-blue-600 hover:text-blue-900 ml-3"
                      title={t('shipping.k_21')}
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                    <button onClick={() => handleEdit(company)} className="text-indigo-600 hover:text-indigo-900 ml-3" title={t('shipping.k_22')}>
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(company.id)} className="text-red-600 hover:text-red-900" title={t('shipping.k_23')}>
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingCompany ? t('shipping.k_24') : t('shipping.k_25')}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('shipping.k_52')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('shipping.k_26')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('shipping.k_53')}
                    <span className="text-gray-400 text-xs mr-1">{t('shipping.k_27')}</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\u0621-\u064A-]/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="fiora, sola, aramex..."
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('shipping.k_28')}{formData.slug || '...'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('shipping.k_29')}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+966..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('shipping.k_40')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('shipping.k_41')}
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={formData.apiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, apiKey: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('shipping.k_30')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API URL
                  </label>
                  <input
                    type="url"
                    value={formData.apiUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, apiUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('shipping.k_54')}
                  </label>
                  <select
                    value={formData.providerKey}
                    onChange={(e) => {
                      const providerKey = e.target.value;
                      setFormData({
                        ...formData,
                        providerKey,
                        integrationMode: providerKey.endsWith("_DEMO") ? "DEMO" : formData.integrationMode,
                        autoCreateShipments: providerKey.endsWith("_DEMO") ? true : formData.autoCreateShipments,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MANUAL">{t('shipping.k_1')}</option>
                    <option value="TURBO">{t('shipping.k_31')}</option>
                    <option value="BOSTA">{t('shipping.k_32')}</option>
                    <option value="BOSTA_DEMO">Bosta Demo</option>
                    <option value="MYLERZ_DEMO">Mylerz Demo</option>
                    <option value="ARAMEX_DEMO">Aramex Demo</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('shipping.k_55')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('shipping.k_56')}
                  </label>
                  <select
                    value={formData.integrationMode}
                    onChange={(e) =>
                      setFormData({ ...formData, integrationMode: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MANUAL">{t('shipping.k_1')}</option>
                    <option value="DEMO">{t('shipping.k_2')}</option>
                    <option value="LIVE">{t('shipping.k_3')}</option>
                  </select>
                </div>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="autoCreateShipments"
                    checked={formData.autoCreateShipments}
                    onChange={(e) =>
                      setFormData({ ...formData, autoCreateShipments: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="autoCreateShipments"
                    className="mr-2 text-sm text-gray-700"
                  >
                    {t('shipping.k_57')}
                    <span className="block text-xs text-gray-500">
                      {t('shipping.k_58')}
                    </span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="mr-2 text-sm text-gray-700"
                  >
                    {t('shipping.k_19')}
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {t('shipping.k_59')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCompany ? t('shipping.k_33') : t('shipping.k_34')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCompanies;
