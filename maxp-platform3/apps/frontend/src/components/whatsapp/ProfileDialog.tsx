import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

      await api.post("/whatsapp/profile/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم تحديث الملف الشخصي بنجاح");
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("فشل تحديث الملف الشخصي");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await api.post("/whatsapp/profile/sync", { sessionId });
      const { profile } = response.data;

      if (profile) {
        setName(profile.name || "");
        setStatus(profile.status || "");
        setPicturePreview(profile.profilePicUrl || null);
        toast.success("تمت مزامنة البيانات من واتساب بنجاح");
      }
    } catch (error) {
      console.error("Error syncing profile:", error);
      toast.error("فشل مزامنة البيانات من واتساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="text-lg text-[color:var(--color-foreground)]">
            تحديث الملف الشخصي
          </DialogTitle>
          <DialogDescription>
            عدّل الاسم والحالة والصورة الظاهرة في حساب واتساب المتصل.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 px-5 py-6">
            <div className="relative">
              <Avatar className="size-32 shadow-[0_18px_40px_rgba(15,27,45,0.12)]">
                <AvatarImage src={picturePreview || undefined} />
                <AvatarFallback className="bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] text-2xl font-semibold text-[color:var(--color-primary)]">
                  {(name || currentName || "WA").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 end-1 flex size-10 items-center justify-center rounded-full border border-[color:var(--shell-control-border)] bg-white text-[color:var(--color-foreground)] shadow-[0_12px_24px_rgba(15,27,45,0.12)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-center text-xs leading-6 text-[color:var(--color-muted-foreground)]">
              اضغط على الكاميرا لتغيير الصورة الظاهرة للحساب.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                الاسم
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 rounded-[18px] bg-white/75"
              />
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                الاسم الذي يظهر للآخرين في واتساب.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                الحالة
              </label>
              <Textarea
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                rows={4}
                className="rounded-[18px] border-[color:var(--shell-control-border)] bg-white/75"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={handleSync} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            مزامنة من واتساب
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
