import { cn } from "../../../lib/utils"

function clampPercentage(value) {
  const numericValue = Number(value || 0)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(numericValue, 100))
}

function getUsageTone(percentage) {
  if (percentage >= 100) {
    return {
      bar: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      track: "bg-rose-100 dark:bg-rose-950/40",
    }
  }
  if (percentage >= 80) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      track: "bg-amber-100 dark:bg-amber-950/40",
    }
  }
  return {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    track: "bg-emerald-100 dark:bg-emerald-950/40",
  }
}

export function UsageBar({ percentage }) {
  const clamped = clampPercentage(percentage)
  const tone = getUsageTone(clamped)

  return (
    <div className={cn("mt-3 h-2.5 overflow-hidden rounded-full", tone.track)}>
      <div
        className={cn("h-full rounded-full transition-all", tone.bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { getUsageTone, clampPercentage }
