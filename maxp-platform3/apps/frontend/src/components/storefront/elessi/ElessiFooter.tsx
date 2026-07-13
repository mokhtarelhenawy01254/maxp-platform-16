import React from "react";

export interface ElessiFooterLink {
  label: string;
  href: string;
}

export interface ElessiFooterColumn {
  title: string;
  links: ElessiFooterLink[];
}

export interface ElessiFooterData {
  brand: {
    name: string;
    description: string;
  };
  columns: ElessiFooterColumn[];
  newsletter?: {
    title?: string;
    description?: string;
  };
  socials: Array<{
    id: string;
    label: string;
    href: string;
  }>;
  meta: string;
}

const ElessiFooter: React.FC<{ data: ElessiFooterData }> = ({ data }) => {
  return (
    <footer className="border-t border-slate-200 bg-white py-10" dir="rtl">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{data.brand.name}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {data.brand.description}
          </p>
        </div>

        {data.columns.map((column) => (
          <div key={column.title}>
            <h4 className="text-sm font-bold text-slate-900">{column.title}</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.href}`}>
                  <a href={link.href} className="hover:text-slate-900">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-6 text-xs text-slate-400">
        {data.meta}
      </div>
    </footer>
  );
};

export default ElessiFooter;
