import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

export const DEFAULT_OUTBOUND_FETCH_LIMITS = {
  timeoutMs: 10_000,
  maxBytes: 1_000_000,
  maxRedirects: 3,
};

const workerUrl = new URL('./outboundFetch.worker.js', import.meta.url);

export class OutboundFetchError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'OutboundFetchError';
    this.statusCode = statusCode;
  }
}

export function fetchEndpoint({ url, headers, limits = DEFAULT_OUTBOUND_FETCH_LIMITS }) {
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
      worker.terminate();
      reject(new OutboundFetchError('The endpoint request timed out.', 504));
    }, timeoutMs);

    worker.once('message', (message) => {
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

    worker.once('error', (error) => {
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

export function redactSecrets(value, auth = {}) {
  if (typeof value !== 'string' || !value) {
    return value;
  }

  const secrets = [
    auth?.token,
    auth?.cookie,
    auth?.headerValue,
  ].filter((secret) => typeof secret === 'string' && secret.length > 0);

  let redacted = value;
  for (const secret of secrets) {
    redacted = redacted.replaceAll(secret, '[REDACTED]');
  }

  return redacted
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(access_token|api[_-]?key|token|secret|password)=([^&\s]+)/gi, '$1=[REDACTED]');
}

export function outboundWorkerPath() {
  return fileURLToPath(workerUrl);
}
