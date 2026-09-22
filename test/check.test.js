import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCoverage,
  checkResponseAgainstSpec,
  extractJsonSchema,
  parseSpec,
} from '../server/check.js';
import { createApp } from '../server/app.js';
import { fetchEndpoint, redactSecrets } from '../server/outboundFetch.js';
import { applyYamlTab, formatYamlSpec } from '../src/components/RequestForm/hooks.js';

const userSchema = {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string' },
    profile: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        timezone: { type: 'string' },
      },
    },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  },
};

const yamlSpec = `
openapi: 3.0.0
paths:
  /users/{id}:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                type: object
                required: [id, name]
                properties:
                  id:
                    type: number
                  name:
                    type: string
                  email:
                    type: string
                  profile:
                    type: object
                    properties:
                      title:
                        type: string
                      timezone:
                        type: string
                  groups:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        label:
                          type: string
`;

test('coverage is 100% when all documented fields are present', () => {
  const result = calculateCoverage(userSchema, {
    id: 1,
    name: 'Ada',
    email: 'ada@example.test',
    profile: { title: 'Engineer', timezone: 'UTC' },
    groups: [{ id: 'admin', label: 'Admins' }],
  });

  assert.equal(result.coveragePercent, 100);
  assert.deepEqual(result.missingFields, []);
});

test('optional documented fields missing reduce coverage', () => {
  const result = calculateCoverage(userSchema, {
    id: 1,
    name: 'Ada',
    profile: { title: 'Engineer', timezone: 'UTC' },
    groups: [{ id: 'admin', label: 'Admins' }],
  });

  assert.equal(result.coveragePercent, 89);
  assert.deepEqual(result.missingFields, ['email']);
});

test('nested object fields are counted individually', () => {
  const result = calculateCoverage(userSchema, {
    id: 1,
    name: 'Ada',
    email: 'ada@example.test',
    profile: { title: 'Engineer' },
    groups: [{ id: 'admin', label: 'Admins' }],
  });

  assert.equal(result.total, 9);
  assert.ok(result.presentFields.includes('profile.title'));
  assert.ok(result.missingFields.includes('profile.timezone'));
});

test('documented array field missing reduces coverage without double counting item fields', () => {
  const result = calculateCoverage(userSchema, {
    id: 1,
    name: 'Ada',
    email: 'ada@example.test',
    profile: { title: 'Engineer', timezone: 'UTC' },
  });

  assert.equal(result.total, 7);
  assert.equal(result.coveragePercent, 86);
  assert.deepEqual(result.missingFields, ['groups']);
});

test('invalid YAML failures are surfaced', () => {
  assert.throws(() => parseSpec('paths:\n  /x: ['), /Invalid YAML/);
});

test('missing OpenAPI response schema failures are surfaced', () => {
  assert.throws(
    () => extractJsonSchema({ paths: { '/x': { get: { responses: { 200: {} } } } } }, '/x'),
    /No application\/json 200 response schema/,
  );
});

test('required schema validation errors are returned alongside coverage', () => {
  const result = checkResponseAgainstSpec({
    yamlSpec,
    requestPath: '/users/1',
    data: { id: 1 },
  });

  assert.equal(result.valid, false);
  assert.equal(result.coveragePercent, 20);
  assert.ok(result.validationErrors.some((error) => error.keyword === 'required'));
});

test('POST /api/check fetches JSON and returns validation and coverage', async () => {
  const app = createApp({
    outboundFetch: async ({ url, headers }) => {
      assert.equal(url, 'https://api.example.test/users/1');
      assert.equal(headers.Authorization, 'Bearer secret');

      return {
        status: 200,
        ok: true,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, name: 'Ada', email: 'ada@example.test' }),
      };
    },
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address();
    const response = await fetch('http://127.0.0.1:' + port + '/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://api.example.test/users/1',
        auth: { type: 'bearer', token: 'secret' },
        yamlSpec,
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.valid, true);
    assert.equal(body.coveragePercent, 60);
    assert.deepEqual(body.missingFields, ['profile', 'groups']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('outbound worker rejects loopback targets before making a request', async () => {
  await assert.rejects(
    () => fetchEndpoint({
      url: 'http://127.0.0.1:1/private',
      headers: {},
      limits: { timeoutMs: 1000, maxBytes: 1000, maxRedirects: 0 },
    }),
    /private or reserved address/,
  );
});

test('secret redaction removes configured credentials and token-like values', () => {
  const redacted = redactSecrets(
    'Bearer super-secret-token api_key=abc123 cookie=session=xyz',
    {
      type: 'custom',
      headerValue: 'super-secret-token',
      cookie: 'session=xyz',
    },
  );

  assert.equal(redacted, 'Bearer [REDACTED] api_key=[REDACTED] cookie=[REDACTED]');
});


test('YAML formatter normalizes OpenAPI YAML', () => {
  const formatted = formatYamlSpec('openapi: 3.0.0\npaths:\n  /users/{id}: {get: {responses: {200: {description: ok}}}}\n');

  assert.match(formatted, /openapi: 3\.0\.0/);
  assert.match(formatted, /\/users\/\{id\}:/);
  assert.match(formatted, /description: ok/);
});

test('YAML tab helper indents and outdents selected lines', () => {
  const indented = applyYamlTab('paths:\n/users:\nget: {}', 7, 21);

  assert.equal(indented.value, 'paths:\n  /users:\n  get: {}');
  assert.equal(indented.selectionStart, 9);

  const outdented = applyYamlTab(indented.value, 9, indented.value.length, true);

  assert.equal(outdented.value, 'paths:\n/users:\nget: {}');
});
