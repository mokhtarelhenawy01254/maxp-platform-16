import React, { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";

export interface DateInputProps {
  value?: string | null; // ISO 'YYYY-MM-DD' أو ''
  onChange: (iso: string) => void; // '' لما القيمة تبقى غير مكتملة
  className?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  error?: string | null;
}

const isoToDisplay = (iso?: string | null): string => {
  if (!iso || typeof iso !== "string") return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const displayToIso = (
  display: string,
  min?: string,
  max?: string,
): { valid: boolean; iso: string } => {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { valid: false, iso: "" };

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) return { valid: false, iso: "" };
  if (month < 1 || month > 12) return { valid: false, iso: "" };

  const testDate = new Date(year, month - 1, day);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return { valid: false, iso: "" };
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${year}-${pad(month)}-${pad(day)}`;

  if (min && iso < min) return { valid: false, iso: "" };
  if (max && iso > max) return { valid: false, iso: "" };

  return { valid: true, iso };
};

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  className = "",
  disabled = false,
  required = false,
  min,
  max,
  placeholder = "DD/MM/YYYY",
  id,
  name,
  error,
}) => {
  const [displayText, setDisplayText] = useState<string>(() =>
    isoToDisplay(value),
  );
  const [internalError, setInternalError] = useState<boolean>(false);
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setDisplayText(isoToDisplay(value));
      setInternalError(false);
    } else if (!value) {
      setDisplayText("");
      setInternalError(false);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Normalize Eastern Arabic numerals to Latin
    const normalized = raw.replace(/[٠-٩]/g, (d) =>
      "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString(),
    );
    // Keep digits only, max 8 digits (DDMMYYYY)
    const digits = normalized.replace(/\D/g, "").slice(0, 8);

    let formatted = digits;
    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    // Preserve slash if user manually entered it
    if (digits.length === 2 && raw.endsWith("/")) {
      formatted = `${digits}/`;
    } else if (digits.length === 4 && raw.endsWith("/")) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}/`;
    }

    setDisplayText(formatted);

    // If fully typed (10 chars: DD/MM/YYYY), validate and notify parent
    if (formatted.length === 10) {
      const { valid, iso } = displayToIso(formatted, min, max);
      if (valid) {
        setInternalError(false);
        onChange(iso);
      } else {
        setInternalError(true);
        onChange("");
      }
    } else if (formatted.length === 0) {
      setInternalError(false);
      onChange("");
    }
  };

  const handleBlur = () => {
    const trimmed = displayText.trim();
    if (!trimmed) {
      if (required) {
        setInternalError(true);
        onChange("");
      } else {
        setInternalError(false);
        onChange("");
      }
      return;
    }

    const { valid, iso } = displayToIso(trimmed, min, max);
    if (valid) {
      setInternalError(false);
      onChange(iso);
    } else {
      setInternalError(true);
      onChange("");
    }
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (hiddenDateInputRef.current) {
      if (typeof (hiddenDateInputRef.current as any).showPicker === "function") {
        try {
          (hiddenDateInputRef.current as any).showPicker();
          return;
        } catch {
          // Fallback below
        }
      }
      hiddenDateInputRef.current.focus();
      hiddenDateInputRef.current.click();
    }
  };

  const handleHiddenPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      setDisplayText(isoToDisplay(iso));
      setInternalError(false);
      onChange(iso);
    }
  };

  const hasError = Boolean(error || internalError);

  return (
    <div className={`relative inline-block ${className || "w-full"}`}>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        id={id}
        name={name}
        value={displayText}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        maxLength={10}
        className={`w-full px-3 py-1.5 pr-9 text-xs sm:text-sm rounded-lg border bg-background text-foreground transition-colors font-mono focus:outline-none ${
          hasError
            ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-600 dark:text-red-400"
            : "border-border focus:border-primary focus:ring-1 focus:ring-primary"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-muted" : ""}`}
      />

      <button
        type="button"
        onClick={handleCalendarClick}
        disabled={disabled}
        tabIndex={-1}
        title="اختيار من التقويم"
        aria-label="اختيار من التقويم"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Calendar className="w-4 h-4" />
      </button>

      {/* Hidden native date input for calendar picker */}
      <input
        ref={hiddenDateInputRef}
        type="date"
        value={value || ""}
        min={min}
        max={max}
        onChange={handleHiddenPickerChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
          left: 0,
          bottom: 0,
        }}
      />
    </div>
  );
};

export default DateInput;
