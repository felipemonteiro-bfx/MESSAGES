#!/bin/bash
# Script para instalar dependências do Capacitor apenas quando necessário para builds mobile
# Execute: bash scripts/install-capacitor.sh

echo "Instalando dependências do Capacitor para builds mobile..."

npm install --save-dev \
  @capacitor/android@^5.5.1 \
  @capacitor/app@^5.0.6 \
  @capacitor/camera@^5.0.7 \
  @capacitor/cli@^5.5.1 \
  @capacitor/core@^5.5.1 \
  @capacitor/haptics@^5.0.6 \
  @capacitor/ios@^5.5.1 \
  @capacitor/keyboard@^5.0.6 \
  @capacitor/push-notifications@^5.0.6 \
  @capacitor/splash-screen@^5.0.6 \
  @capacitor/status-bar@^5.0.6

echo "Dependências do Capacitor instaladas com sucesso!"
echo "Agora você pode executar: npm run build:mobile"
