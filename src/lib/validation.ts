import { z } from 'zod';

/**
 * Schemas de validação usando Zod
 */

// Validação de nickname (3-20 caracteres, apenas letras minúsculas, números e underscore)
export const nicknameSchema = z
  .string()
  .min(3, 'Nickname deve ter no mínimo 3 caracteres')
  .max(20, 'Nickname deve ter no máximo 20 caracteres')
  .regex(/^[a-z0-9_]+$/, 'Nickname deve conter apenas letras minúsculas, números e underscore')
  .toLowerCase();

// Validação de PIN (exatamente 4 dígitos)
export const pinSchema = z
  .string()
  .length(4, 'PIN deve ter exatamente 4 dígitos')
  .regex(/^\d{4}$/, 'PIN deve conter apenas números');

// Validação de mensagem
export const messageContentSchema = z
  .string()
  .min(1, 'Mensagem não pode estar vazia')
  .max(5000, 'Mensagem muito longa (máximo 5000 caracteres)')
  .trim();

// Validação de email
export const emailSchema = z.string().email('Email inválido');

// Validação de chat ID
export const chatIdSchema = z.string().uuid('ID de chat inválido');

// Validação de user ID
export const userIdSchema = z.string().uuid('ID de usuário inválido');

/**
 * Sanitiza string para exibição segura usando HTML encoding
 * Não destrói conteúdo legítimo (ex: "3 < 5" é preservado como "3 &lt; 5")
 */
export function sanitizeForDisplay(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitiza string removendo padrões perigosos para armazenamento
 * Mais conservador — remove apenas vetores de ataque conhecidos
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/expression\s*\(/gi, '')
    .trim();
}

/**
 * Valida e sanitiza nickname
 */
export function validateAndSanitizeNickname(nickname: string): { success: boolean; data?: string; error?: string } {
  try {
    const validated = nicknameSchema.parse(nickname);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Nickname inválido' };
    }
    return { success: false, error: 'Erro ao validar nickname' };
  }
}

/**
 * Valida e sanitiza mensagem
 */
export function validateAndSanitizeMessage(content: string): { success: boolean; data?: string; error?: string } {
  try {
    const validated = messageContentSchema.parse(content);
    const sanitized = sanitizeString(validated);
    return { success: true, data: sanitized };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Mensagem inválida' };
    }
    return { success: false, error: 'Erro ao validar mensagem' };
  }
}
