import { toast } from "sonner";
import i18n from "../i18n";

export const tToast = {
  success: (key: string, fallback?: string) =>
    toast.success(i18n.t(key, fallback ?? key)),
  error: (key: string, fallback?: string) =>
    toast.error(i18n.t(key, fallback ?? key)),
  warning: (key: string, fallback?: string) =>
    toast.warning(i18n.t(key, fallback ?? key)),
  info: (key: string, fallback?: string) =>
    toast.info(i18n.t(key, fallback ?? key)),
  loading: (key: string, fallback?: string) =>
    toast.loading(i18n.t(key, fallback ?? key)),
};