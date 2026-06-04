type DataLayerEvent = Record<string, unknown>;

export type GtmEcommerceItem = {
  item_id: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
};

const DEFAULT_DATA_LAYER = "dataLayer";
const SCRIPT_ATTR = "data-gtm-id";
const NOSCRIPT_ATTR = "data-gtm-noscript";

const ensureDataLayer = (name: string = DEFAULT_DATA_LAYER): DataLayerEvent[] => {
  if (typeof window === "undefined") return [];
  const win = window as any;
  if (!win[name]) {
    win[name] = [];
  }
  return win[name];
};

const buildGtmScriptSrc = (containerId: string, dataLayerName: string) => {
  const dl = dataLayerName !== DEFAULT_DATA_LAYER ? `&l=${dataLayerName}` : "";
  return `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}${dl}`;
};

export const createGtmEventId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const loadGtm = (containerId: string, dataLayerName: string = DEFAULT_DATA_LAYER): void => {
  if (typeof document === "undefined" || !containerId) return;

  const existingScript = document.querySelector(
    `script[${SCRIPT_ATTR}="${containerId}"]`,
  );
  if (existingScript) {
    return;
  }

  const dataLayer = ensureDataLayer(dataLayerName);
  dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = buildGtmScriptSrc(containerId, dataLayerName);
  script.setAttribute(SCRIPT_ATTR, containerId);
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  const existingNoScript = document.querySelector(
    `noscript[${NOSCRIPT_ATTR}="${containerId}"]`,
  );
  if (!existingNoScript && document.body) {
    const noScript = document.createElement("noscript");
    noScript.setAttribute(NOSCRIPT_ATTR, containerId);
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noScript.appendChild(iframe);
    document.body.prepend(noScript);
  }
};

export const pushGtmEvent = (
  eventName: string,
  payload: Record<string, unknown> = {},
  dataLayerName: string = DEFAULT_DATA_LAYER,
): void => {
  if (typeof window === "undefined" || !eventName) return;
  const dataLayer = ensureDataLayer(dataLayerName);
  dataLayer.push({ event: eventName, ...payload });
};

export const pushGtmEcommerceEvent = (
  eventName: string,
  params: {
    items: GtmEcommerceItem[];
    value?: number;
    currency?: string;
    transaction_id?: string;
    event_id?: string;
  },
  dataLayerName: string = DEFAULT_DATA_LAYER,
): void => {
  const payload: Record<string, unknown> = {
    event_id: params.event_id,
    ecommerce: {
      items: params.items,
    },
  };

  if (params.currency) {
    (payload.ecommerce as Record<string, unknown>).currency = params.currency;
  }
  if (typeof params.value === "number") {
    (payload.ecommerce as Record<string, unknown>).value = params.value;
  }
  if (params.transaction_id) {
    (payload.ecommerce as Record<string, unknown>).transaction_id = params.transaction_id;
  }

  pushGtmEvent(eventName, payload, dataLayerName);
};
