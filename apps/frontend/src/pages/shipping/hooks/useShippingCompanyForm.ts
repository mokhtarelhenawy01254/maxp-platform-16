import React, { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/apiClient';
import {
  type ShippingCompany,
  type ShippingCompanyFormData,
  type TestedProfile,
  parseSettings,
} from '../types';

export const INITIAL_SHIPPING_FORM_DATA: ShippingCompanyFormData = {
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
  isActive: true,
  username: '',
  password: '',
  customerId: '',
  defaultNotes: '',
  pickupAddress: '',
  mainClientCode: '',
  senderNumber: '',
};

export const useShippingCompanyForm = (onSuccess: () => void) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testedProfile, setTestedProfile] = useState<TestedProfile | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [formData, setFormData] = useState<ShippingCompanyFormData>(INITIAL_SHIPPING_FORM_DATA);

  const handleTestConnection = async (companyId?: string) => {
    const targetId = companyId || editingCompany?.id;
    if (!targetId) return;

    setTestingConnection(true);
    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        apiKey: formData.apiKey,
        apiUrl: formData.apiUrl,
      };
      const res: any = await apiClient.post(`/shipping-companies/${targetId}/test-connection`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'الاتصال ناجح ومكتمل');
        if (res.data.data) {
          setTestedProfile(res.data.data);
          if (res.data.data.customerId) {
            setFormData((prev) => ({
              ...prev,
              customerId: String(res.data.data.customerId),
              pickupAddress: prev.pickupAddress || res.data.data.address || '',
            }));
          }
        }
        onSuccess();
      } else {
        toast.error(res.data?.error || 'فشل الاتصال بشركة الشحن');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر فحص الاتصال');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleOpenSettings = (company: ShippingCompany, autoActivate = false) => {
    const settings = parseSettings(company.settings) as any;
    setEditingCompany(company);
    setShowAdvanced(false);
    setTestedProfile(null);
    setFormData({
      name: company.name,
      slug: company.slug || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      apiKey: company.apiKey || settings.apiKey || '',
      apiUrl:
        company.apiUrl ||
        (company.providerKey === 'QP_EXPRESS'
          ? 'https://qpxpress.com:8001'
          : company.providerKey === 'BOSTA'
          ? 'https://app.bosta.co'
          : ''),
      providerKey: company.providerKey || 'MANUAL',
      integrationMode: company.integrationMode || 'MANUAL',
      autoCreateShipments: Boolean(settings.autoCreateShipments),
      isActive: autoActivate ? true : company.isActive,
      username: settings.username || '',
      password: settings.password || '',
      customerId: settings.customerId ? String(settings.customerId) : '',
      defaultNotes: settings.defaultNotes || '',
      pickupAddress: settings.pickupAddress || '',
      mainClientCode: settings.mainClientCode ? String(settings.mainClientCode) : '',
      senderNumber: settings.senderNumber || '',
    });
    setShowModal(true);
  };

  const handleOpenNewModal = () => {
    setEditingCompany(null);
    setShowAdvanced(false);
    setTestedProfile(null);
    setFormData(INITIAL_SHIPPING_FORM_DATA);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = `/shipping-companies${editingCompany ? `/${editingCompany.id}` : ''}`;
      const method = editingCompany ? 'put' : 'post';

      const settingsPayload = {
        autoCreateShipments: formData.autoCreateShipments,
        username: formData.username || undefined,
        password: formData.password || undefined,
        customerId: formData.customerId ? Number(formData.customerId) : undefined,
        defaultNotes: formData.defaultNotes || undefined,
        pickupAddress: formData.pickupAddress || undefined,
        mainClientCode: formData.mainClientCode || undefined,
        senderNumber: formData.senderNumber || undefined,
        apiKey: formData.apiKey || undefined,
      };

      const resolvedIntegrationMode =
        formData.providerKey === 'QP_EXPRESS' && (formData.username || formData.password)
          ? 'LIVE'
          : formData.providerKey === 'BOSTA' && formData.apiKey
          ? 'LIVE'
          : formData.providerKey === 'TURBO' && formData.apiKey
          ? 'LIVE'
          : formData.integrationMode;

      const payload = {
        ...formData,
        integrationMode: resolvedIntegrationMode,
        settings: JSON.stringify(settingsPayload),
      };

      const res = await (apiClient as any)[method](url, payload);
      if (res.data?.success) {
        toast.success(
          editingCompany ? 'تم حفظ إعدادات الربط بنجاح' : 'تمت إضافة شركة الشحن بنجاح'
        );
        setShowModal(false);
        onSuccess();
      } else {
        toast.error(res.data?.error || 'تعذر حفظ إعدادات الشركة');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'حدث خطأ أثناء الحفظ');
    }
  };

  return {
    showModal,
    setShowModal,
    editingCompany,
    showAdvanced,
    setShowAdvanced,
    testedProfile,
    testingConnection,
    formData,
    setFormData,
    handleTestConnection,
    handleOpenSettings,
    handleOpenNewModal,
    handleSubmit,
  };
};
