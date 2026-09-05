export default function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5 transition-colors dark:border-slate-800/80 dark:bg-slate-900/60">
      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="mt-0.5 block truncate text-xs font-black text-slate-950 dark:text-white">
        {value}
      </span>
    </div>
  );
}
