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

  // Supabase AuthError tem { message, status, code }
  const supabaseError = error as { message?: string; status?: number; code?: string; error_description?: string };
  if (supabaseError && typeof supabaseError.message === 'string') {
    const msg = supabaseError.message.toLowerCase();
    const code = supabaseError.code;
    
    // Erros comuns de autenticação Supabase
    if (msg.includes('invalid login') || msg.includes('invalid credentials') || code === 'invalid_credentials') {
      return createError(ErrorType.AUTHENTICATION, 'E-mail ou senha incorretos.', {
        originalError: error,
        code,
        statusCode: supabaseError.status,
      });
    }
    
    if (msg.includes('user already registered') || code === 'user_already_exists') {
      return createError(ErrorType.VALIDATION, 'Este e-mail já está cadastrado. Tente fazer login.', {
        originalError: error,
        code,
      });
    }
    
    if (msg.includes('password') && (msg.includes('weak') || msg.includes('short'))) {
      return createError(ErrorType.VALIDATION, 'A senha deve ter pelo menos 6 caracteres.', {
        originalError: error,
        code,
      });
    }

    if (msg.includes('jwt') || msg.includes('session') || msg.includes('refresh_token') || msg.includes('not authenticated')) {
      return createError(ErrorType.AUTHENTICATION, 'Sessão expirada. Por favor, faça login novamente.', {
        originalError: error,
        code,
      });
    }

    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('net::err') || msg.includes('fetch')) {
      return createError(ErrorType.NETWORK, 'Erro de conexão. Verifique sua internet.', {
        originalError: error,
      });
    }

    // Retornar a mensagem original se não for um erro conhecido
    return createError(ErrorType.UNKNOWN, supabaseError.message, { 
      originalError: error,
      code,
      statusCode: supabaseError.status,
    });
  }

  if (error instanceof Error) {
    return createError(ErrorType.UNKNOWN, error.message, { originalError: error });
  }

  if (typeof error === 'string') {
    return createError(ErrorType.UNKNOWN, error);
  }

  return createError(ErrorType.UNKNOWN, 'Erro desconhecido', { originalError: error });
}

/**
 * Log de erro — usa monitoring se disponível, sem require() dinâmico
 */
export function logError(error: AppErrorClass, context?: Record<string, unknown>): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.error('[AppError]', error.type, '-', error.message);
    if (error.code) console.error('  Code:', error.code);
    if (error.statusCode) console.error('  Status:', error.statusCode);
    if (context) console.error('  Context:', context);
    if (error.originalError) {
      console.error('  Original error:', error.originalError);
    }
  } else {
    console.error(`[AppError] ${error.type}: ${error.message}`);
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
