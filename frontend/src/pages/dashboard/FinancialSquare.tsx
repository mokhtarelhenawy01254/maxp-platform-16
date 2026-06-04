type Props = {
  formattedValue: string;
  isRtl: boolean;
  label: string;
};

export default function FinancialSquare({
  formattedValue,
  isRtl,
  label,
}: Props) {
  return (
    <div className="flex flex-col rounded-lg bg-white p-4 shadow-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 text-lg font-semibold tabular-nums">
        {formattedValue}
      </span>
    </div>
  );
}
