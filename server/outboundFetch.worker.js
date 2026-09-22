import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { parentPort, workerData } from 'node:worker_threads';

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

main().catch((error) => {
  parentPort.postMessage({
    ok: false,
    error: error.message || 'Unable to fetch the endpoint.',
    statusCode: error.statusCode ?? 502,
  });
});

async function main() {
  const result = await fetchWithProtection(workerData.url, {
    headers: workerData.headers ?? {},
    limits: workerData.limits ?? {},
  });

  parentPort.postMessage({ ok: true, result });
}

async function fetchWithProtection(rawUrl, options, redirectCount = 0) {
  const limits = normalizeLimits(options.limits);
  const parsedUrl = parseOutboundUrl(rawUrl);
  const address = await resolvePublicAddress(parsedUrl.hostname);
  const response = await requestPinnedAddress(parsedUrl, address, options.headers, limits);

  if (isRedirect(response.status) && response.headers.location) {
    if (redirectCount >= limits.maxRedirects) {
      throw Object.assign(new Error('The endpoint redirected too many times.'), { statusCode: 502 });
    }

    return fetchWithProtection(new URL(response.headers.location, parsedUrl).toString(), options, redirectCount + 1);
  }

  return response;
}

function normalizeLimits(limits) {
  return {
    timeoutMs: clampNumber(limits.timeoutMs, 1_000, 30_000, 10_000),
    maxBytes: clampNumber(limits.maxBytes, 1, 5_000_000, 1_000_000),
    maxRedirects: clampNumber(limits.maxRedirects, 0, 10, 3),
  };
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}

function parseOutboundUrl(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error('The URL could not be parsed.'), { statusCode: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw Object.assign(new Error('Only http and https URLs are supported.'), { statusCode: 400 });
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw Object.assign(new Error('URLs with embedded credentials are not supported.'), { statusCode: 400 });
  }

  return parsedUrl;
}

async function resolvePublicAddress(hostname) {
  if (net.isIP(hostname)) {
    assertPublicAddress(hostname);
    return hostname;
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error('The endpoint hostname could not be resolved.'), { statusCode: 400 });
  }

  const publicRecords = records.filter((record) => isPublicAddress(record.address));
  if (publicRecords.length === 0) {
    throw Object.assign(new Error('The endpoint resolves to a private or reserved address.'), { statusCode: 400 });
  }

  return publicRecords[0].address;
}

function assertPublicAddress(address) {
  if (!isPublicAddress(address)) {
    throw Object.assign(new Error('The endpoint resolves to a private or reserved address.'), { statusCode: 400 });
  }
}

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    return isPublicIpv4(address);
  }

  if (family === 6) {
    return isPublicIpv6(address);
  }

  return false;
}

function isPublicIpv4(address) {
  const parts = address.split('.').map((part) => Number.parseInt(part, 10));
  const [a, b] = parts;

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPublicIpv6(address) {
  const lower = address.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
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

function requestPinnedAddress(parsedUrl, address, headers, limits) {
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
      const chunks = [];

      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > limits.maxBytes) {
          request.destroy(Object.assign(new Error('The endpoint response exceeded the size limit.'), { statusCode: 502 }));
          return;
        }

        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve({
          status: response.statusCode ?? 0,
          ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
          contentType: response.headers['content-type'] ?? '',
          headers: normalizeResponseHeaders(response.headers),
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(Object.assign(new Error('The endpoint request timed out.'), { statusCode: 504 }));
    });

    request.on('error', reject);
    request.end();
  });
}

function sanitizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers ?? {})
      .filter(([name, value]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && typeof value === 'string'),
  );
}

function normalizeResponseHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value ?? '')]),
  );
}

function isRedirect(status) {
  return [301, 302, 303, 307, 308].includes(status);
}
