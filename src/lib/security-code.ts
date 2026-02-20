/**
 * Geração de códigos de segurança para verificação de identidade
 * Baseado nas chaves públicas dos participantes de uma conversa
 * Detecta substituição de chaves (MITM) ao incluir public keys no hash
 */

export interface SecurityCode {
  code: string;
  displayCode: string;
  chatId: string;
  participants: string[];
  generatedAt: string;
  includesPublicKeys: boolean;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera um código de segurança único para uma conversa.
 * Quando chaves públicas são fornecidas, elas são incluídas no hash --
 * uma substituição MITM de chave pública gera um código diferente.
 */
export async function generateSecurityCode(
  chatId: string,
  participantIds: string[],
  publicKeys?: (string | null)[]
): Promise<SecurityCode> {
  const sortedParticipants = [...participantIds].sort();

  const keyMap: Record<string, string> = {};
  if (publicKeys && publicKeys.length === participantIds.length) {
    participantIds.forEach((id, i) => {
      if (publicKeys[i]) keyMap[id] = publicKeys[i]!;
    });
  }

  const hasKeys = sortedParticipants.every(id => !!keyMap[id]);

  let baseString: string;
  if (hasKeys) {
    const keyParts = sortedParticipants.map(id => `${id}:${keyMap[id]}`);
    baseString = `v2:${chatId}:${keyParts.join(':')}`;
  } else {
    baseString = `${chatId}:${sortedParticipants.join(':')}`;
  }
  
  const hash = await sha256(baseString);
  const displayCode = formatSecurityCode(hash);
  
  return {
    code: hash,
    displayCode,
    chatId,
    participants: sortedParticipants,
    generatedAt: new Date().toISOString(),
    includesPublicKeys: hasKeys,
  };
}

/**
 * Formata o hash como código legível
 * Converte para números e agrupa em blocos de 5
 */
function formatSecurityCode(hash: string): string {
  // Pegar os primeiros 30 caracteres e converter para números
  const numbers = hash
    .slice(0, 30)
    .split('')
    .map(c => {
      const num = parseInt(c, 16);
      return num.toString().padStart(2, '0').slice(-1);
    })
    .join('');
  
  // Agrupar em blocos de 5
  const groups: string[] = [];
  for (let i = 0; i < numbers.length; i += 5) {
    groups.push(numbers.slice(i, i + 5));
  }
  
  return groups.join(' ');
}

/**
 * Verifica se dois códigos de segurança são iguais
 */
export function verifySecurityCodes(code1: string, code2: string): boolean {
  // Normalizar removendo espaços
  const normalized1 = code1.replace(/\s/g, '').toLowerCase();
  const normalized2 = code2.replace(/\s/g, '').toLowerCase();
  
  return normalized1 === normalized2;
}

/**
 * Gera dados para QR Code
 * O QR Code contém: chatId, código de segurança, timestamp
 */
export function generateQRData(securityCode: SecurityCode): string {
  return JSON.stringify({
    type: 'stealth_verify',
    version: 1,
    chatId: securityCode.chatId,
    code: securityCode.displayCode.replace(/\s/g, ''),
    ts: Date.now(),
  });
}

/**
 * Parseia dados de QR Code escaneado
 */
export function parseQRData(data: string): { chatId: string; code: string; ts: number } | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type !== 'stealth_verify' || !parsed.chatId || !parsed.code) {
      return null;
    }
    return {
      chatId: parsed.chatId,
      code: parsed.code,
      ts: parsed.ts || 0,
    };
  } catch {
    return null;
  }
}
