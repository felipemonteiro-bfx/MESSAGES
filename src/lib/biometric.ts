import { Capacitor } from '@capacitor/core';

type BiometryType = 
  | 'none'
  | 'touchId'
  | 'faceId'
  | 'fingerprintAuthentication'
  | 'faceAuthentication'
  | 'irisAuthentication';

interface BiometricAuthPlugin {
  checkBiometry(): Promise<{
    isAvailable: boolean;
    biometryType: BiometryType;
    reason?: string;
  }>;
  authenticate(options?: {
    reason?: string;
    cancelTitle?: string;
    allowDeviceCredential?: boolean;
    iosFallbackTitle?: string;
    androidTitle?: string;
    androidSubtitle?: string;
  }): Promise<void>;
}

let biometricModule: BiometricAuthPlugin | null = null;
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

async function getBiometricPlugin(): Promise<BiometricAuthPlugin | null> {
  if (biometricModule) return biometricModule;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const module = await import('@aparajita/capacitor-biometric-auth');
      biometricModule = module.BiometricAuth as unknown as BiometricAuthPlugin;
      return biometricModule;
    } catch {
      return null;
    }
  }
  return null;
}

export async function isBiometricAvailable(): Promise<boolean> {
  const plugin = await getBiometricPlugin();
  if (!plugin) return false;
  
  try {
    const result = await plugin.checkBiometry();
    return result.isAvailable && result.biometryType !== 'none';
  } catch {
    return false;
  }
}

export async function getBiometryType(): Promise<BiometryType> {
  const plugin = await getBiometricPlugin();
  if (!plugin) return 'none';
  
  try {
    const result = await plugin.checkBiometry();
    return result.biometryType;
  } catch {
    return 'none';
  }
}

export function getBiometryLabel(type: BiometryType): string {
  switch (type) {
    case 'faceId':
    case 'faceAuthentication':
      return 'Face ID';
    case 'touchId':
    case 'fingerprintAuthentication':
      return 'Touch ID';
    case 'irisAuthentication':
      return 'Íris';
    default:
      return 'Biometria';
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const plugin = await getBiometricPlugin();
  if (!plugin) return false;
  
  try {
    await plugin.authenticate({
      reason: 'Desbloquear Noticias24h',
      cancelTitle: 'Usar PIN',
      allowDeviceCredential: false,
      iosFallbackTitle: 'Usar PIN',
      androidTitle: 'Autenticação Biométrica',
      androidSubtitle: 'Use sua biometria para desbloquear',
    });
    return true;
  } catch {
    return false;
  }
}

export function isBiometricEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
}

export function setBiometricEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function checkAndAuthenticateBiometric(): Promise<{
  success: boolean;
  usedBiometric: boolean;
}> {
  if (!isBiometricEnabled()) {
    return { success: false, usedBiometric: false };
  }
  
  const available = await isBiometricAvailable();
  if (!available) {
    return { success: false, usedBiometric: false };
  }
  
  const authenticated = await authenticateWithBiometric();
  return { success: authenticated, usedBiometric: true };
}

export const biometric = {
  isAvailable: isBiometricAvailable,
  getType: getBiometryType,
  getLabel: getBiometryLabel,
  authenticate: authenticateWithBiometric,
  isEnabled: isBiometricEnabled,
  setEnabled: setBiometricEnabled,
  checkAndAuthenticate: checkAndAuthenticateBiometric,
};

export default biometric;
