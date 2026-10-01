import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.maxp.app',
  appName: 'MaxP',
  webDir: 'dist',
  server: {
    url: 'https://maxp.online',
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
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
