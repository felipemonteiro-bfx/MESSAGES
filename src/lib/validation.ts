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

// Validação de checkout request
export const checkoutRequestSchema = z.object({
  priceId: z.string().min(1, 'Price ID é obrigatório'),
  planName: z.string().min(1, 'Nome do plano é obrigatório'),
});

// Validação de chat ID
export const chatIdSchema = z.string().uuid('ID de chat inválido');

// Validação de user ID
export const userIdSchema = z.string().uuid('ID de usuário inválido');

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
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
