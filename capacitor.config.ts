import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { plugins?: Record<string, unknown> } = {
  appId: 'com.noticias24h.app',
  appName: 'Noticias24h',
  webDir: 'out',
  server: {
    url: 'https://notices24h.vercel.app',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#2563eb',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body' as any,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
    Camera: {
      permissions: {
        camera: 'Este app precisa de acesso à câmera para enviar fotos.',
        photos: 'Este app precisa de acesso às fotos para enviar imagens.',
      },
    },
    Microphone: {
      permissions: {
        microphone: 'Este app precisa de acesso ao microfone para gravar áudio.',
      },
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    allowMixedContent: false,
  },
  ios: {
    scheme: 'Noticias24h',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

export default config;
