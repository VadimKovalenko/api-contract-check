import YAML from 'yaml';
import Ajv from 'ajv';

export class CheckError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'CheckError';
    this.statusCode = statusCode;
  }
}

export function normalizeCheckError(error) {
  if (error instanceof CheckError) {
    return error;
  }

  if (error?.name === 'AbortError') {
    return new CheckError('The endpoint request timed out.', 504);
  }

  return new CheckError(error?.message || 'Unable to check this endpoint.', 500);
}

export function buildHeaders(auth = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (!auth || auth.type === 'none') {
    return headers;
  }

  if (auth.type === 'bearer' && auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  if (auth.type === 'cookie' && auth.cookie) {
    headers.Cookie = auth.cookie;
  }

  if (auth.type === 'custom' && auth.headerName && auth.headerValue) {
    headers[auth.headerName] = auth.headerValue;
  }

  return headers;
}

export function parseSpec(yamlSpec) {
  if (!yamlSpec || typeof yamlSpec !== 'string') {
    throw new CheckError('A YAML OpenAPI spec is required.');
  }

  try {
    return YAML.parse(yamlSpec);
  } catch (error) {
    throw new CheckError(`Invalid YAML: ${error.message}`);
  }
}

export function extractJsonSchema(spec, requestPath, method = 'get') {
  const paths = spec?.paths;
  if (!paths || typeof paths !== 'object') {
    throw new CheckError('The spec must include a paths object.');
  }

  const pathKey = pickPathKey(paths, requestPath);
  const operation = paths[pathKey]?.[method.toLowerCase()];
  const responses = operation?.responses;
  const response = responses?.['200'] ?? responses?.[200];
  const schema = response?.content?.['application/json']?.schema;

  if (!schema) {
    throw new CheckError(
      `No application/json 200 response schema found for ${method.toUpperCase()} ${pathKey}.`,
    );
  }

  return dereferenceSchema(schema, spec);
}

export function checkResponseAgainstSpec({ yamlSpec, data, requestPath, method = 'get' }) {
  const spec = parseSpec(yamlSpec);
  const schema = extractJsonSchema(spec, requestPath, method);
  const validation = validateJson(schema, data);
  const coverage = calculateCoverage(schema, data);

  return {
    valid: validation.valid,
    validationErrors: validation.errors,
    missingFields: coverage.missingFields,
    presentFields: coverage.presentFields,
    coveragePercent: coverage.coveragePercent,
    documentedFieldCount: coverage.total,
    presentFieldCount: coverage.present,
  };
}

export function validateJson(schema, data) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: valid
      ? []
      : validate.errors.map((error) => ({
          path: error.instancePath || '/',
          message: error.message,
          keyword: error.keyword,
        })),
  };
}

export function calculateCoverage(schema, data) {
  const fields = inspectSchemaNode(schema, data, '');
  const total = fields.length;
  const presentFields = fields.filter((field) => field.present).map((field) => field.path);
  const missingFields = fields.filter((field) => !field.present).map((field) => field.path);

  return {
    total,
    present: presentFields.length,
    coveragePercent: total === 0 ? 100 : Math.round((presentFields.length / total) * 100),
    presentFields,
    missingFields,
  };
}

function inspectSchemaNode(schema, data, basePath) {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  if (schema.type === 'array') {
    return inspectArrayItems(schema, data, basePath);
  }

  if (schema.type !== 'object' && !schema.properties) {
    return [];
  }

  return Object.entries(schema.properties ?? {}).flatMap(([key, childSchema]) => {
    const childPath = basePath ? `${basePath}.${key}` : key;
    const hasField = hasOwn(data, key);
    const ownField = { path: childPath, present: hasField };

    if (!hasField) {
      return [ownField];
    }

    return [ownField, ...inspectNestedNode(childSchema, data[key], childPath)];
  });
}

function inspectNestedNode(schema, data, path) {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  if (schema.type === 'object' || schema.properties) {
    return inspectSchemaNode(schema, data, path);
  }

  if (schema.type === 'array') {
    return inspectArrayItems(schema, data, path);
  }

  return [];
}

function inspectArrayItems(schema, data, basePath) {
  if (!Array.isArray(data) || !schema.items || data.length === 0) {
    return [];
  }

  if (schema.items.type === 'object' || schema.items.properties) {
    const itemFields = Object.entries(schema.items.properties ?? {});
    return itemFields.flatMap(([key, itemSchema]) => {
      const path = `${basePath}[].${key}`;
      const present = data.some((item) => hasOwn(item, key));
      const matches = data.filter((item) => hasOwn(item, key)).map((item) => item[key]);
      const nested = matches.flatMap((value) => inspectNestedNode(itemSchema, value, path));

      return [{ path, present }, ...dedupeFields(nested)];
    });
  }

  return [];
}

function dedupeFields(fields) {
  const byPath = new Map();

  for (const field of fields) {
    const existing = byPath.get(field.path);
    byPath.set(field.path, {
      path: field.path,
      present: Boolean(existing?.present || field.present),
    });
  }

  return [...byPath.values()];
}

function hasOwn(value, key) {
  return value !== null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);
}

function pickPathKey(paths, requestPath) {
  if (paths[requestPath]) {
    return requestPath;
  }

  const match = Object.keys(paths).find((path) => pathToRegex(path).test(requestPath));
  if (match) {
    return match;
  }

  const firstPath = Object.keys(paths)[0];
  if (firstPath) {
    return firstPath;
  }

  throw new CheckError('The spec does not define any paths.');
}

function pathToRegex(path) {
  const pattern = path
    .split('/')
    .map((segment) => {
      if (/^\{[^}]+\}$/.test(segment)) {
        return '[^/]+';
      }

      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return new RegExp(`^${pattern}$`);
}

function dereferenceSchema(schema, spec, seen = new Set()) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (schema.$ref) {
    if (seen.has(schema.$ref)) {
      throw new CheckError(`Circular schema reference detected at ${schema.$ref}.`);
    }

    seen.add(schema.$ref);
    return dereferenceSchema(resolveRef(schema.$ref, spec), spec, seen);
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => dereferenceSchema(item, spec, new Set(seen)));
  }

  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, dereferenceSchema(value, spec, new Set(seen))]),
  );
}

function resolveRef(ref, spec) {
  if (!ref.startsWith('#/')) {
    throw new CheckError(`Only local schema references are supported: ${ref}.`);
  }

  const resolved = ref
    .slice(2)
    .split('/')
    .reduce((node, part) => node?.[part], spec);

  if (!resolved) {
    throw new CheckError(`Schema reference could not be resolved: ${ref}.`);
  }

  return resolved;
}
