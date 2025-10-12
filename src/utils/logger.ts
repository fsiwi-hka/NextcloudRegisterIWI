/**
 * Logger utility for debugging and monitoring
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
    private isDevelopment = import.meta.env.DEV;

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    info(message: string, data?: any) {
        if (this.isDevelopment) {
            console.info(this.formatMessage('info', message), data || '');
        }
    }

    warn(message: string, data?: any) {
        if (this.isDevelopment) {
            console.warn(this.formatMessage('warn', message), data || '');
        }
    }

    error(message: string, error?: any) {
        console.error(this.formatMessage('error', message), error || '');
    }

    debug(message: string, data?: any) {
        if (this.isDevelopment) {
            console.debug(this.formatMessage('debug', message), data || '');
        }
    }

    logApiRequest(method: string, url: string, data?: any) {
        this.debug(`API Request: ${method} ${url}`, data);
    }

    logApiResponse(method: string, url: string, status: number, data?: any) {
        this.info(`API Response: ${method} ${url} - Status: ${status}`, data);
    }

    logApiError(method: string, url: string, error: any) {
        this.error(`API Error: ${method} ${url}`, error);
    }
}

export const logger = new Logger();
