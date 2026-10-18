import React, { useState, useEffect } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { apiClient } from '../../../services/apiClient';
import { parseCleanAddress } from './customerAddressHelpers';
import { WorkspaceCustomerHeader } from './WorkspaceCustomerHeader';
import { WorkspaceCustomerEditForm } from './WorkspaceCustomerEditForm';
import { WorkspaceManagerAssignBar } from './WorkspaceManagerAssignBar';
import type { WorkspaceOrder, AgentWorkload } from './types';

export { parseCleanAddress };

export interface WorkspaceCustomerEditorProps {
  order: WorkspaceOrder;
  isArabic: boolean;
  isManager?: boolean;
  agents?: AgentWorkload[];
  onAssignOrder?: (orderId: string, targetUserId: string) => Promise<void>;
  onSaveCustomer?: (
    orderId: string,
    customerData: {
      customerName?: string;
      customerPhone?: string;
      secondaryPhone?: string;
      governorate?: string;
      city?: string;
      shippingAddress?: string;
      notes?: string;
    }
  ) => Promise<void>;
}

export const WorkspaceCustomerEditor: React.FC<WorkspaceCustomerEditorProps> = ({
  order,
  isArabic,
  isManager,
  agents = [],
  onAssignOrder,
  onSaveCustomer,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(order.secondaryPhone || '');
  const [governorate, setGovernorate] = useState(order.governorate || '');
  const [city, setCity] = useState(order.city || '');
  const [shippingAddress, setShippingAddress] = useState(parseCleanAddress(order.shippingAddress));
  const [notes, setNotes] = useState(order.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [suggestedShipping, setSuggestedShipping] = useState<number | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const isGovernorateChanged = Boolean(
    order.governorate && governorate && governorate.trim() !== order.governorate.trim(),
  );

  useEffect(() => {
    setIsEditing(false);
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setSecondaryPhone(order.secondaryPhone || '');
    setGovernorate(order.governorate || '');
    setCity(order.city || '');
    setShippingAddress(parseCleanAddress(order.shippingAddress));
    setNotes(order.notes || '');
    setSuggestedShipping(null);
  }, [order.id]);

  const calculateSuggestedShipping = async (targetGov: string, targetCity?: string) => {
    if (!targetGov) return;
    try {
      setIsCalculatingShipping(true);
      const response = await apiClient.post('/turbo/calculate', {
        weight: 1,
        governorate: targetGov,
        city: targetCity || targetGov,
        address: shippingAddress || '',
        orderId: order.id,
        cod: order.total,
      });

      if (response.data?.success) {
        const data = response.data.data;
        const cost = Number(data?.cost || data?.price || data?.shippingCost);
        if (Number.isFinite(cost)) {
          setSuggestedShipping(cost);
        }
      }
    } catch {
      // Graceful fallback: UI displays reminder warning
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const handleSave = async () => {
    if (!onSaveCustomer) return;
    try {
      setIsSaving(true);
      await onSaveCustomer(order.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        secondaryPhone: secondaryPhone.trim(),
        governorate: governorate.trim(),
        city: city.trim(),
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim(),
      });
      if (isGovernorateChanged) {
        toast.warning(
          isArabic
            ? 'تنبيه: تم تعديل المحافظة. يرجى التأكد من تحديث سعر الشحن للطلب لتفادي فرق السعر.'
            : 'Notice: Governorate updated. Please verify and update order shipping rate.',
        );
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <WorkspaceCustomerHeader
        customerName={customerName}
        customerPhone={customerPhone}
        secondaryPhone={secondaryPhone}
        isArabic={isArabic}
        canEdit={Boolean(onSaveCustomer) && !isEditing}
        onStartEdit={() => setIsEditing(true)}
      />

      {isEditing ? (
        <WorkspaceCustomerEditForm
          customerName={customerName}
          customerPhone={customerPhone}
          secondaryPhone={secondaryPhone}
          governorate={governorate}
          city={city}
          shippingAddress={shippingAddress}
          notes={notes}
          isSaving={isSaving}
          isArabic={isArabic}
          isGovernorateChanged={isGovernorateChanged}
          orderGovernorate={order.governorate}
          orderShipping={order.shipping}
          suggestedShipping={suggestedShipping}
          isCalculatingShipping={isCalculatingShipping}
          setCustomerName={setCustomerName}
          setCustomerPhone={setCustomerPhone}
          setSecondaryPhone={setSecondaryPhone}
          setGovernorate={setGovernorate}
          setCity={setCity}
          setShippingAddress={setShippingAddress}
          setNotes={setNotes}
          onCalculateSuggestedShipping={calculateSuggestedShipping}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      ) : (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span className="leading-snug">
            {[order.governorate, order.city, parseCleanAddress(order.shippingAddress)].filter(Boolean).join(' • ') || '—'}
          </span>
        </div>
      )}

      {isManager && agents.length > 0 && onAssignOrder && (
        <WorkspaceManagerAssignBar
          assignedTo={order.assignedTo}
          assignedToName={order.assignedToName}
          agents={agents}
          isArabic={isArabic}
          orderId={order.id}
          onAssignOrder={onAssignOrder}
        />
      )}
    </div>
  );
};

export default WorkspaceCustomerEditor;
