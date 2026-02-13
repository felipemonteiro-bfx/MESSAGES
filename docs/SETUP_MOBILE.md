# Setup Mobile - Passo a Passo

Guia rápido para configurar o projeto para build mobile pela primeira vez.

---

## 🎯 Objetivo

Converter o app Next.js em apps nativos Android (.apk/.aab) e iOS (.ipa) usando Capacitor, mantendo todo o código existente.

---

## ⚡ Setup Rápido (5 minutos)

### 1. Instalar dependências do Capacitor

```bash
npm install
```

Isso instalará automaticamente:
- Capacitor Core e CLI
- Plataformas Android e iOS
- Plugins nativos (câmera, push, etc.)

### 2. Build para mobile

```bash
CAPACITOR=true npm run build
```

### 3. Inicializar plataformas

```bash
# Android
npx cap add android

# iOS (apenas macOS)
npx cap add ios
```

### 4. Sincronizar

```bash
npx cap sync
```

### 5. Abrir no IDE nativo

```bash
# Android
npm run cap:open:android

# iOS
npm run cap:open:ios
```

---

## 📋 O que foi configurado

### Arquivos criados/modificados:

1. **`capacitor.config.ts`** - Configuração do Capacitor
   - App ID: `com.stealthmessaging.app`
   - Nome: "Notícias BR"
   - Plugins: Camera, Push Notifications, Haptics, etc.

2. **`next.config.ts`** - Atualizado para suportar export estático
   - Detecta `CAPACITOR=true` para build mobile
   - Gera arquivos em `out/` quando buildando para mobile

3. **`package.json`** - Scripts adicionados:
   - `build:mobile` - Build Next.js + sync Capacitor
   - `cap:open:android` - Abre Android Studio
   - `cap:open:ios` - Abre Xcode
   - `cap:sync` - Sincroniza código web com nativo

4. **`.gitignore`** - Atualizado para ignorar:
   - `/android/` e `/ios/` (gerados pelo Capacitor)
   - Arquivos de keystore e certificados

---

## 🔄 Workflow Diário

### Desenvolvimento

```bash
# 1. Fazer mudanças no código
# 2. Build e sync
CAPACITOR=true npm run build && npx cap sync

# 3. Abrir no IDE nativo para testar
npm run cap:open:android  # ou cap:open:ios
```

### Deploy Web (Vercel)

O deploy web continua funcionando normalmente:
- Build padrão: `npm run build` (sem `CAPACITOR=true`)
- Vercel detecta automaticamente e faz deploy

---

## 📱 Próximos Passos

1. **Testar no emulador/simulador:**
   - Android: `npm run cap:open:android` → Run
   - iOS: `npm run cap:open:ios` → Run

2. **Testar em dispositivo físico:**
   - Android: Conecte via USB, habilite depuração USB, Run
   - iOS: Conecte iPhone, configure certificado de desenvolvimento, Run

3. **Gerar build de produção:**
   - Veja `docs/BUILD_MOBILE.md` para instruções detalhadas

---

## ⚠️ Importante

- **Android**: Requer Android Studio e Java JDK 17+
- **iOS**: Requer macOS, Xcode e Apple Developer Account ($99/ano)
- **Keystore**: Guarde o arquivo `.keystore` em local seguro (necessário para atualizações)
- **Certificados iOS**: Configure no Apple Developer Portal antes de publicar

---

## 🆘 Problemas Comuns

**"Command not found: cap"**
```bash
npm install -g @capacitor/cli
```

**"SDK location not found" (Android)**
- Configure `ANDROID_HOME` no ambiente
- Windows: `setx ANDROID_HOME "C:\Users\...\AppData\Local\Android\Sdk"`

**"No such module 'Capacitor'" (iOS)**
```bash
cd ios/App
pod install
```

---

Para mais detalhes, veja **`docs/BUILD_MOBILE.md`**.
