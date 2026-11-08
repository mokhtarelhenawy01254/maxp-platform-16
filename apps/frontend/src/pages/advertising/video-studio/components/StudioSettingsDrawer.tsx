// Settings drawer: BYOK (merchant's own Higgsfield key) + wallet status
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../../../components/ui/sheet";
import { formatEgp } from "../presets";
import { useByokMutations, useStudioConfig } from "../useVideoStudioQueries";

interface StudioSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StudioSettingsDrawer: React.FC<StudioSettingsDrawerProps> = ({ open, onOpenChange }) => {
  const { data: config } = useStudioConfig();
  const byok = useByokMutations();
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");

  const save = () => {
    if (!keyId.trim() || !secret.trim()) return;
    byok.save.mutate(
      { keyId: keyId.trim(), secret: secret.trim() },
      {
        onSuccess: () => {
          setKeyId("");
          setSecret("");
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border/70">
          <SheetTitle className="text-sm">إعدادات الاستوديو</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {/* Wallet */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">الرصيد</h3>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
              <div>
                <p className="text-lg font-bold tabular-nums">{formatEgp(config?.walletBalance ?? 0)}</p>
                <p className="text-[11px] text-muted-foreground">محفظة الشركة — الخصم تلقائي لكل توليد</p>
              </div>
              <Link
                to="/payments"
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <ExternalLink className="size-3.5" />
                شحن
              </Link>
            </div>
          </section>

          {/* BYOK */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">مفتاحك الخاص (Higgsfield)</h3>
            {config?.byok.configured ? (
              <div className="space-y-2 rounded-lg border border-border bg-card px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <KeyRound className="size-3.5 text-emerald-600" />
                      مفعّل
                    </p>
                    <p dir="ltr" className="truncate text-[11px] tabular-nums text-muted-foreground">
                      {config.byok.masked}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => byok.remove.mutate()}
                    disabled={byok.remove.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">كل التوليد على حسابك لدى Higgsfield مباشرة — بدون خصم من المحفظة</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                <p className="text-[11px] text-muted-foreground">
                  عندك حساب لدى Higgsfield؟ حط مفتاحك (Key ID و Secret من console.higgsfield.ai) والتوليد كله على حسابك بلا أي رسوم من المنصة.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="byok-key-id" className="text-xs">Key ID</Label>
                  <Input id="byok-key-id" value={keyId} onChange={(e) => setKeyId(e.target.value)} dir="ltr" placeholder="hf_..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="byok-secret" className="text-xs">Secret</Label>
                  <Input id="byok-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} dir="ltr" />
                </div>
                <Button size="sm" onClick={save} disabled={!keyId.trim() || !secret.trim() || byok.save.isPending}>
                  {byok.save.isPending && <Loader2 className="size-4 animate-spin" />}
                  حفظ المفتاح
                </Button>
              </div>
            )}
          </section>

          {config?.simulation && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
              وضع المحاكاة شغال حاليًا (مفيش مفتاح مركزي) — المخرجات تجريبية بلا أي تكلفة.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
