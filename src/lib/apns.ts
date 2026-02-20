/**
 * APNs (Apple Push Notification service) - envio de push nativo para iOS.
 * Usa token (.p8) para autenticação.
 *
 * Variáveis de ambiente necessárias:
 * - APNS_KEY_P8: Conteúdo do arquivo .p8 (-----BEGIN PRIVATE KEY----- ...)
 * - APNS_KEY_ID: Key ID do Apple Developer
 * - APNS_TEAM_ID: Team ID
 * - APNS_BUNDLE_ID: Bundle ID do app (ex: com.noticias24h.app)
 * - APNS_PRODUCTION: "true" para produção, "false" para sandbox (opcional, usa NODE_ENV)
 */

import apn from 'apn';

let provider: apn.Provider | null = null;

function getProvider(): apn.Provider | null {
  const keyP8 = process.env.APNS_KEY_P8?.trim();
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const bundleId = process.env.APNS_BUNDLE_ID?.trim();

  if (!keyP8 || !keyId || !teamId || !bundleId) {
    return null;
  }

  if (!provider) {
    const production = process.env.APNS_PRODUCTION === 'true' || process.env.NODE_ENV === 'production';
    provider = new apn.Provider({
      token: {
        key: keyP8,
        keyId,
        teamId,
      },
      production,
    });
  }

  return provider;
}

export function isApnsConfigured(): boolean {
  return !!(
    process.env.APNS_KEY_P8?.trim() &&
    process.env.APNS_KEY_ID?.trim() &&
    process.env.APNS_TEAM_ID?.trim() &&
    process.env.APNS_BUNDLE_ID?.trim()
  );
}

interface ApnsOptions {
  title: string;
  body: string;
  badge?: number;
  threadId?: string;
  category?: string;
  mutableContent?: boolean;
  data?: Record<string, unknown>;
}

export async function sendApns(
  deviceTokens: string[],
  options: ApnsOptions
): Promise<{ sent: string[]; failed: string[] }> {
  const prov = getProvider();
  if (!prov || deviceTokens.length === 0) {
    return { sent: [], failed: deviceTokens };
  }

  const bundleId = process.env.APNS_BUNDLE_ID!;
  const note = new apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.badge = options.badge ?? 1;
  note.sound = 'default';
  note.alert = {
    title: options.title,
    body: options.body,
  };
  note.topic = bundleId;
  
  if (options.threadId) {
    note.threadId = options.threadId;
  }
  
  if (options.category) {
    (note as any).category = options.category;
  }
  
  if (options.mutableContent) {
    (note as any).mutableContent = 1;
  }
  
  note.payload = { 
    isMessage: true, 
    url: '/',
    ...(options.data || {}),
  };

  const result = await prov.send(note, deviceTokens);
  const sent: string[] = [];
  const failed: string[] = [];

  result.sent.forEach((token) => sent.push(token.toString()));
  result.failed.forEach((failure) => {
    if (failure.device) {
      failed.push(failure.device.toString());
    }
  });

  return { sent, failed };
}
