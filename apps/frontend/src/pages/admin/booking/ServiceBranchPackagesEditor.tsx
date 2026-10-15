import { Building2, Plus, Trash2 } from "lucide-react";
import { BookingBranch } from "./shared";

export interface BranchPkg {
  count: number;
  price: number;
}

interface Props {
  branches: BookingBranch[];
  branchPkgs: Record<string, BranchPkg[]>;
  onToggleBranch: (branchId: string) => void;
  onAddPkg: (branchId: string) => void;
  onUpdPkg: (branchId: string, i: number, k: "count" | "price", v: number) => void;
  onDelPkg: (branchId: string, i: number) => void;
}

export default function ServiceBranchPackagesEditor({
  branches,
  branchPkgs,
  onToggleBranch,
  onAddPkg,
  onUpdPkg,
  onDelPkg,
}: Props) {
  const hasBranches = Object.keys(branchPkgs).length > 0;

  return (
    <div className="border-t border-border/60 pt-3">
      <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        <span>الفروع المقدمة فيها الخدمة والباقات</span>
      </label>
      {!hasBranches && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
          يرجى تحديد فرع واحد على الأقل لتقديم الخدمة
        </p>
      )}
      <div className="space-y-2.5 max-h-60 overflow-y-auto border border-border/70 rounded-xl p-2.5 bg-muted/20">
        {branches
          .filter((b) => b.isActive)
          .map((b) => {
            const checked = !!branchPkgs[b.id];
            return (
              <div
                key={b.id}
                className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-xs"
              >
                <label className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleBranch(b.id)}
                    className="rounded border-border text-primary focus:ring-primary/40 accent-primary"
                  />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {b.name}
                  </span>
                </label>
                {checked && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50 bg-muted/10 space-y-2">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      باقات الجلسات الخاصة بالفرع:
                    </p>
                    {(branchPkgs[b.id] || []).map((pkg, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            جلسات:
                          </span>
                          <input
                            type="number"
                            min={1}
                            className="w-16 border border-border/70 bg-card text-foreground rounded-lg px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
                            placeholder="عدد"
                            value={pkg.count}
                            onChange={(e) =>
                              onUpdPkg(b.id, i, "count", Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            السعر:
                          </span>
                          <input
                            type="number"
                            min={0}
                            className="w-24 border border-border/70 bg-card text-foreground rounded-lg px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
                            placeholder="ج.م"
                            value={pkg.price}
                            onChange={(e) =>
                              onUpdPkg(b.id, i, "price", Number(e.target.value))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => onDelPkg(b.id, i)}
                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => onAddPkg(b.id)}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة باقة جديدة</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
