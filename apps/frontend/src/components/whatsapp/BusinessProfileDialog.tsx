import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Store, X, Globe, Mail, MapPin, Tag } from "lucide-react";
import { tToast } from "../../utils/i18n-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient as api } from "../../services/apiClient";

interface BusinessProfileDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

interface BusinessProfile {
  address: string;
  description: string;
  email: string;
  website: string[];
  category: string;
}

const BusinessProfileDialog: React.FC<BusinessProfileDialogProps> = ({
  open,
  onClose,
  sessionId,
}) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
    address: "",
    description: "",
    email: "",
    website: [""],
    category: "",
  });

  const fetchBusinessProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/whatsapp/business/profile", {
        params: { sessionId },
      });
      if (response.data?.profile) {
        setProfile({
          ...response.data.profile,
          website: response.data.profile.website || [""],
        });
      }
    } catch (error) {
      console.error("Error fetching business profile:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) {
      void fetchBusinessProfile();
    }
  }, [fetchBusinessProfile, open, sessionId]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await api.post("/whatsapp/business/profile", {
        sessionId,
        ...profile,
      });
      tToast.success("BusinessProfileDialog.success_update_9be1");
      onClose();
    } catch (error) {
      console.error("Error updating business profile:", error);
      tToast.error("BusinessProfileDialog.failed_update_5c61");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-2xl border border-border/70 bg-card p-0 text-foreground shadow-2xl overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Store className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                ملف النشاط التجاري لواتساب
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                تحديث بيانات الواجهة العامة للحساب مثل الوصف والعنوان والموقع
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.97]"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-3.5 px-5 py-4 sm:grid-cols-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">
                وصف النشاط التجاري
              </label>
              <Textarea
                rows={3}
                value={profile.description}
                onChange={(event) =>
                  setProfile({ ...profile, description: event.target.value })
                }
                placeholder="نبذة مختصرة عن نشاطك التجاري وخدماتك..."
                className="rounded-xl border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MapPin className="size-3.5 text-muted-foreground" />
                العنوان الجغرافي
              </label>
              <Input
                value={profile.address}
                onChange={(event) =>
                  setProfile({ ...profile, address: event.target.value })
                }
                placeholder="الشارع، المدينة، الدولة..."
                className="h-9.5 rounded-xl border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Mail className="size-3.5 text-muted-foreground" />
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  setProfile({ ...profile, email: event.target.value })
                }
                placeholder="info@yourcompany.com"
                className="h-9.5 rounded-xl border-border/70 bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Globe className="size-3.5 text-muted-foreground" />
                الموقع الإلكتروني
              </label>
              <Input
                value={profile.website[0] || ""}
                onChange={(event) =>
                  setProfile({ ...profile, website: [event.target.value] })
                }
                placeholder="https://example.com"
                className="h-9.5 rounded-xl border-border/70 bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Tag className="size-3.5 text-muted-foreground" />
                الفئة التجارية (Category)
              </label>
              <Input
                value={profile.category}
                onChange={(event) =>
                  setProfile({ ...profile, category: event.target.value })
                }
                placeholder="e.g. Retail, Healthcare, Technology"
                className="h-9.5 rounded-xl border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-border/70 bg-card px-4 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleUpdateProfile}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <span>حفظ التغييرات</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessProfileDialog;
