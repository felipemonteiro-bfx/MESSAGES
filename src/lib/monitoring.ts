/**
 * Sistema de logs estruturados e monitoramento de erros
 * Corrigido: removido require() dinâmico e getSession() por log
 */

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

class MonitoringService {
  private sessionId: string;
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private errorCount = 0;
  private lastErrorTime: number | null = null;
  private userId: string | undefined;
  private errorHandler: ((event: ErrorEvent) => void) | null = null;
  private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupErrorHandlers();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Definir userId uma vez (ex: após login) em vez de buscar a cada log
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  private setupErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    this.errorHandler = (event: ErrorEvent) => {
      this.log('error', 'Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      });
    };

    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      this.log('error', 'Unhandled promise rejection', {
        reason: event.reason,
        error: event.reason?.stack || String(event.reason),
      });
    };

    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
  }

  destroy(): void {
    if (typeof window === 'undefined') return;
    if (this.errorHandler) window.removeEventListener('error', this.errorHandler);
    if (this.rejectionHandler) window.removeEventListener('unhandledrejection', this.rejectionHandler);
  }

  log(level: LogEntry['level'], message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (level === 'error') {
      this.errorCount++;
      this.lastErrorTime = Date.now();
    }

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}]`, message, context || '');
    }

    // Enviar para serviço de monitoramento em produção
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {});
      }
    } catch {
      // Falha silenciosa
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getErrorStats(): { count: number; lastErrorTime: number | null } {
    return {
      count: this.errorCount,
      lastErrorTime: this.lastErrorTime,
    };
  }

  clearLogs(): void {
    this.logs = [];
    this.errorCount = 0;
    this.lastErrorTime = null;
  }

  measurePerformance(name: string, fn: () => void | Promise<void>): void {
    const start = performance.now();
    const result = fn();
    
    if (result instanceof Promise) {
      result.then(() => {
        const duration = performance.now() - start;
        this.debug(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
      }).catch((error) => {
        this.error(`Performance error: ${name}`, { error: (error as Error).message });
      });
    } else {
      const duration = performance.now() - start;
      this.debug(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    }
  }
}

// Singleton
export const monitoring = typeof window !== 'undefined' ? new MonitoringService() : null;

// Helper para usar em componentes
export function useMonitoring() {
  return monitoring;
}
