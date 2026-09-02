import React, { useState } from 'react';

export const Accordion = ({
  title,
  children,
  defaultOpen = false,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: 'default' | 'cutline';
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const wrapperClassName =
    tone === 'cutline' ? 'border-b border-[#2d3329] py-4' : 'border-b border-border py-4';
  const triggerClassName =
    tone === 'cutline'
      ? 'flex w-full items-center justify-between text-start font-black text-[#111510] transition-colors hover:text-[#7f8f1d]'
      : 'w-full flex items-center justify-between font-bold text-foreground hover:text-primary transition-colors text-start';
  const titleClassName =
    tone === 'cutline'
      ? 'text-[1rem] uppercase tracking-[0.12em]'
      : 'text-lg';
  return (
    <div className={wrapperClassName}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        <span className={titleClassName}>{title}</span>
        <svg
          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

Accordion.displayName = 'Accordion';
export default Accordion;