import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";
import { useSnackbar } from "notistack";

import { Button } from "@/components/ui/button";
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
  const { enqueueSnackbar } = useSnackbar();
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
      if (response.data.profile) {
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
      enqueueSnackbar("تم تحديث ملف الأعمال بنجاح", { variant: "success" });
      onClose();
    } catch (error) {
      console.error("Error updating business profile:", error);
      enqueueSnackbar("فشل تحديث ملف الأعمال", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <Store className="size-5 text-[color:var(--color-primary)]" />
            ملف النشاط التجاري
          </DialogTitle>
          <DialogDescription>
            حدّث بيانات الواجهة العامة للحساب التجاري مثل الوصف والعنوان والموقع الإلكتروني.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-[color:var(--color-primary)]" />
          </div>
        ) : (
          <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                وصف النشاط التجاري
              </label>
              <Textarea
                rows={4}
                value={profile.description}
                onChange={(event) =>
                  setProfile({ ...profile, description: event.target.value })
                }
                className="rounded-[20px] border-[color:var(--shell-control-border)] bg-white/75"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                العنوان
              </label>
              <Input
                value={profile.address}
                onChange={(event) =>
                  setProfile({ ...profile, address: event.target.value })
                }
                className="h-11 rounded-[18px] bg-white/75"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                البريد الإلكتروني
              </label>
              <Input
                value={profile.email}
                onChange={(event) =>
                  setProfile({ ...profile, email: event.target.value })
                }
                className="h-11 rounded-[18px] bg-white/75"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                الموقع الإلكتروني
              </label>
              <Input
                value={profile.website[0]}
                onChange={(event) =>
                  setProfile({ ...profile, website: [event.target.value] })
                }
                className="h-11 rounded-[18px] bg-white/75"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                الفئة
              </label>
              <Input
                value={profile.category}
                onChange={(event) =>
                  setProfile({ ...profile, category: event.target.value })
                }
                className="h-11 rounded-[18px] bg-white/75"
              />
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                أدخل معرف الفئة التجارية إذا كان مطلوبًا من مزود واتساب.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleUpdateProfile} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessProfileDialog;
