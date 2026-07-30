import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, ExternalLink, Eye, Globe, Link2, LockKeyhole, Pencil, Plus, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import {
  BusinessPageHero,
  BusinessPageShell,
} from "../components/business/BusinessSurface";
import { useAuth } from "../hooks/useAuthSimple";
import api from "../services/api";
import { buildAppUrl } from "../utils/urlHelper";

type CompanyLink = {
  id: string;
  name: string;
  url: string;
  username?: string;
  openMode?: "new_tab" | "in_app";
  hasPassword?: boolean;
};

type LinkFormState = {
  name: string;
  url: string;
  username: string;
  password: string;
  openMode: "new_tab" | "in_app";
};

const INITIAL_FORM: LinkFormState = {
  name: "",
  url: "",
  username: "",
  password: "",
  openMode: "new_tab",
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const message =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      : undefined;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const CompanyLinks: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const canManage = useMemo(
    () =>
      user?.role === "OWNER" ||
      user?.role === "COMPANY_ADMIN" ||
      user?.role === "SUPER_ADMIN",
    [user?.role],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<CompanyLink[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyLink | null>(null);
  const [form, setForm] = useState<LinkFormState>(INITIAL_FORM);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [shownPassword, setShownPassword] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [linkPendingDelete, setLinkPendingDelete] = useState<CompanyLink | null>(
    null,
  );

  const shareUrl = shareToken ? buildAppUrl(`/company-links/${shareToken}`) : "";

  const resetForm = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
  };

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("company/links");
      setLinks(response?.data?.data || []);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t("companyLinks.fetchError")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchShareToken = useCallback(async () => {
    try {
      if (!canManage) {
        return;
      }

      const response = await api.get("company/links/share-token");
      setShareToken(response?.data?.data?.token || null);
    } catch {
      setShareToken(null);
    }
  }, [canManage]);

  useEffect(() => {
    void fetchLinks();
    void fetchShareToken();
  }, [user?.companyId, fetchLinks, fetchShareToken]);

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success(successMessage);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const openLink = (link: CompanyLink) => {
    if (!link.url) {
      return;
    }

    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const saveLink = async () => {
    try {
      if (!canManage) {
        return;
      }

      const payload: {
        name: string;
        url: string;
        username: string;
        openMode: "new_tab" | "in_app";
        password?: string;
      } = {
        name: form.name,
        url: form.url,
        username: form.username,
        openMode: form.openMode,
      };

      if (form.password !== "") {
        payload.password = form.password;
      }

      if (editing?.id) {
        await api.put(`company/links/${editing.id}`, payload);
        toast.success(t("companyLinks.updateSuccess"));
      } else {
        await api.post("company/links", payload);
        toast.success(t("companyLinks.addSuccess"));
      }

      setDialogOpen(false);
      resetForm();
      void fetchLinks();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t("companyLinks.saveError")));
    }
  };

  const deleteLink = async () => {
    try {
      if (!canManage || !linkPendingDelete) {
        return;
      }

      await api.delete(`company/links/${linkPendingDelete.id}`);
      toast.success(t("companyLinks.deleteSuccess"));
      setLinkPendingDelete(null);
      void fetchLinks();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t("companyLinks.deleteError")));
    }
  };

  const showPassword = async (link: CompanyLink) => {
    try {
      if (!canManage) {
        return;
      }

      const response = await api.get(`company/links/${link.id}/password`);
      const password = response?.data?.data?.password || "";
      setShownPassword(password);
      setPasswordDialogOpen(true);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, t("companyLinks.fetchPasswordError")),
      );
    }
  };

  const copyPassword = async (link: CompanyLink) => {
    try {
      if (!canManage) {
        return;
      }

      const response = await api.get(`company/links/${link.id}/password`);
      const password = response?.data?.data?.password || "";
      await copyText(password, t("companyLinks.passwordCopied"));
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, t("companyLinks.copyPasswordError")),
      );
    }
  };

  const generateShareLink = async () => {
    try {
      if (!canManage) {
        return;
      }

      const response = await api.post("company/links/share-token", {});
      const token = response?.data?.data?.token || null;
      setShareToken(token);

      if (token) {
        await copyText(
          buildAppUrl(`/company-links/${token}`),
          t("companyLinks.shareLinkCopied"),
        );
      }
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, t("companyLinks.createShareLinkError")),
      );
    }
  };

  const revokeShareLink = async () => {
    try {
      if (!canManage) {
        return;
      }

      await api.delete("company/links/share-token");
      setShareToken(null);
      toast.success(t("companyLinks.shareLinkRevoked"));
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, t("companyLinks.revokeShareLinkError")),
      );
    }
  };

  const startEditing = (link: CompanyLink) => {
    setEditing(link);
    setForm({
      name: link.name || "",
      url: link.url || "",
      username: link.username || "",
      password: "",
      openMode: link.openMode || "new_tab",
    });
    setDialogOpen(true);
  };

  const openModeLabel = (mode?: CompanyLink["openMode"]) =>
    mode === "in_app" ? t("companyLinks.inApp") : t("companyLinks.newTab");

  return (
    <BusinessPageShell className="space-y-4 md:space-y-6" dir="rtl">
      <BusinessPageHero
        title={
          <span className="business-page-title-row">
            <span className="business-page-title-copy">
              {t("companyLinks.title")}
            </span>
            <span className="business-page-title-artwork">
              <Link2 className="size-6" />
            </span>
          </span>
        }
        description="روابط الشركة السريعة وروابط المشاركة الثابتة."
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
                className="h-11"
              >
                <Plus className="size-4" />
                {t("companyLinks.addLink")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={shareToken ? () => void copyText(shareUrl, t("companyLinks.shareLinkCopied")) : generateShareLink}
              >
                <Link2 className="size-4" />
                {shareToken ? t("companyLinks.copy") : t("companyLinks.createShareLink")}
              </Button>
              {shareToken ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                  onClick={revokeShareLink}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border/50 bg-muted/30 p-4"
            >
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="mt-2 h-3 w-56 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>تعذر تحميل الروابط</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : links.length === 0 ? null : (
        <div className="space-y-3">
          {links.map((link) => (
            <article
              key={link.id}
              className="group rounded-2xl border border-border/70 bg-background p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {link.name}
                      </h3>
                      <Badge variant="outline" className="rounded-full">
                        {openModeLabel(link.openMode)}
                      </Badge>
                      {link.hasPassword ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700"
                        >
                          <LockKeyhole className="ml-1 size-3.5" />
                          محمي بكلمة مرور
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Globe className="mt-0.5 size-4 shrink-0" />
                        <span className="break-all">{link.url}</span>
                      </div>
                      {link.username ? (
                        <div className="flex items-center gap-2">
                          <UserRound className="size-4 shrink-0" />
                          <span>{link.username}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => openLink(link)}
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("companyLinks.open")}</TooltipContent>
                    </Tooltip>

                    {link.username ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-xl"
                            onClick={() =>
                              void copyText(
                                link.username || "",
                                t("companyLinks.usernameCopied"),
                              )
                            }
                          >
                            <Copy className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("companyLinks.copyUsername")}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}

                    {canManage && link.hasPassword ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="rounded-xl"
                              onClick={() => void showPassword(link)}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("companyLinks.showPassword")}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="rounded-xl"
                              onClick={() => void copyPassword(link)}
                            >
                              <LockKeyhole className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("companyLinks.copyPassword")}
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : null}

                    {canManage ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="rounded-xl"
                              onClick={() => startEditing(link)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("common.edit")}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                              onClick={() => setLinkPendingDelete(link)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("common.delete")}</TooltipContent>
                        </Tooltip>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader className="text-right">
            <DialogTitle>
              {editing ? t("companyLinks.editLink") : t("companyLinks.addLink")}
            </DialogTitle>
            <DialogDescription>
              أضف رابطًا داخليًا أو خارجيًا للفريق مع بيانات الدخول عند الحاجة.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-link-name">{t("companyLinks.linkName")}</Label>
              <Input
                id="company-link-name"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-link-url">{t("companyLinks.url")}</Label>
              <Input
                id="company-link-url"
                value={form.url}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    url: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-link-username">
                {t("companyLinks.username")}
              </Label>
              <Input
                id="company-link-username"
                value={form.username}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    username: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-link-password">
                {editing
                  ? t("companyLinks.passwordPlaceholderEdit")
                  : t("companyLinks.password")}
              </Label>
              <Input
                id="company-link-password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{t("companyLinks.openMode")}</Label>
              <Select
                value={form.openMode}
                onValueChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    openMode: value === "in_app" ? "in_app" : "new_tab",
                  }))
                }
              >
                <SelectTrigger aria-label={String(t("companyLinks.openMode"))}>
                  <SelectValue placeholder={t("companyLinks.openMode")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_tab">
                    {t("companyLinks.newTab")}
                  </SelectItem>
                  <SelectItem value="in_app">
                    {t("companyLinks.inApp")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void saveLink()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setShownPassword("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>{t("companyLinks.password")}</DialogTitle>
            <DialogDescription>
              يمكنك عرض كلمة المرور أو نسخها لاستخدامها خارج المنصة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="company-link-shown-password">
              {t("companyLinks.password")}
            </Label>
            <Input
              id="company-link-shown-password"
              value={shownPassword}
              readOnly
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void copyText(shownPassword, t("companyLinks.passwordCopied"))
              }
            >
              <Copy className="size-4" />
              {t("companyLinks.copy")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPasswordDialogOpen(false);
                setShownPassword("");
              }}
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(linkPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setLinkPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("companyLinks.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الرابط
              {linkPendingDelete ? ` "${linkPendingDelete.name}" ` : " "}
              بشكل نهائي من قائمة الشركة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => void deleteLink()}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BusinessPageShell>
  );
};

export default CompanyLinks;
