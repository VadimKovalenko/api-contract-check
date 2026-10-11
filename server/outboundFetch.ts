import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import type { AuthPayload, OutboundFetchLimits, OutboundFetchOptions, OutboundFetchResult } from './types.js';

export const DEFAULT_OUTBOUND_FETCH_LIMITS: OutboundFetchLimits = {
  timeoutMs: 10_000,
  maxBytes: 1_000_000,
  maxRedirects: 3,
};

const workerUrl = new URL('./outboundFetch.worker.js', import.meta.url);

interface WorkerSuccessMessage {
  ok: true;
  result: OutboundFetchResult;
}

interface WorkerErrorMessage {
  ok: false;
  error: string;
  statusCode?: number;
}

type WorkerMessage = WorkerSuccessMessage | WorkerErrorMessage;

export class OutboundFetchError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'OutboundFetchError';
    this.statusCode = statusCode;
  }
}

export function fetchEndpoint({
  url,
  headers,
  limits = DEFAULT_OUTBOUND_FETCH_LIMITS,
}: OutboundFetchOptions): Promise<OutboundFetchResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, {
      workerData: {
        url,
        headers,
        limits: { ...DEFAULT_OUTBOUND_FETCH_LIMITS, ...limits },
      },
    });

    let settled = false;
    const timeoutMs = Math.max(1, limits.timeoutMs ?? DEFAULT_OUTBOUND_FETCH_LIMITS.timeoutMs) + 1_000;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      void worker.terminate();
      reject(new OutboundFetchError('The endpoint request timed out.', 504));
    }, timeoutMs);

    worker.once('message', (message: WorkerMessage) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (message.ok) {
        resolve(message.result);
        return;
      }

      reject(new OutboundFetchError(message.error, message.statusCode));
    });

    worker.once('error', (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(new OutboundFetchError(error.message || 'Unable to fetch the endpoint.'));
    });

    worker.once('exit', (code) => {
      if (settled || code === 0) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(new OutboundFetchError('The outbound fetch worker stopped unexpectedly.'));
    });
  });
}

export function redactSecrets(value: string, auth?: AuthPayload): string;
export function redactSecrets<Value>(value: Value, auth?: AuthPayload): Value;
export function redactSecrets(value: unknown, auth: AuthPayload = { type: 'none' }) {
  if (typeof value !== 'string' || !value) {
    return value;
  }

  const secrets = [
    getAuthSecret(auth, 'token'),
    getAuthSecret(auth, 'cookie'),
    getAuthSecret(auth, 'headerValue'),
  ].filter((secret): secret is string => typeof secret === 'string' && secret.length > 0);

  let redacted = value;
  for (const secret of secrets) {
    redacted = redacted.replaceAll(secret, '[REDACTED]');
  }

  return redacted
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
        .replace(/\b(access_token|api[_-]?key|token|secret|password)=([^&\s]+)/gi, '$1=[REDACTED]');
}

function getAuthSecret(auth: AuthPayload, key: 'token' | 'cookie' | 'headerValue') {
  const secrets = auth as Partial<Record<'token' | 'cookie' | 'headerValue', string>>;
  return secrets[key];
}

export function outboundWorkerPath() {
  return fileURLToPath(workerUrl);
}
