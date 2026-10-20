import React from "react";

export interface FieldHintProps {
  text: string;
}

export const FieldHint: React.FC<FieldHintProps> = ({ text }) => {
  return (
    <span
      role="note"
      aria-label={text}
      title={text}
      tabIndex={0}
      className="inline-flex size-3.5 shrink-0 cursor-help items-center justify-center rounded-full bg-slate-200 align-middle text-[9px] font-bold leading-none text-slate-500 dark:bg-slate-700 dark:text-slate-400"
    >
      i
    </span>
  );
};

export default FieldHint;
