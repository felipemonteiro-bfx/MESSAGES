/**
 * Sistema centralizado de tratamento de erros
 */

export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  code?: string;
  statusCode?: number;
}

export class AppErrorClass extends Error implements AppError {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  originalError?: unknown;

  constructor(error: AppError) {
    super(error.message);
    this.name = 'AppError';
    this.type = error.type;
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.originalError = error.originalError;
  }
}

/**
 * Cria um erro formatado
 */
export function createError(
  type: ErrorType,
  message: string,
  options?: {
    code?: string;
    statusCode?: number;
    originalError?: unknown;
  }
): AppErrorClass {
  return new AppErrorClass({
    type,
    message,
    ...options,
  });
}

/**
 * Converte erros desconhecidos em AppError
 */
export function normalizeError(error: unknown): AppErrorClass {
  if (error instanceof AppErrorClass) {
    return error;
  }

  if (error instanceof Error) {
    // Erros do Supabase
    if (error.message.includes('JWT') || error.message.includes('session')) {
      return createError(ErrorType.AUTHENTICATION, 'Sessão expirada. Por favor, faça login novamente.', {
        originalError: error,
      });
    }

    // Erros de rede
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return createError(ErrorType.NETWORK, 'Erro de conexão. Verifique sua internet.', {
        originalError: error,
      });
    }

    return createError(ErrorType.UNKNOWN, error.message, { originalError: error });
  }

  return createError(ErrorType.UNKNOWN, 'Erro desconhecido', { originalError: error });
}

/**
 * Log de erro (não loga dados sensíveis em produção)
 */
export function logError(error: AppErrorClass, context?: Record<string, unknown>): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.error('[AppError]', {
      type: error.type,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context,
      originalError: error.originalError,
    });
  } else {
    // Em produção, logar apenas informações seguras
    console.error('[AppError]', {
      type: error.type,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      // Não logar originalError ou context em produção
    });
  }
}

/**
 * Obtém mensagem amigável para o usuário
 */
export function getUserFriendlyMessage(error: AppErrorClass): string {
  switch (error.type) {
    case ErrorType.AUTHENTICATION:
      return 'Você precisa estar logado para realizar esta ação.';
    case ErrorType.AUTHORIZATION:
      return 'Você não tem permissão para realizar esta ação.';
    case ErrorType.VALIDATION:
      return error.message || 'Dados inválidos. Verifique as informações fornecidas.';
    case ErrorType.NETWORK:
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    case ErrorType.SERVER:
      return 'Erro no servidor. Tente novamente em alguns instantes.';
    default:
      return error.message || 'Ocorreu um erro inesperado. Tente novamente.';
  }
}
