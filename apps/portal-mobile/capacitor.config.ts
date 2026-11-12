import type { CapacitorConfig } from '@capacitor/cli';

interface FlavorMeta {
  appId: string;
  appName: string;
  accentColor: string;
}

const FLAVORS: Record<string, FlavorMeta> = {
  parent: {
    appId: 'online.maxp.parent',
    appName: 'بوابة ولي الأمر - MaxP',
    accentColor: '#059669',
  },
  portal: {
    appId: 'online.maxp.portal',
    appName: 'بوابات MaxP',
    accentColor: '#4f46e5',
  },
  courier: {
    appId: 'online.maxp.courier',
    appName: 'مندوب ماكس بي',
    accentColor: '#0284c7',
  },
  customer: {
    appId: 'online.maxp.customer',
    appName: 'ماكس بي للشحن والعملاء',
    accentColor: '#0f172a',
  },
};

const rawFlavor = (process.env.PORTAL_FLAVOR || 'parent').trim().toLowerCase();
const flavor = FLAVORS[rawFlavor] || FLAVORS.parent;
const remoteServerUrl = (process.env.PORTAL_SERVER_URL || '').trim();

const config: CapacitorConfig = {
  appId: flavor.appId,
  appName: flavor.appName,
  webDir: 'www',
  server: {
    ...(remoteServerUrl ? { url: remoteServerUrl } : {}),
    androidScheme: 'https',
    errorPath: 'index.html',
    allowNavigation: ['maxp.online', '*.maxp.online'],
  },
  android: {
    appendUserAgent: 'MaxP-Native-Android MaxP-Portal-Shell/1.0.0',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
