/**
 * Gera título e corpo disfarçados de notícia para notificações push (Sugestão 3).
 */
const PREFIXES = [
  'Nova descoberta científica',
  'Atualização importante',
  'Notícia urgente',
  'Desenvolvimento recente',
  'Informação atualizada',
];

export function generateFakeNewsTitle(content: string): string {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const truncated = content.replace(/\s+/g, ' ').trim().substring(0, 50);
  return truncated.length >= 50 ? `${prefix}: ${truncated}...` : `${prefix}: ${truncated}`;
}

export function generateFakeNewsBody(content: string, maxLength = 80): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.length <= maxLength ? cleaned : cleaned.substring(0, maxLength) + '...';
}
