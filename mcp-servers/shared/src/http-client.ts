import { logger } from './logger.js';
import { McpError, ErrorCodes } from './error-handler.js';

export interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_TIMEOUT = 30000;

export async function resilientFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT, headers = {} } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BetterCallClaude-España-MCP/1.0',
          Accept: 'application/json, application/xml, text/html',
          ...headers,
        },
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        throw new McpError(ErrorCodes.RateLimitExceeded, `Rate limited by ${url}`, 429);
      }

      if (response.status >= 500) {
        throw new McpError(ErrorCodes.ServiceUnavailable, `Service error ${response.status} from ${url}`, response.status);
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn({ url, attempt, error: lastError.message }, 'Fetch attempt failed');

      if (attempt < retries - 1) {
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  clearTimeout(timeout);
  throw new McpError(
    ErrorCodes.ServiceUnavailable,
    `Failed to fetch ${url} after ${retries} attempts: ${lastError?.message}`,
    503
  );
}
