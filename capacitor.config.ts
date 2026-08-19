import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pinnacletutors.academy',
  appName: 'Pinnacle Tutors Academy',
  webDir: 'public',
  server: {
    url: 'https://pinnacle-tutors-academy-ad3i.vercel.app',
    cleartext: false,
  },
};

export default config;
