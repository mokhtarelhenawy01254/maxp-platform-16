import { toast } from "sonner";
import i18n from "../i18n";

export const tToast = {
  success: (key: string, vars?: Record<string, unknown>) =>
    toast.success(i18n.t(key, vars ?? {})),
  error: (key: string, vars?: Record<string, unknown>) =>
    toast.error(i18n.t(key, vars ?? {})),
  warning: (key: string, vars?: Record<string, unknown>) =>
    toast.warning(i18n.t(key, vars ?? {})),
  info: (key: string, vars?: Record<string, unknown>) =>
    toast.info(i18n.t(key, vars ?? {})),
  loading: (key: string, vars?: Record<string, unknown>) =>
    toast.loading(i18n.t(key, vars ?? {})),
  message: (key: string, vars?: Record<string, unknown>) =>
    toast(i18n.t(key, vars ?? {})),
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
    vars?: Record<string, unknown>
  ) =>
    toast.promise(promise, {
      loading: i18n.t(messages.loading, vars ?? {}),
      success: i18n.t(messages.success, vars ?? {}),
      error: i18n.t(messages.error, vars ?? {}),
    }),
};