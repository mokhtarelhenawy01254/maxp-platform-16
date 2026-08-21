import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppSurfaceCard } from "../whatsapp/components/WhatsAppPageShell";
import {
  whatsappAIService,
  type WhatsAppAIIgnoreEntry,
} from "../../services/whatsappAI";
import { useAuth } from "../../hooks/useAuthSimple";

interface AIIgnoreListPageProps {
  companyId?: string;
}

const AIIgnoreListPage: React.FC<AIIgnoreListPageProps> = ({ companyId: propCompanyId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = propCompanyId || user?.companyId || "";

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WhatsAppAIIgnoreEntry | null>(null);

  // ----- Queries -----
  const listQuery = useQuery({
    queryKey: ["whatsapp-ai-ignore-list", companyId],
    queryFn: () => whatsappAIService.list(companyId),
    enabled: Boolean(companyId),
  });

  const statsQuery = useQuery({
    queryKey: ["whatsapp-ai-ignore-list-stats", companyId],
    queryFn: () => whatsappAIService.stats(companyId),
    enabled: Boolean(companyId),
    refetchInterval: 30_000,
  });

  // ----- Mutations -----
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["whatsapp-ai-ignore-list", companyId] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp-ai-ignore-list-stats", companyId] });
  };

  const removeMutation = useMutation({
    mutationFn: (entry: WhatsAppAIIgnoreEntry) =>
      whatsappAIService.remove(entry.id, companyId),
    onSuccess: invalidateAll,
  });

  const entries = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  return (
    <div className="space-y-4">
      {!companyId && (
        <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("aiHub.ignoreList.tabLabel")}</AlertTitle>
          <AlertDescription>{t("aiHub.ignoreList.companyRequired")}</AlertDescription>
        </Alert>
      )}
      {companyId && (
        <>
      {/* --- Header card --- */}
      <WhatsAppSurfaceCard
        title={t("aiHub.ignoreList.title")}
        description={t("aiHub.ignoreList.description")}
      >
        <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <Bot className="size-4 text-[color:var(--color-primary)]" />
          <AlertTitle>{t("aiHub.ignoreList.ignoreListTitle")}</AlertTitle>
          <AlertDescription>
            {t("aiHub.ignoreList.ignoreListHelp")}
          </AlertDescription>
        </Alert>
      </WhatsAppSurfaceCard>

      {/* --- Stats card --- */}
      <WhatsAppSurfaceCard
        title={t("aiHub.ignoreList.statsTitle")}
        className="border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] shadow-none"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label={t("aiHub.ignoreList.totalLabel")}
            value={statsQuery.data?.total ?? entries.length}
            loading={statsQuery.isLoading && !statsQuery.data}
          />
          <StatTile
            label={t("aiHub.ignoreList.statsToday")}
            value={statsQuery.data?.skippedToday ?? 0}
            loading={statsQuery.isLoading && !statsQuery.data}
          />
          <StatTile
            label={t("aiHub.ignoreList.statsThisWeek")}
            value={statsQuery.data?.skippedThisWeek ?? 0}
            loading={statsQuery.isLoading && !statsQuery.data}
          />
          <StatTile
            label={t("aiHub.ignoreList.statsAllTime")}
            value={statsQuery.data?.skippedAllTime ?? 0}
            loading={statsQuery.isLoading && !statsQuery.data}
          />
        </div>
      </WhatsAppSurfaceCard>

      {/* --- List + actions --- */}
      <WhatsAppSurfaceCard
        title={t("aiHub.ignoreList.ignoreListTitle")}
        description={t("aiHub.ignoreList.ignoreListHelp")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]"
              onClick={() => setBulkDialogOpen(true)}
            >
              <ClipboardList className="size-4" />
              {t("aiHub.ignoreList.bulkImport")}
            </Button>
            <Button
              className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="size-4" />
              {t("aiHub.ignoreList.addNumber")}
            </Button>
          </div>
        }
      >
        {listQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : entries.length === 0 ? (
          <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
            <Users className="size-4 text-[color:var(--color-primary)]" />
            <AlertTitle>{t("aiHub.ignoreList.ignoreListTitle")}</AlertTitle>
            <AlertDescription>{t("aiHub.ignoreList.empty")}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <IgnoreEntryRow
                key={entry.id}
                entry={entry}
                onRemove={() => setConfirmDelete(entry)}
                removing={removeMutation.isPending && removeMutation.variables?.id === entry.id}
              />
            ))}
          </div>
        )}
      </WhatsAppSurfaceCard>

      {/* --- Add dialog --- */}
      <AddNumberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        companyId={companyId}
        onSuccess={() => {
          setAddDialogOpen(false);
          invalidateAll();
        }}
      />

      {/* --- Bulk import dialog --- */}
      <BulkImportDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        companyId={companyId}
        onSuccess={() => {
          setBulkDialogOpen(false);
          invalidateAll();
        }}
      />

      {/* --- Confirm delete --- */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("aiHub.ignoreList.confirmRemove")}</DialogTitle>
            <DialogDescription>
              {confirmDelete?.phoneNumber}
              {confirmDelete?.label ? ` â€” ${confirmDelete.label}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  removeMutation.mutate(confirmDelete, {
                    onSettled: () => setConfirmDelete(null),
                  });
                }
              }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("aiHub.ignoreList.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};

export default AIIgnoreListPage;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatTile: React.FC<{ label: string; value: number; loading?: boolean }> = ({
  label,
  value,
  loading,
}) => (
  <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted-foreground)]">
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold text-[color:var(--color-foreground)]" dir="ltr">
      {loading ? <Loader2 className="size-4 animate-spin" /> : value}
    </p>
  </div>
);

const IgnoreEntryRow: React.FC<{
  entry: WhatsAppAIIgnoreEntry;
  onRemove: () => void;
  removing: boolean;
}> = ({ entry, onRemove, removing }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-3"
      data-testid="wa-ignore-row"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-600">
          <Phone className="size-4" />
        </div>
        <div className="space-y-0.5">
          <p
            className="text-sm font-medium text-[color:var(--color-foreground)]"
            dir="ltr"
          >
            +{entry.phoneNumber}
          </p>
          {entry.label ? (
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              {entry.label}
            </p>
          ) : null}
          {entry.notes ? (
            <p className="text-xs italic text-[color:var(--color-muted-foreground)]">
              {entry.notes}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] hover:bg-[color:var(--color-card)]"
        onClick={onRemove}
        disabled={removing}
      >
        {removing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
        {t("aiHub.ignoreList.remove")}
      </Button>
    </div>
  );
};

const AddNumberDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}> = ({ open, onOpenChange, companyId, onSuccess }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      whatsappAIService.add(companyId, phone.trim(), label.trim() || undefined, notes.trim() || undefined),
    onSuccess: () => {
      setPhone("");
      setLabel("");
      setNotes("");
      setError(null);
      onSuccess();
    },
    onError: (err: any) => {
      setError(
        err?.response?.data?.detail || err?.message || "Failed to add number",
      );
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("aiHub.ignoreList.addNumber")}</DialogTitle>
          <DialogDescription>
            {t("aiHub.ignoreList.ignoreListHelp")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wa-ignore-phone">
              {t("aiHub.ignoreList.phoneNumber")}
            </Label>
            <Input
              id="wa-ignore-phone"
              dir="ltr"
              placeholder={t("aiHub.ignoreList.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-ignore-label">
              {t("aiHub.ignoreList.label")}
            </Label>
            <Input
              id="wa-ignore-label"
              placeholder={t("aiHub.ignoreList.labelPlaceholder")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-ignore-notes">
              {t("aiHub.ignoreList.notes")}
            </Label>
            <Input
              id="wa-ignore-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error ? (
            <Alert className="rounded-2xl border-rose-300 bg-rose-50 text-rose-700">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-[color:var(--business-success)] text-white hover:brightness-90"
            onClick={() => mutation.mutate()}
            disabled={!phone.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BulkImportDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}> = ({ open, onOpenChange, companyId, onSuccess }) => {
  const { t } = useTranslation();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parseItems = () => {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [phonePart, ...rest] = line.split(",").map((s) => s.trim());
        return {
          companyId,
          phoneNumber: phonePart || "",
          label: rest.join(",") || undefined,
        };
      })
      .filter((item) => item.phoneNumber);
  };

  const mutation = useMutation({
    mutationFn: () => whatsappAIService.bulkAdd(parseItems()),
    onSuccess: (result) => {
      setRaw("");
      setError(null);
      onSuccess();
      // Surface result counts via a transient alert inside the dialog would
      // require additional state; the parent already invalidates the list
      // and stats. We rely on the visible count change to confirm.
      // eslint-disable-next-line no-console
      console.info(
        `[WhatsApp AI Ignore] inserted=${result.inserted} skipped=${result.skipped}`,
      );
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || err?.message || "Bulk import failed");
    },
  });

  const items = parseItems();
  const count = items.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setRaw("");
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("aiHub.ignoreList.bulkImportTitle")}</DialogTitle>
          <DialogDescription>
            {t("aiHub.ignoreList.bulkImportHelp")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            dir="ltr"
            rows={8}
            placeholder={t("aiHub.ignoreList.bulkImportExample")}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-[color:var(--color-muted-foreground)]">
            {count} {count === 1 ? "entry" : "entries"} ready
          </p>
          {error ? (
            <Alert className="rounded-2xl border-rose-300 bg-rose-50 text-rose-700">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-[color:var(--business-success)] text-white hover:brightness-90"
            onClick={() => mutation.mutate()}
            disabled={count === 0 || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Import {count}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
