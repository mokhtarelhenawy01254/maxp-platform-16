const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function roundToTwo(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function toMinorUnits(value) {
  return Math.round(roundToTwo(value) * 100);
}

function fromMinorUnits(value) {
  return roundToTwo(value / 100);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeProgress(currentValue, targetValue) {
  const target = toNumber(targetValue);
  const current = toNumber(currentValue);

  if (target <= 0) {
    return 0;
  }

  return Math.round(clamp((current / target) * 100, 0, 100));
}

function parseWorkDays(rawValue) {
  if (!rawValue) {
    return [...DEFAULT_WORK_DAYS];
  }

  try {
    const parsedValue =
      typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

    if (!Array.isArray(parsedValue)) {
      return [...DEFAULT_WORK_DAYS];
    }

    const normalizedDays = parsedValue
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

    return normalizedDays.length > 0
      ? Array.from(new Set(normalizedDays)).sort((left, right) => left - right)
      : [...DEFAULT_WORK_DAYS];
  } catch (error) {
    return [...DEFAULT_WORK_DAYS];
  }
}

function toDateKey(date) {
  return new Date(date).toISOString().split("T")[0];
}

function buildWorkdayDates(startDate, endDate, workDays) {
  const dates = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);

  cursor.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    if (workDays.includes(cursor.getUTCDay())) {
      dates.push(new Date(cursor));
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function distributeTargetAcrossDates(totalValue, dates) {
  if (!Array.isArray(dates) || dates.length === 0) {
    return [];
  }

  const totalMinorUnits = toMinorUnits(totalValue);
  const baseValue = Math.floor(totalMinorUnits / dates.length);
  let remainingUnits = totalMinorUnits - baseValue * dates.length;

  return dates.map((date) => {
    const extraUnit = remainingUnits > 0 ? 1 : 0;
    remainingUnits -= extraUnit;

    return {
      date: new Date(date),
      targetValue: fromMinorUnits(baseValue + extraUnit),
    };
  });
}

function deriveGoalStatus({
  currentValue,
  targetValue,
  explicitStatus,
  hasChildren = false,
  children = [],
}) {
  if (explicitStatus === "CANCELLED") {
    return "CANCELLED";
  }

  const progress = computeProgress(currentValue, targetValue);
  if (progress >= 100) {
    return "COMPLETED";
  }

  if (hasChildren) {
    const hasActiveChildren = children.some((child) =>
      ["IN_PROGRESS", "COMPLETED"].includes(child.status),
    );

    if (hasActiveChildren) {
      return "IN_PROGRESS";
    }
  }

  if (toNumber(currentValue) > 0 || progress > 0) {
    return "IN_PROGRESS";
  }

  return "PENDING";
}

module.exports = {
  DEFAULT_WORK_DAYS,
  buildWorkdayDates,
  clamp,
  computeProgress,
  deriveGoalStatus,
  distributeTargetAcrossDates,
  fromMinorUnits,
  parseWorkDays,
  roundToTwo,
  toDateKey,
  toMinorUnits,
  toNumber,
};
