// Capacitor config - será usado após instalar @capacitor/cli
// Para instalar: npm install
const config = {
  appId: 'com.noticias24h.app',
  appName: 'Noticias24h',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Em desenvolvimento, descomente para usar servidor local:
    // url: 'http://localhost:3005',
    // cleartext: true
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
      keystorePath: undefined, // Configure após gerar keystore
      keystoreAlias: undefined,
    },
    allowMixedContent: false,
  },
  ios: {
    scheme: 'Noticias24h',
    contentInset: 'automatic',
  },
};

export default config;
