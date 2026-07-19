export default function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950">
      <span className="block text-[10px] font-black text-slate-400">{label}</span>
      <span className="mt-0.5 block truncate text-xs font-black text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}
