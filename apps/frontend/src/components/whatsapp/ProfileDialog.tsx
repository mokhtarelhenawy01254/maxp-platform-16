import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, X, User } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInboxExternalImageUrl } from "@/utils/imageUrl";
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
import { cn } from "@/lib/utils";
import { apiClient as api } from "../../services/apiClient";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  currentName?: string;
  currentStatus?: string;
  currentPicture?: string;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({
  open,
  onClose,
  sessionId,
  currentName,
  currentStatus,
  currentPicture,
}) => {
  const [name, setName] = useState(currentName || "");
  const [status, setStatus] = useState(currentStatus || "");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(
    currentPicture || null,
  );
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentName) {
      setName(currentName);
    }
    if (currentStatus) {
      setStatus(currentStatus);
    }
    if (currentPicture) {
      setPicturePreview(currentPicture);
    }
  }, [currentName, currentPicture, currentStatus]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];
      setPictureFile(file);
      setPicturePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      if (name !== currentName) {
        formData.append("name", name);
      }
      if (status !== currentStatus) {
        formData.append("status", status);
      }
      if (pictureFile) {
        formData.append("picture", pictureFile);
      }

      await api.post("/whatsapp/profile/update", formData);

      tToast.success("ProfileDialog.success_update_7fa9");
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      tToast.error("ProfileDialog.failed_update_293c");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await api.post("/whatsapp/profile/sync", { sessionId });
      const { profile } = response.data || {};

      if (profile) {
        setName(profile.name || "");
        setStatus(profile.status || "");
        setPicturePreview(profile.profilePicUrl || null);
        tToast.success("ProfileDialog.msg_fc01");
      }
    } catch (error) {
      console.error("Error syncing profile:", error);
      tToast.error("ProfileDialog.msg_5720");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl gap-0 rounded-2xl border border-border/70 bg-card p-0 text-foreground shadow-2xl overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <User className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                تحديث الملف الشخصي لواتساب
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                تعديل الاسم والحالة والصورة الشخصية لحساب واتساب المتصل
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

        <div className="grid gap-5 p-5 sm:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="relative">
              <Avatar className="size-28 rounded-2xl border border-border/60 shadow-md">
                <AvatarImage src={getInboxExternalImageUrl(picturePreview) || undefined} />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                  {(name || currentName || "WA").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -end-1.5 flex size-8 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground shadow-md transition-all hover:bg-muted active:scale-95"
                title="تغيير الصورة"
                aria-label="تغيير الصورة"
              >
                <Camera className="size-3.5 text-primary" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              انقر على أيقونة الكاميرا لرفع صورة شخصية جديدة
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                الاسم الظاهر
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="اسم الحساب..."
                className="h-9.5 rounded-xl border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                الاسم الذي يظهر للعملاء وجهات الاتصال في محادثات واتساب
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                الحالة (About / Bio)
              </label>
              <Textarea
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                rows={3}
                placeholder="حالة الحساب..."
                className="rounded-xl border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span>مزامنة من واتساب</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 rounded-xl border border-border/70 bg-card px-4 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              <span>حفظ البيانات</span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
