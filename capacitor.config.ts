import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.utsavconnect.app',
  appName: 'UtsavConnect',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
