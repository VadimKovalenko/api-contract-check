import express, { type Request, type Response } from 'express';
import cors from 'cors';
import {
  buildHeaders,
  checkResponseAgainstSpec,
  normalizeCheckError,
} from './check.js';
import { fetchEndpoint, redactSecrets } from './outboundFetch.js';
import type { CheckRequestBody, OutboundFetch } from './types.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_BAD_GATEWAY = 502;

export function createApp({ outboundFetch = fetchEndpoint }: { outboundFetch?: OutboundFetch } = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/check', async (req: Request<unknown, unknown, CheckRequestBody>, res: Response) => {
    const started = performance.now();

    try {
      const { url, auth, yamlSpec } = req.body ?? {};

      if (!url || typeof url !== 'string') {
        return res.status(HTTP_BAD_REQUEST).json({ error: 'A valid URL is required.' });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(HTTP_BAD_REQUEST).json({ error: 'The URL could not be parsed.' });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Only http and https URLs are supported.' });
      }

      const response = await outboundFetch({
        url: parsedUrl.toString(),
        headers: buildHeaders(auth),
      });

      const contentType = response.contentType ?? '';
      const rawBody = response.body ?? '';
      const responseTimeMs = Math.round(performance.now() - started);

      let json: unknown;
      try {
        json = rawBody ? JSON.parse(rawBody) as unknown : null;
      } catch {
        return res.status(HTTP_BAD_GATEWAY).json({
          error: 'The endpoint did not return valid JSON.',
          status: response.status,
          responseTimeMs,
          contentType,
          preview: redactSecrets(rawBody.slice(0, 4000), auth),
        });
      }

      const result = checkResponseAgainstSpec({
        yamlSpec,
        data: json,
        method: 'get',
        requestPath: parsedUrl.pathname,
      });

      return res.json({
        status: response.status,
        ok: response.ok,
        responseTimeMs,
        contentType,
        ...result,
        responsePreview: json,
      });
    } catch (error) {
      const normalized = normalizeCheckError(error);
      return res.status(normalized.statusCode).json({
        error: redactSecrets(normalized.message, req.body?.auth),
      });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

export const app = createApp();
