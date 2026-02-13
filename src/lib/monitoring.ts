/**
 * Sugestão 29: Sistema de logs estruturados e monitoramento de erros
 */

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class MonitoringService {
  private sessionId: string;
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Limitar logs em memória
  private errorCount = 0;
  private lastErrorTime: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupErrorHandlers();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorHandlers(): void {
    // Capturar erros não tratados
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.log('error', 'Unhandled error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack,
        });
      });

      // Capturar promises rejeitadas
      window.addEventListener('unhandledrejection', (event) => {
        this.log('error', 'Unhandled promise rejection', {
          reason: event.reason,
          error: event.reason?.stack || String(event.reason),
        });
      });
    }
  }

  log(level: LogEntry['level'], message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      sessionId: this.sessionId,
    };

    // Adicionar userId se disponível
    if (typeof window !== 'undefined') {
      try {
        const supabase = require('@/lib/supabase/client').createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            entry.userId = session.user.id;
          }
        }).catch(() => {
          // Ignorar erros ao buscar sessão
        });
      } catch {
        // Ignorar se não conseguir importar
      }
    }

    this.logs.push(entry);
    
    // Limitar tamanho do array
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Contar erros
    if (level === 'error') {
      this.errorCount++;
      this.lastErrorTime = Date.now();
    }

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}]`, message, context || '');
    }

    // Enviar para serviço de monitoramento (ex: Sentry) em produção
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    // Aqui você pode integrar com Sentry, LogRocket, ou outro serviço
    // Por enquanto, apenas logar
    try {
      // Exemplo: enviar para endpoint de monitoramento
      if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {
          // Falha silenciosa se não conseguir enviar
        });
      }
    } catch {
      // Ignorar erros de envio
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
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

  // Métricas de performance
  measurePerformance(name: string, fn: () => void | Promise<void>): void {
    const start = performance.now();
    const result = fn();
    
    if (result instanceof Promise) {
      result.then(() => {
        const duration = performance.now() - start;
        this.debug(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
      }).catch((error) => {
        this.error(`Performance error: ${name}`, { error: error.message });
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
