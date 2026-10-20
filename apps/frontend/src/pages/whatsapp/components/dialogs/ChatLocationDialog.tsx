import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import { Input as UiInput } from '@/components/ui/input';
import type { LocationData } from '../../chat/types/whatsappChatTypes';

interface ChatLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendLocation: (locationData: LocationData) => void | Promise<void>;
}

export const ChatLocationDialog: React.FC<ChatLocationDialogProps> = ({
  open,
  onOpenChange,
  onSendLocation,
}) => {
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: '',
    longitude: '',
    address: '',
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationData((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        toast.success('تم تحديد موقعك بنجاح');
      },
      () => {
        toast.error('تعذر الحصول على الموقع الحالي');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSend = async () => {
    await onSendLocation(locationData);
    setLocationData({ latitude: '', longitude: '', address: '' });
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      <UiDialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <MapPin className="size-5 text-[color:var(--color-primary)]" />
            <span>إرسال موقع جغرافي</span>
          </UiDialogTitle>
        </UiDialogHeader>

        <div className="space-y-4 px-6 py-6">
          <UiButton variant="outline" className="w-full justify-center" onClick={getCurrentLocation}>
            <MapPin className="size-4" />
            <span>استخدام موقعي الحالي</span>
          </UiButton>

          <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
            أو أدخل الإحداثيات يدويًا
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <UiInput
              type="number"
              step="any"
              value={locationData.latitude}
              onChange={(e) => setLocationData((prev) => ({ ...prev, latitude: e.target.value }))}
              className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              placeholder="خط العرض (Latitude)"
            />
            <UiInput
              type="number"
              step="any"
              value={locationData.longitude}
              onChange={(e) => setLocationData((prev) => ({ ...prev, longitude: e.target.value }))}
              className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              placeholder="خط الطول (Longitude)"
            />
          </div>

          <UiInput
            value={locationData.address}
            onChange={(e) => setLocationData((prev) => ({ ...prev, address: e.target.value }))}
            className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
            placeholder="العنوان (مثال: القاهرة، مصر)"
          />

          {locationData.latitude && locationData.longitude ? (
            <div className="space-y-3 rounded-[24px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4">
              <p className="text-sm text-[color:var(--color-foreground)] tabular-nums font-mono">
                الموقع: {locationData.latitude}, {locationData.longitude}
              </p>
              <UiButton asChild variant="outline" size="sm">
                <a
                  href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  عرض على الخريطة
                </a>
              </UiButton>
            </div>
          ) : null}
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            إلغاء
          </UiButton>
          <UiButton
            onClick={handleSend}
            disabled={!locationData.latitude || !locationData.longitude}
          >
            إرسال الموقع
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatLocationDialog;
