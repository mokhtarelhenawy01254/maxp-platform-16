import { ReactNode } from "react";
import { REPORT_STATUS_MAP, PAYMENT_METHOD_LABEL } from "./shared";

export const fmt = (n: number) => Number(n || 0).toFixed(2);
const tdCls = "py-2.5 px-3 border-b border-border/60";

export function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
      <p className={`text-xl font-bold font-mono tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-[11px] font-medium">
              {headers.map(h => (
                <th key={h} className="text-right py-2.5 px-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const EmptyReport = () => (
  <div className="bg-card border border-border/70 rounded-xl py-12 text-center text-muted-foreground text-xs">
    لا توجد بيانات مسجلة في هذا التقرير للفترة المحددة
  </div>
);

export function RevenueView({ d }: { d: any }) {
  if (!d) return <EmptyReport />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="إجمالي الفواتير" value={fmt(d.totals?.billed)} color="text-primary" />
        <KpiCard label="الخصومات" value={fmt(d.totals?.discounts)} color="text-amber-600 dark:text-amber-400" />
        <KpiCard label="المحصّل" value={fmt(d.totals?.collected)} color="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="المتبقي" value={fmt(d.totals?.outstanding)} color="text-destructive" />
      </div>
      <div>
        <h3 className="font-semibold text-xs text-foreground mb-2">حسب الطبيب</h3>
        {!d.byDoctor?.length ? <EmptyReport /> : (
          <DataTable headers={["الطبيب", "الفوترة", "الخصم", "المحصّل", "المتبقي", "فواتير"]}>
            {d.byDoctor.map((r: any) => (
              <tr key={r.id || "none"} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdCls} font-medium text-foreground`}>{r.name}</td>
                <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{fmt(r.billed)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`}>{fmt(r.discounts)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium`}>{fmt(r.collected)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-destructive font-medium`}>{fmt(r.outstanding)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{r.invoiceCount}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-xs text-foreground mb-2">حسب الخدمة</h3>
        {!d.byService?.length ? <EmptyReport /> : (
          <DataTable headers={["الخدمة", "الفوترة", "الخصم", "المحصّل", "المتبقي", "فواتير"]}>
            {d.byService.map((r: any) => (
              <tr key={r.id || "none"} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdCls} font-medium text-foreground`}>{r.name}</td>
                <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{fmt(r.billed)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`}>{fmt(r.discounts)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium`}>{fmt(r.collected)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-destructive font-medium`}>{fmt(r.outstanding)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{r.invoiceCount}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </div>
  );
}

export function ActualVsExpectedView({ d }: { d: any }) {
  if (!d) return <EmptyReport />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="المتوقع" value={fmt(d.totals?.expected)} color="text-primary" />
        <KpiCard label="الفعلي" value={fmt(d.totals?.actual)} color="text-emerald-600 dark:text-emerald-400" />
        <KpiCard
          label="الفرق (كشف تسريب)"
          value={fmt(d.totals?.variance)}
          color={d.totals?.variance < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}
        />
      </div>
      {!d.rows?.length ? <EmptyReport /> : (
        <DataTable headers={["التاريخ", "المتوقع", "الفعلي", "الفرق"]}>
          {d.rows.map((r: any) => (
            <tr key={r.date} className="hover:bg-muted/30 transition-colors">
              <td className={`${tdCls} font-mono tabular-nums text-foreground`} dir="ltr">{r.date}</td>
              <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{fmt(r.expected)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium`}>{fmt(r.actual)}</td>
              <td className={`${tdCls} font-mono tabular-nums font-semibold ${r.variance < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                {fmt(r.variance)}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

export function CommissionsView({ d }: { d: any }) {
  if (!d) return <EmptyReport />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="الإجمالي" value={fmt(d.totals?.gross)} color="text-primary" />
        <KpiCard label="العمولات" value={fmt(d.totals?.commission)} color="text-amber-600 dark:text-amber-400" />
        <KpiCard label="الصافي" value={fmt(d.totals?.net)} color="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="غير معتمدة" value={String(d.totals?.unapprovedCount || 0)} color="text-destructive" />
      </div>
      {!d.rows?.length ? <EmptyReport /> : (
        <DataTable headers={["الطبيب", "التخصص", "الفرع", "الإجمالي", "النسبة %", "العمولة", "الصافي", "فواتير", "حالة التقارير", "غير معتمدة"]}>
          {d.rows.map((r: any) => (
            <tr key={r.doctorId} className="hover:bg-muted/30 transition-colors">
              <td className={`${tdCls} font-medium text-foreground`}>{r.doctorName}</td>
              <td className={`${tdCls} text-muted-foreground`}>{r.specialty || "—"}</td>
              <td className={`${tdCls} text-muted-foreground`}>{r.branchName}</td>
              <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{fmt(r.gross)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{r.commissionRate}%</td>
              <td className={`${tdCls} font-mono tabular-nums text-amber-600 dark:text-amber-400 font-medium`}>{fmt(r.commission)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold`}>{fmt(r.net)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{r.invoiceCount}</td>
              <td className={tdCls}>
                {r.byReportStatus?.map((s: any, i: number) => (
                  <span key={i} className="inline-block mx-0.5 px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                    {REPORT_STATUS_MAP[s.status]?.label || (s.status === "NONE" ? "بدون تقرير" : s.status)}: {s.count}
                  </span>
                ))}
              </td>
              <td className={`${tdCls} font-mono tabular-nums text-destructive font-medium`}>{r.unapprovedCount}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

export function DuesView({ d }: { d: any }) {
  if (!d) return <EmptyReport />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="إجمالي المستحق" value={fmt(d.totals?.outstanding)} color="text-destructive" />
        <KpiCard label="المسدد" value={fmt(d.totals?.paidBackTotal)} color="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="فواتير مفتوحة" value={String(d.totals?.invoiceCount || 0)} color="text-primary" />
        <KpiCard label="عملاء / مرضى" value={String(d.totals?.patientCount || 0)} color="text-purple-600 dark:text-purple-400" />
      </div>
      {!d.patients?.length ? <EmptyReport /> : (
        <div className="space-y-2">
          {d.patients.map((p: any) => (
            <details key={p.patientId} className="bg-card border border-border/70 rounded-xl p-3 shadow-sm group">
              <summary className="cursor-pointer flex flex-wrap justify-between items-center gap-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground">{p.patientName}</span>
                  <span className="text-[10px] text-muted-foreground mr-2 font-mono tabular-nums" dir="ltr">{p.patientPhone || "—"}</span>
                </div>
                <div className="flex gap-3 text-xs font-mono tabular-nums">
                  <span>المستحق: <strong className="text-destructive">{fmt(p.totalOutstanding)}</strong></span>
                  <span>المسدد: <strong className="text-emerald-600 dark:text-emerald-400">{fmt(p.paidBackTotal)}</strong></span>
                  <span className="text-muted-foreground">فواتير: {p.invoiceCount}</span>
                </div>
              </summary>
              <div className="mt-3 pt-2 border-t border-border/60">
                <DataTable headers={["رقم الفاتورة", "الإجمالي", "الخصم", "الصافي", "المسدد", "المتبقي", "الحالة", "الاستحقاق"]}>
                  {p.invoices?.map((inv: any) => (
                    <tr key={inv.invoiceNumber} className="hover:bg-muted/30 transition-colors">
                      <td className={`${tdCls} font-mono tabular-nums text-foreground`} dir="ltr">{inv.invoiceNumber}</td>
                      <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{fmt(inv.total)}</td>
                      <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`}>{fmt(inv.discount)}</td>
                      <td className={`${tdCls} font-mono tabular-nums text-foreground font-medium`}>{fmt(inv.net)}</td>
                      <td className={`${tdCls} font-mono tabular-nums text-emerald-600 dark:text-emerald-400`}>{fmt(inv.amountPaid)}</td>
                      <td className={`${tdCls} font-mono tabular-nums text-destructive font-semibold`}>{fmt(inv.remaining)}</td>
                      <td className={tdCls}>{inv.status === "UNPAID" ? "غير مسددة" : "مسدد جزئياً"}</td>
                      <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`} dir="ltr">{inv.dueDate || "—"}</td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export function RefundsView({ d }: { d: any }) {
  if (!d) return <EmptyReport />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiCard label="إجمالي الاستردادات" value={fmt(d.summary?.totalPayback)} color="text-destructive" />
        <KpiCard label="عدد العمليات" value={String(d.summary?.count || 0)} color="text-primary" />
      </div>
      {d.summary?.cashiers?.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs text-foreground mb-2">حسب الكاشير</h3>
          <DataTable headers={["الكاشير", "الإجمالي", "العمليات"]}>
            {d.summary.cashiers.map((c: any) => (
              <tr key={c.cashierName} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdCls} font-medium text-foreground`}>{c.cashierName}</td>
                <td className={`${tdCls} font-mono tabular-nums text-destructive font-semibold`}>{fmt(c.total)}</td>
                <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{c.count}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
      {!d.rows?.length ? <EmptyReport /> : (
        <DataTable headers={["رقم الفاتورة", "العميل", "الهاتف", "المبلغ", "طريقة الدفع", "السبب", "الكاشير", "التاريخ"]}>
          {d.rows.map((r: any) => (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <td className={`${tdCls} font-mono tabular-nums text-foreground`} dir="ltr">{r.invoiceNumber || "—"}</td>
              <td className={`${tdCls} font-medium text-foreground`}>{r.patientName || "—"}</td>
              <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`} dir="ltr">{r.patientPhone || "—"}</td>
              <td className={`${tdCls} font-mono tabular-nums text-destructive font-semibold`}>{fmt(r.amount)}</td>
              <td className={`${tdCls} text-foreground`}>{PAYMENT_METHOD_LABEL[r.method] || r.method}</td>
              <td className={`${tdCls} text-muted-foreground`}>{r.reason || "—"}</td>
              <td className={`${tdCls} text-foreground`}>{r.cashierName}</td>
              <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`} dir="ltr">{r.paidAt}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

export function CashierDailyView({ d }: { d: any }) {
  if (!d) return <EmptyReport />;
  const shiftLabel = (s: string) => s === "CLOSED" ? "مغلق" : s === "OPEN" ? "مفتوح" : "لا يوجد";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="المحصّل" value={fmt(d.totals?.totalCollected)} color="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="الخصومات" value={fmt(d.totals?.discounts)} color="text-amber-600 dark:text-amber-400" />
        <KpiCard label="الاستردادات" value={fmt(d.totals?.paybacks)} color="text-destructive" />
        <KpiCard label="الصافي" value={fmt(d.totals?.netCollected)} color="text-primary" />
      </div>
      {!d.rows?.length ? <EmptyReport /> : (
        <DataTable headers={["التاريخ", "الكاشير", "طرق الدفع", "المحصّل", "العمليات", "خصم", "استرداد", "الصافي", "الرصيد الافتتاحي", "الرصيد الختامي", "الوردية"]}>
          {d.rows.map((r: any) => (
            <tr key={`${r.date}-${r.cashierName}`} className="hover:bg-muted/30 transition-colors">
              <td className={`${tdCls} font-mono tabular-nums text-foreground`} dir="ltr">{r.date}</td>
              <td className={`${tdCls} font-medium text-foreground`}>{r.cashierName}</td>
              <td className={tdCls}>
                {!r.byMethod?.length ? "—" : r.byMethod.map((m: any, i: number) => (
                  <span key={i} className="inline-block mx-0.5 px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-mono tabular-nums">
                    {PAYMENT_METHOD_LABEL[m.method] || m.method}: {fmt(m.amount)} ({m.count})
                  </span>
                ))}
              </td>
              <td className={`${tdCls} font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold`}>{fmt(r.totalCollected)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-foreground`}>{r.totalCount}</td>
              <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`}>{fmt(r.discounts)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-destructive`}>{fmt(r.paybacks)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-primary font-bold`}>{fmt(r.netCollected)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`}>{fmt(r.openingBalance)}</td>
              <td className={`${tdCls} font-mono tabular-nums text-muted-foreground`}>{r.closingBalance != null ? fmt(r.closingBalance) : "—"}</td>
              <td className={tdCls}>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  r.shiftStatus === "OPEN" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground"
                }`}>
                  {shiftLabel(r.shiftStatus)}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
