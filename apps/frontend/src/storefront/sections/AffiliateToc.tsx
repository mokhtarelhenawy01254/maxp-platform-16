import React from "react";

interface Props {
  settings?: {
    title?: string;
    items?: unknown;
  };
}

const parseItems = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string") as string[];
  if (typeof value === "string" && value.trim()) {
    return value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return [
    "Our Top Picks",
    "Quick Answer",
    "Motor Power: The Difference Between Shearing and Pulling",
    "Blade Material: Why Heat Matters More Than You Think",
    "Precision Heads and Adjustable Combs",
    "Visibility and Ergonomics for Clean Lines",
    "Skin Sensitivity and Tolerance",
    "Frequently Asked Questions",
    "Sources & References",
  ];
};

const AffiliateToc: React.FC<Props> = ({ settings }) => {
  const items = parseItems(settings?.items);
  const title = settings?.title || "Table of Contents";

  return (
    <section className="w-full bg-background py-4">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-lg border border-[#e8e8e8] bg-[#f8f8f8] p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a1a1a]">{title}</h2>
            <ul className="mt-3 space-y-2">
              {items.map((item, i) => (
                <li key={i}>
                  <a
                    href={`#${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                    className="text-sm text-[#19212B] hover:underline"
                  >
                    • {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateToc;
