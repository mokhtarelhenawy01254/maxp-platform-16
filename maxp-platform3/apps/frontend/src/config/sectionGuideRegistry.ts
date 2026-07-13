export interface SectionGuideEntry {
  pathPrefix: string;
  titleKey: string;
  descriptionKey: string;
  stepKeys: string[];
  videoUrl?: string;
}

export const defaultSectionGuide: SectionGuideEntry = {
  pathPrefix: "*",
  titleKey: "guides.general.title",
  descriptionKey: "guides.general.description",
  stepKeys: [
    "guides.general.step1",
    "guides.general.step2",
    "guides.general.step3",
  ],
};

export const sectionGuideRegistry: SectionGuideEntry[] = [
  {
    pathPrefix: "/company-dashboard",
    titleKey: "guides.dashboard.title",
    descriptionKey: "guides.dashboard.description",
    stepKeys: [
      "guides.dashboard.step1",
      "guides.dashboard.step2",
      "guides.dashboard.step3",
    ],
  },
  {
    pathPrefix: "/orders",
    titleKey: "guides.orders.title",
    descriptionKey: "guides.orders.description",
    stepKeys: [
      "guides.orders.step1",
      "guides.orders.step2",
      "guides.orders.step3",
      "guides.orders.step4",
    ],
  },
  {
    pathPrefix: "/products",
    titleKey: "guides.products.title",
    descriptionKey: "guides.products.description",
    stepKeys: [
      "guides.products.step1",
      "guides.products.step2",
      "guides.products.step3",
    ],
  },
  {
    pathPrefix: "/customers",
    titleKey: "guides.customers.title",
    descriptionKey: "guides.customers.description",
    stepKeys: [
      "guides.customers.step1",
      "guides.customers.step2",
      "guides.customers.step3",
    ],
  },
  {
    pathPrefix: "/inbox",
    titleKey: "guides.inbox.title",
    descriptionKey: "guides.inbox.description",
    stepKeys: [
      "guides.inbox.step1",
      "guides.inbox.step2",
      "guides.inbox.step3",
    ],
  },
  {
    pathPrefix: "/facebook-inbox",
    titleKey: "guides.inbox.title",
    descriptionKey: "guides.inbox.description",
    stepKeys: [
      "guides.inbox.step1",
      "guides.inbox.step2",
      "guides.inbox.step3",
    ],
  },
  {
    pathPrefix: "/instagram-inbox",
    titleKey: "guides.inbox.title",
    descriptionKey: "guides.inbox.description",
    stepKeys: [
      "guides.inbox.step1",
      "guides.inbox.step2",
      "guides.inbox.step3",
    ],
  },
  {
    pathPrefix: "/unified-inbox",
    titleKey: "guides.inbox.title",
    descriptionKey: "guides.inbox.description",
    stepKeys: [
      "guides.inbox.step1",
      "guides.inbox.step2",
      "guides.inbox.step3",
    ],
  },
  {
    pathPrefix: "/dashboard",
    titleKey: "guides.dashboard.title",
    descriptionKey: "guides.dashboard.description",
    stepKeys: [
      "guides.dashboard.step1",
      "guides.dashboard.step2",
      "guides.dashboard.step3",
    ],
  },
  {
    pathPrefix: "/categories",
    titleKey: "guides.categories.title",
    descriptionKey: "guides.categories.description",
    stepKeys: [
      "guides.categories.step1",
      "guides.categories.step2",
      "guides.categories.step3",
    ],
  },
  {
    pathPrefix: "/whatsapp",
    titleKey: "guides.whatsapp.title",
    descriptionKey: "guides.whatsapp.description",
    stepKeys: [
      "guides.whatsapp.step1",
      "guides.whatsapp.step2",
      "guides.whatsapp.step3",
    ],
  },
  {
    pathPrefix: "/whatsapp-inbox",
    titleKey: "guides.whatsapp.title",
    descriptionKey: "guides.whatsapp.description",
    stepKeys: [
      "guides.whatsapp.step1",
      "guides.whatsapp.step2",
      "guides.whatsapp.step3",
    ],
  },
  {
    pathPrefix: "/advertising",
    titleKey: "guides.advertising.title",
    descriptionKey: "guides.advertising.description",
    stepKeys: [
      "guides.advertising.step1",
      "guides.advertising.step2",
      "guides.advertising.step3",
    ],
  },
  {
    pathPrefix: "/affiliates",
    titleKey: "guides.affiliates.title",
    descriptionKey: "guides.affiliates.description",
    stepKeys: [
      "guides.affiliates.step1",
      "guides.affiliates.step2",
      "guides.affiliates.step3",
    ],
  },
  {
    pathPrefix: "/hr",
    titleKey: "guides.hr.title",
    descriptionKey: "guides.hr.description",
    stepKeys: [
      "guides.hr.step1",
      "guides.hr.step2",
      "guides.hr.step3",
    ],
  },
  {
    pathPrefix: "/settings",
    titleKey: "guides.settings.title",
    descriptionKey: "guides.settings.description",
    stepKeys: [
      "guides.settings.step1",
      "guides.settings.step2",
      "guides.settings.step3",
    ],
  },
  {
    pathPrefix: "/tasks",
    titleKey: "guides.tasks.title",
    descriptionKey: "guides.tasks.description",
    stepKeys: [
      "guides.tasks.step1",
      "guides.tasks.step2",
      "guides.tasks.step3",
    ],
  },
  {
    pathPrefix: "/reports",
    titleKey: "guides.reports.title",
    descriptionKey: "guides.reports.description",
    stepKeys: [
      "guides.reports.step1",
      "guides.reports.step2",
      "guides.reports.step3",
    ],
  },
  {
    pathPrefix: "/support",
    titleKey: "guides.support.title",
    descriptionKey: "guides.support.description",
    stepKeys: [
      "guides.support.step1",
      "guides.support.step2",
      "guides.support.step3",
    ],
  },
];

export function findGuideForPath(pathname: string): SectionGuideEntry | undefined {
  const normalizedPathname = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  const sorted = [...sectionGuideRegistry].sort(
    (a, b) => b.pathPrefix.length - a.pathPrefix.length,
  );
  return sorted.find((entry) => normalizedPathname.startsWith(entry.pathPrefix));
}
