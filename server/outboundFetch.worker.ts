import type { LookupAddress } from 'node:dns';
import dns from 'node:dns/promises';
import http, { type IncomingHttpHeaders } from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { parentPort, workerData } from 'node:worker_threads';
import type { OutboundFetchLimits, OutboundFetchResult } from './types.js';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

interface WorkerInput {
  url: string;
  headers?: Record<string, string>;
  limits?: Partial<OutboundFetchLimits>;
}

interface FetchOptions {
  headers: Record<string, string>;
  limits: Partial<OutboundFetchLimits>;
}

if (!parentPort) {
  throw new Error('Outbound fetch worker requires a parent port.');
}

const input = workerData as WorkerInput;

main().catch((error: unknown) => {
  parentPort?.postMessage({
    ok: false,
    error: getErrorMessage(error),
    statusCode: getStatusCode(error),
  });
});

async function main() {
  const result = await fetchWithProtection(input.url, {
    headers: input.headers ?? {},
    limits: input.limits ?? {},
  });

  parentPort?.postMessage({ ok: true, result });
}

async function fetchWithProtection(rawUrl: string, options: FetchOptions, redirectCount = 0): Promise<OutboundFetchResult> {
  const limits = normalizeLimits(options.limits);
  const parsedUrl = parseOutboundUrl(rawUrl);
  const address = await resolvePublicAddress(parsedUrl.hostname);
  const response = await requestPinnedAddress(parsedUrl, address, options.headers, limits);

  if (isRedirect(response.status) && response.headers?.location) {
    if (redirectCount >= limits.maxRedirects) {
      throw withStatus(new Error('The endpoint redirected too many times.'), 502);
    }

    return fetchWithProtection(new URL(response.headers.location, parsedUrl).toString(), options, redirectCount + 1);
  }

  return response;
}

function normalizeLimits(limits: Partial<OutboundFetchLimits>): OutboundFetchLimits {
  return {
    timeoutMs: clampNumber(limits.timeoutMs, 1_000, 30_000, 10_000),
    maxBytes: clampNumber(limits.maxBytes, 1, 5_000_000, 1_000_000),
    maxRedirects: clampNumber(limits.maxRedirects, 0, 10, 3),
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}

function parseOutboundUrl(rawUrl: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw withStatus(new Error('The URL could not be parsed.'), 400);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw withStatus(new Error('Only http and https URLs are supported.'), 400);
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw withStatus(new Error('URLs with embedded credentials are not supported.'), 400);
  }

  return parsedUrl;
}

async function resolvePublicAddress(hostname: string) {
  if (net.isIP(hostname)) {
    assertPublicAddress(hostname);
    return hostname;
  }

  let records: LookupAddress[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw withStatus(new Error('The endpoint hostname could not be resolved.'), 400);
  }

  const publicRecords = records.filter((record) => isPublicAddress(record.address));
  if (publicRecords.length === 0 || !publicRecords[0]) {
    throw withStatus(new Error('The endpoint resolves to a private or reserved address.'), 400);
  }

  return publicRecords[0].address;
}

function assertPublicAddress(address: string) {
  if (!isPublicAddress(address)) {
    throw withStatus(new Error('The endpoint resolves to a private or reserved address.'), 400);
  }
}

function isPublicAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) {
    return isPublicIpv4(address);
  }

  if (family === 6) {
    return isPublicIpv6(address);
  }

  return false;
}

function isPublicIpv4(address: string) {
  const parts = address.split('.').map((part) => Number.parseInt(part, 10));
  const [a, b] = parts;

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && isBetween(b, 64, 127)) ||
    (a === 169 && b === 254) ||
    (a === 172 && isBetween(b, 16, 31)) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    (typeof a === 'number' && a >= 224)
  );
}

function isBetween(value: number | undefined, min: number, max: number) {
  return typeof value === 'number' && value >= min && value <= max;
}

function isPublicIpv6(address: string) {
  const lower = address.toLowerCase();
  const mapped = lower.match(/^::ffff:(d+.d+.d+.d+)$/);
  if (mapped?.[1]) {
    return isPublicIpv4(mapped[1]);
  }

  return !(
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    /^fe[89ab]/.test(lower) ||
    lower.startsWith('ff') ||
    lower.startsWith('2001:db8:')
  );
}

function requestPinnedAddress(
  parsedUrl: URL,
  address: string,
  headers: Record<string, string>,
  limits: OutboundFetchLimits,
): Promise<OutboundFetchResult> {
  const client = parsedUrl.protocol === 'https:' ? https : http;
  const requestHeaders = sanitizeHeaders(headers);
  requestHeaders.Host = parsedUrl.host;

  return new Promise((resolve, reject) => {
    const request = client.request({
      protocol: parsedUrl.protocol,
      hostname: address,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: 'GET',
      headers: requestHeaders,
      servername: parsedUrl.hostname,
      timeout: limits.timeoutMs,
    }, (response) => {
      let size = 0;
      const chunks: Buffer[] = [];

      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > limits.maxBytes) {
          request.destroy(withStatus(new Error('The endpoint response exceeded the size limit.'), 502));
          return;
        }

        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve({
          status: response.statusCode ?? 0,
          ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
          contentType: String(response.headers['content-type'] ?? ''),
          headers: normalizeResponseHeaders(response.headers),
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(withStatus(new Error('The endpoint request timed out.'), 504));
    });

    request.on('error', reject);
    request.end();
  });
}

function sanitizeHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers ?? {})
      .filter(([name, value]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && typeof value === 'string'),
  );
}

function normalizeResponseHeaders(headers: IncomingHttpHeaders) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value ?? '')]),
  );
}

function isRedirect(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

function withStatus(error: Error, statusCode: number) {
  return Object.assign(error, { statusCode });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to fetch the endpoint.';
}

function getStatusCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 502;
}
