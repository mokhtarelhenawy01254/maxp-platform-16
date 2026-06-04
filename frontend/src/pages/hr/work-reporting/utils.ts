import { WorkReportField, WorkReportFieldValue, WorkReportForm } from "./types";

export const getTodayIsoDate = () => new Date().toISOString().split("T")[0] || "";

export const getRelativeIsoDate = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0] || "";
};

export const formatArabicDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatArabicDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const slugifyFieldKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

export const toNumberOrNull = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const evaluateFormulaValue = (
  formula: string,
  numericContext: Record<string, number | null | undefined>,
) => {
  const expression = formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (token) => {
    if (!Object.prototype.hasOwnProperty.call(numericContext, token)) {
      return token;
    }

    const candidate = numericContext[token];
    return Number.isFinite(candidate) ? String(candidate) : "0";
  });

  if (/[^0-9+\-*/().\s]/.test(expression)) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(result) ? Number(result.toFixed(4)) : null;
  } catch (error) {
    return null;
  }
};

export const formatMetricValue = (
  value: number | string | null | undefined,
  dataType?: WorkReportField["dataType"],
) => {
  if (value === undefined || value === null || value === "") return "—";

  if (typeof value === "number") {
    if (dataType === "PERCENT") {
      return `${value.toFixed(2)}%`;
    }

    return value.toLocaleString("ar-EG", {
      maximumFractionDigits: dataType === "NUMBER" ? 2 : 4,
    });
  }

  return value;
};

export const truncateText = (value?: string | null, limit = 80) => {
  if (!value) return "—";
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};

export const valueFromRawInput = (
  field: WorkReportField,
  rawValue: unknown,
): WorkReportFieldValue => {
  if (field.dataType === "SELECT") {
    const values = Array.isArray(rawValue)
      ? rawValue.map((item) => String(item))
      : String(rawValue || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    return {
      valueText: values.length ? values.join("، ") : null,
      valueNumber: null,
      valueJson: values,
      displayValue: values.length ? values.join("، ") : "—",
    };
  }

  if (field.dataType === "NUMBER" || field.dataType === "PERCENT") {
    const valueNumber = toNumberOrNull(rawValue);
    return {
      valueText: valueNumber === null ? null : String(valueNumber),
      valueNumber,
      valueJson: null,
      displayValue: valueNumber === null ? "—" : formatMetricValue(valueNumber, field.dataType),
    };
  }

  const valueText = String(rawValue || "").trim();
  return {
    valueText: valueText || null,
    valueNumber: null,
    valueJson: null,
    displayValue: valueText || "—",
  };
};

export const buildLiveValuesByKey = (
  form: WorkReportForm,
  seedValuesByKey: Record<string, WorkReportFieldValue>,
  manualValues: Record<string, unknown>,
) => {
  const nextValues: Record<string, WorkReportFieldValue> = { ...seedValuesByKey };

  form.fields.forEach((field) => {
    if (field.sourceType === "MANUAL") {
      nextValues[field.key] = valueFromRawInput(field, manualValues[field.id || field.key]);
    }
  });

  const numericContext: Record<string, number | null> = {};

  form.fields.forEach((field) => {
    const currentValue = nextValues[field.key];
    if (!currentValue) return;

    if (field.dataType === "NUMBER" || field.dataType === "PERCENT") {
      numericContext[field.key] = currentValue.valueNumber ?? toNumberOrNull(currentValue.valueText);
      return;
    }

    numericContext[field.key] = toNumberOrNull(currentValue.valueText);
  });

  form.fields.forEach((field) => {
    if (field.sourceType !== "CALCULATED" || !field.formula) return;
    const valueNumber = evaluateFormulaValue(field.formula, numericContext);
    nextValues[field.key] = {
      valueText: valueNumber === null ? null : String(valueNumber),
      valueNumber,
      valueJson: null,
      displayValue: valueNumber === null ? "—" : formatMetricValue(valueNumber, field.dataType),
    };
    numericContext[field.key] = valueNumber;
  });

  return nextValues;
};
