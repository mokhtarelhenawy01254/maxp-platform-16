import React from "react";

/**
 * ToggleSetting Component
 * A standard toggle switch for boolean settings.
 */
interface ToggleSettingProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const ToggleSetting: React.FC<ToggleSettingProps> = ({
  label,
  value,
  onChange,
  disabled,
}) => {
  const checkedValue = value ?? false;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span
        className={`text-xs font-medium ${
          disabled ? "text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {label}
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checkedValue}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
      </label>
    </div>
  );
};

/**
 * NumberSetting Component
 * A standard number input for numeric settings.
 */
interface NumberSettingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const NumberSetting: React.FC<NumberSettingProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}) => {
  const numValue = value ?? min ?? 0;
  return (
    <div className="space-y-1.5">
      <label
        className={`block text-xs font-medium ${
          disabled ? "text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {label}
      </label>
      <input
        type="number"
        value={numValue}
        onChange={(e) => {
          const num = parseInt(e.target.value) || min || 0;
          const clamped = Math.max(min || 0, Math.min(max || 1000, num));
          onChange(clamped);
        }}
        min={min}
        max={max}
        disabled={disabled}
        className={`w-full px-3 py-1.5 bg-background border border-border/70 text-foreground font-mono tabular-nums rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
    </div>
  );
};

/**
 * SelectSetting Component
 * A standard select dropdown for settings with multiple options.
 */
interface SelectSettingProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

export const SelectSetting: React.FC<SelectSettingProps> = ({
  label,
  value,
  onChange,
  options,
  disabled,
}) => {
  const stringValue = value ?? (options[0]?.value || "");
  return (
    <div className="space-y-1.5">
      <label
        className={`block text-xs font-medium ${
          disabled ? "text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {label}
      </label>
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-1.5 bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * InputSetting Component
 * A standard text or numeric input for settings.
 */
interface InputSettingProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
}

export const InputSetting: React.FC<InputSettingProps> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  helperText,
}) => {
  return (
    <div className="space-y-1.5">
      <label
        className={`block text-xs font-medium ${
          disabled ? "text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-1.5 bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
      {helperText && <p className="text-[11px] text-muted-foreground">{helperText}</p>}
    </div>
  );
};

/**
 * TextAreaSetting Component
 * A standard textarea for longer text settings.
 */
interface TextAreaSettingProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
  rows?: number;
}

export const TextAreaSetting: React.FC<TextAreaSettingProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  helperText,
  rows = 3,
}) => {
  return (
    <div className="space-y-1.5">
      <label
        className={`block text-xs font-medium ${
          disabled ? "text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3 py-1.5 bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-all resize-none ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
      {helperText && <p className="text-[11px] text-muted-foreground">{helperText}</p>}
    </div>
  );
};

/**
 * ColorSetting Component
 * A standard color picker for settings.
 */
interface ColorSettingProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string;
}

export const ColorSetting: React.FC<ColorSettingProps> = ({
  label,
  value,
  onChange,
  disabled,
  helperText,
}) => {
  return (
    <div className="space-y-1.5">
      <label
        className={`block text-xs font-medium ${
          disabled ? "text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {label}
      </label>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value?.startsWith("rgba") ? "#000000" : value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-8 h-8 rounded-lg border border-border/70 cursor-pointer bg-background disabled:cursor-not-allowed ${
            disabled ? "opacity-50" : ""
          }`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#000000 or rgba(0,0,0,0.9)"
          className={`flex-1 px-3 py-1.5 bg-background border border-border/70 text-foreground font-mono tabular-nums rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-all ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />
      </div>
      {helperText && <p className="text-[11px] text-muted-foreground">{helperText}</p>}
    </div>
  );
};
