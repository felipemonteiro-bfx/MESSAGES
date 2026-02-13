# Build Mobile - Android e iOS

Guia completo para gerar apps nativos Android (.apk/.aab) e iOS (.ipa) usando Capacitor.

---

## 📱 Pré-requisitos

### Para Android:
- **Node.js** 18+ (já instalado)
- **Java JDK** 17+ ([Download](https://adoptium.net/))
- **Android Studio** ([Download](https://developer.android.com/studio))
- **Android SDK** (instalado via Android Studio)

### Para iOS (apenas macOS):
- **macOS** 12+ (Monterey ou superior)
- **Xcode** 14+ ([App Store](https://apps.apple.com/app/xcode/id497799835))
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Account** ($99/ano) - necessário para distribuição

---

## 🚀 Setup Inicial

### 1. Instalar dependências

```bash
# Instalar dependências principais do projeto
npm install

# Instalar dependências do Capacitor (apenas quando necessário para builds mobile)
# Windows PowerShell:
.\scripts\install-capacitor.ps1

# Linux/Mac:
bash scripts/install-capacitor.sh
```

Isso instalará:
- `@capacitor/core` - Core do Capacitor
- `@capacitor/cli` - CLI do Capacitor
- `@capacitor/android` - Plataforma Android
- `@capacitor/ios` - Plataforma iOS
- Plugins nativos (câmera, push notifications, etc.)

**Nota:** As dependências do Capacitor não estão no `package.json` principal para evitar erros no build web (Vercel). Instale-as apenas quando for fazer builds mobile.

### 2. Build do Next.js para mobile

```bash
CAPACITOR=true npm run build
```

Isso gera os arquivos estáticos em `out/` (configurado para Capacitor).

### 3. Inicializar plataformas (primeira vez)

```bash
# Adicionar Android
npx cap add android

# Adicionar iOS (apenas macOS)
npx cap add ios
```

### 4. Sincronizar código web com plataformas nativas

```bash
npx cap sync
```

Este comando:
- Copia arquivos de `out/` para `android/app/src/main/assets/public/` e `ios/App/App/public/`
- Atualiza dependências nativas
- Aplica configurações do `capacitor.config.ts`

---

## 🤖 Build Android

### Desenvolvimento (APK debug)

1. **Abrir projeto no Android Studio:**
   ```bash
   npm run cap:open:android
   ```

2. **No Android Studio:**
   - Aguarde o Gradle sync completar
   - Clique em "Run" (▶️) ou `Shift+F10`
   - Selecione um emulador ou dispositivo físico conectado

### Produção (APK/AAB release)

#### Opção 1: Via Android Studio (recomendado)

1. Abra o projeto: `npm run cap:open:android`
2. **Build → Generate Signed Bundle / APK**
3. Selecione **Android App Bundle (.aab)** para Google Play ou **APK** para distribuição direta
4. Crie um keystore (se não tiver):
   - **Key store path**: escolha localização
   - **Password**: crie senha forte
   - **Key alias**: `stealth-messaging`
   - **Validity**: 25 anos (recomendado)
5. Preencha informações e clique **Next**
6. Selecione **release** build variant
7. Clique **Finish**

O arquivo será gerado em:
- **AAB**: `android/app/release/app-release.aab`
- **APK**: `android/app/release/app-release.apk`

#### Opção 2: Via linha de comando

```bash
# Gerar keystore (primeira vez)
keytool -genkey -v -keystore stealth-messaging.keystore -alias stealth-messaging -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
cd android
./gradlew assembleRelease

# Build release AAB (Google Play)
./gradlew bundleRelease
```

**Localização dos arquivos:**
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### Configurar keystore no Capacitor

Após gerar o keystore, atualize `capacitor.config.ts`:

```typescript
android: {
  buildOptions: {
    keystorePath: 'path/to/stealth-messaging.keystore',
    keystoreAlias: 'stealth-messaging',
  },
}
```

**⚠️ IMPORTANTE:** Nunca commite o arquivo `.keystore` no Git! Adicione ao `.gitignore`.

---

## 🍎 Build iOS

### Desenvolvimento (simulador/dispositivo)

1. **Abrir projeto no Xcode:**
   ```bash
   npm run cap:open:ios
   ```

2. **No Xcode:**
   - Selecione um simulador ou dispositivo físico
   - Clique em **Run** (▶️) ou `Cmd+R`
   - Aguarde build e instalação

### Produção (IPA para App Store)

#### Passo 1: Configurar certificados e perfis

1. Acesse [Apple Developer Portal](https://developer.apple.com/account/)
2. Crie **App ID** (se não existir):
   - Identificador: `com.stealthmessaging.app`
   - Capabilities: Push Notifications, Camera, Microphone
3. Crie **Certificado de Distribuição** (Distribution Certificate)
4. Crie **Perfil de Provisionamento** (Provisioning Profile) para App Store

#### Passo 2: Configurar no Xcode

1. Abra: `npm run cap:open:ios`
2. Selecione projeto **App** no navegador
3. Aba **Signing & Capabilities**:
   - Marque **Automatically manage signing**
   - Selecione seu **Team** (Apple Developer Account)
   - Xcode criará perfis automaticamente

#### Passo 3: Build Archive

1. No Xcode, selecione **Any iOS Device** ou dispositivo específico
2. **Product → Archive**
3. Aguarde build completar
4. **Window → Organizer** abrirá automaticamente
5. Selecione o archive e clique **Distribute App**
6. Escolha método:
   - **App Store Connect** - para publicar na App Store
   - **Ad Hoc** - para distribuição interna (até 100 dispositivos)
   - **Enterprise** - para distribuição empresarial (requer conta Enterprise)
   - **Development** - para testes

#### Passo 4: Upload para App Store Connect

1. Siga o assistente de distribuição
2. Selecione opções de distribuição
3. Xcode validará e fará upload automaticamente
4. Acesse [App Store Connect](https://appstoreconnect.apple.com/) para finalizar publicação

---

## 🔄 Workflow de Desenvolvimento

### Atualizar código web após mudanças

```bash
# 1. Build Next.js
CAPACITOR=true npm run build

# 2. Sincronizar com plataformas nativas
npx cap sync

# 3. Abrir no IDE nativo
npm run cap:open:android  # ou cap:open:ios
```

### Scripts úteis

```bash
# Build completo para mobile
npm run build:mobile

# Abrir Android Studio
npm run cap:open:android

# Abrir Xcode
npm run cap:open:ios

# Executar no Android (requer dispositivo/emulador)
npm run cap:run:android

# Executar no iOS (requer macOS + Xcode)
npm run cap:run:ios
```

---

## 📦 Plugins Nativos Configurados

O app já está configurado com:

- **@capacitor/app** - Controle do ciclo de vida do app
- **@capacitor/camera** - Acesso à câmera (fotos)
- **@capacitor/push-notifications** - Notificações push nativas
- **@capacitor/haptics** - Feedback tátil
- **@capacitor/keyboard** - Controle do teclado
- **@capacitor/splash-screen** - Tela de splash
- **@capacitor/status-bar** - Controle da barra de status

### Permissões necessárias

**Android** (`android/app/src/main/AndroidManifest.xml`):
- `CAMERA` - Para fotos
- `RECORD_AUDIO` - Para gravação de áudio
- `INTERNET` - Para conexão com Supabase
- `POST_NOTIFICATIONS` - Para push notifications (Android 13+)

**iOS** (`ios/App/App/Info.plist`):
- `NSCameraUsageDescription` - "Este app precisa de acesso à câmera para enviar fotos."
- `NSMicrophoneUsageDescription` - "Este app precisa de acesso ao microfone para gravar áudio."
- `NSPhotoLibraryUsageDescription` - "Este app precisa de acesso às fotos para enviar imagens."

---

## 🐛 Troubleshooting

### Android

**Erro: "SDK location not found"**
- Configure `ANDROID_HOME` no ambiente:
  ```bash
  # Windows
  setx ANDROID_HOME "C:\Users\SeuUsuario\AppData\Local\Android\Sdk"
  
  # macOS/Linux
  export ANDROID_HOME=$HOME/Library/Android/sdk
  ```

**Erro: "Gradle sync failed"**
- Abra Android Studio → File → Invalidate Caches / Restart
- Verifique se Java JDK 17+ está instalado

**App não conecta com Supabase**
- Verifique `capacitor.config.ts` → `server.androidScheme: 'https'`
- Para desenvolvimento local, use `http` e `cleartext: true`

### iOS

**Erro: "No such module 'Capacitor'"**
```bash
cd ios/App
pod install
```

**Erro: "Signing for App requires a development team"**
- Configure Team no Xcode: App → Signing & Capabilities → Team

**Erro: "Could not find module 'Capacitor'"**
- Execute: `npx cap sync ios`

---

## 📝 Checklist de Publicação

### Android (Google Play)

- [ ] Gerar keystore e configurar em `capacitor.config.ts`
- [ ] Build AAB release: `./gradlew bundleRelease`
- [ ] Testar APK em dispositivos reais
- [ ] Criar conta no [Google Play Console](https://play.google.com/console)
- [ ] Preparar assets (ícones, screenshots, descrição)
- [ ] Upload AAB no Play Console
- [ ] Preencher informações da loja
- [ ] Submeter para revisão

### iOS (App Store)

- [ ] Criar App ID no Apple Developer Portal
- [ ] Configurar certificados e perfis de provisionamento
- [ ] Build Archive no Xcode
- [ ] Testar em dispositivos reais
- [ ] Criar app no [App Store Connect](https://appstoreconnect.apple.com/)
- [ ] Preparar assets (ícones, screenshots, descrição)
- [ ] Upload IPA via Xcode Organizer
- [ ] Preencher informações da loja
- [ ] Submeter para revisão

---

## 🔗 Links Úteis

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)

---

## 💡 Dicas

1. **Teste em dispositivos reais** antes de publicar
2. **Mantenha keystore seguro** - sem ele, não é possível atualizar o app
3. **Use variáveis de ambiente** para diferentes builds (dev/staging/prod)
4. **Teste notificações push** em dispositivos reais (não funcionam em simulador/emulador)
5. **Otimize imagens** - apps grandes demoram mais para instalar
6. **Configure deep links** se quiser abrir o app via URL
