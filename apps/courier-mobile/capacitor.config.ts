import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.maxp.courier',
  appName: 'مندوب ماكس بي',
  webDir: 'dist',
  server: {
    url: 'https://maxp.online/courier-portal',
    androidScheme: 'https',
    cleartext: true,
    errorPath: 'index.html',
    allowNavigation: [
      'maxp.online',
      '*.maxp.online',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0284c7',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0369a1',
    },
  },
};

export default config;
