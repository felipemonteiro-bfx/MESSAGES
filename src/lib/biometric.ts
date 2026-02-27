import { Capacitor } from '@capacitor/core';

export type BiometryType =
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
const WEBAUTHN_CREDENTIAL_KEY = 'webauthn_credential_id';
const WEBAUTHN_USER_ID_KEY = 'webauthn_user_id';

// ---------------------------------------------------------------------------
// WebAuthn helpers (web fallback for Face ID / Touch ID / Windows Hello)
// ---------------------------------------------------------------------------

function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

async function isWebAuthnPlatformAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function getStoredCredentialId(): Uint8Array | null {
  const stored = localStorage.getItem(WEBAUTHN_CREDENTIAL_KEY);
  if (!stored) return null;
  try {
    const arr = JSON.parse(stored) as number[];
    return new Uint8Array(arr);
  } catch {
    return null;
  }
}

function getOrCreateUserId(): Uint8Array {
  const stored = localStorage.getItem(WEBAUTHN_USER_ID_KEY);
  if (stored) {
    try {
      return new Uint8Array(JSON.parse(stored) as number[]);
    } catch {
      // fall through to create new
    }
  }
  const id = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(WEBAUTHN_USER_ID_KEY, JSON.stringify(Array.from(id)));
  return id;
}

function detectWebBiometryType(): BiometryType {
  if (typeof navigator === 'undefined') return 'none';
  const ua = navigator.userAgent.toLowerCase();

  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'faceId';

  const isMac = /macintosh|mac os x/.test(ua) && !isIOS;
  if (isMac) return 'touchId';

  if (/android/.test(ua)) return 'fingerprintAuthentication';

  return 'faceAuthentication';
}

export async function registerWebAuthnCredential(): Promise<boolean> {
  if (!(await isWebAuthnPlatformAvailable())) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = getOrCreateUserId();

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Noticias24h', id: window.location.hostname },
        user: {
          id: userId as BufferSource,
          name: 'usuario@noticias24h',
          displayName: 'Noticias24h',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    localStorage.setItem(
      WEBAUTHN_CREDENTIAL_KEY,
      JSON.stringify(Array.from(new Uint8Array(credential.rawId)))
    );
    return true;
  } catch {
    return false;
  }
}

async function authenticateWebAuthn(): Promise<boolean> {
  const credentialId = getStoredCredentialId();
  if (!credentialId) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{ id: credentialId as BufferSource, type: 'public-key', transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch {
    return false;
  }
}

export function removeWebAuthnCredential(): void {
  localStorage.removeItem(WEBAUTHN_CREDENTIAL_KEY);
}

function hasWebAuthnCredential(): boolean {
  return !!localStorage.getItem(WEBAUTHN_CREDENTIAL_KEY);
}

// ---------------------------------------------------------------------------
// Capacitor native plugin (lazy-loaded)
// ---------------------------------------------------------------------------

async function getBiometricPlugin(): Promise<BiometricAuthPlugin | null> {
  if (biometricModule) return biometricModule;

  if (Capacitor.isNativePlatform()) {
    try {
      const mod = await import('@aparajita/capacitor-biometric-auth');
      biometricModule = mod.BiometricAuth as unknown as BiometricAuthPlugin;
      return biometricModule;
    } catch {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API (unified: Capacitor native + WebAuthn web fallback)
// ---------------------------------------------------------------------------

export async function isBiometricAvailable(): Promise<boolean> {
  const plugin = await getBiometricPlugin();
  if (plugin) {
    try {
      const result = await plugin.checkBiometry();
      return result.isAvailable && result.biometryType !== 'none';
    } catch {
      return false;
    }
  }

  if (await isWebAuthnPlatformAvailable()) {
    return true;
  }

  return false;
}

export async function getBiometryType(): Promise<BiometryType> {
  const plugin = await getBiometricPlugin();
  if (plugin) {
    try {
      const result = await plugin.checkBiometry();
      return result.biometryType;
    } catch {
      return 'none';
    }
  }

  if (await isWebAuthnPlatformAvailable()) {
    return detectWebBiometryType();
  }

  return 'none';
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
  if (plugin) {
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

  if (hasWebAuthnCredential()) {
    return authenticateWebAuthn();
  }

  return false;
}

export function isBiometricEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
}

export function setBiometricEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    removeWebAuthnCredential();
  }
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

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export const biometric = {
  isAvailable: isBiometricAvailable,
  getType: getBiometryType,
  getLabel: getBiometryLabel,
  authenticate: authenticateWithBiometric,
  isEnabled: isBiometricEnabled,
  setEnabled: setBiometricEnabled,
  checkAndAuthenticate: checkAndAuthenticateBiometric,
  registerWebAuthn: registerWebAuthnCredential,
  removeWebAuthn: removeWebAuthnCredential,
  isNative: isNativePlatform,
};

export default biometric;
