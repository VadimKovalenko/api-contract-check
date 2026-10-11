import YAML from 'yaml';
import { Ajv, type ErrorObject } from 'ajv';
import type { AuthPayload, CheckResult, CoverageField, CoverageResult, JsonSchema, OpenApiPaths } from './types.js';

export class CheckError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'CheckError';
    this.statusCode = statusCode;
  }
}

export function normalizeCheckError(error: unknown) {
  if (error instanceof CheckError) {
    return error;
  }

  if (isErrorLike(error) && error.name === 'AbortError') {
    return new CheckError('The endpoint request timed out.', 504);
  }

  return new CheckError(isErrorLike(error) ? error.message : 'Unable to check this endpoint.', 500);
}

export function buildHeaders(auth: AuthPayload = { type: 'none' }) {
  const headers: Record<string, string> = {
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

export function parseSpec(yamlSpec: unknown): JsonSchema {
  if (!yamlSpec || typeof yamlSpec !== 'string') {
    throw new CheckError('A YAML OpenAPI spec is required.');
  }

  try {
    const parsed = YAML.parse(yamlSpec);
    if (!isRecord(parsed)) {
      throw new CheckError('The spec must be a YAML object.');
    }

    return parsed;
  } catch (error) {
    if (error instanceof CheckError) {
      throw error;
    }

    throw new CheckError(`Invalid YAML: ${isErrorLike(error) ? error.message : String(error)}`);
  }
}

export function extractJsonSchema(spec: JsonSchema, requestPath: string, method = 'get'): JsonSchema {
  const paths = spec.paths;
  if (!isRecord(paths)) {
    throw new CheckError('The spec must include a paths object.');
  }

  const pathKey = pickPathKey(paths as OpenApiPaths, requestPath);
  const pathItem = paths[pathKey];
  const operation = isRecord(pathItem) ? pathItem[method.toLowerCase()] : undefined;
  const responses = isRecord(operation) ? operation.responses : undefined;
  const response = isRecord(responses) ? responses['200'] ?? responses[200] : undefined;
  const content = isRecord(response) ? response.content : undefined;
  const jsonContent = isRecord(content) ? content['application/json'] : undefined;
  const schema = isRecord(jsonContent) ? jsonContent.schema : undefined;

  if (!isRecord(schema)) {
    throw new CheckError(
      `No application/json 200 response schema found for ${method.toUpperCase()} ${pathKey}.`,
    );
  }

  return dereferenceSchema(schema, spec) as JsonSchema;
}

export function checkResponseAgainstSpec({
  yamlSpec,
  data,
  requestPath,
  method = 'get',
}: {
  yamlSpec: unknown;
  data: unknown;
  requestPath: string;
  method?: string;
}): CheckResult {
  const spec = parseSpec(yamlSpec);
  const schema = extractJsonSchema(spec, requestPath, method);
  const validation = validateJson(schema, data);
  const coverage = calculateCoverage(schema, data);

  return {
    valid: validation.valid,
    validationErrors: validation.errors,
    missingFields: coverage.missingFields,
    missingRequiredFields: coverage.missingRequiredFields,
    missingOptionalFields: coverage.missingOptionalFields,
    unlistedFields: coverage.unlistedFields,
    presentFields: coverage.presentFields,
    coveragePercent: coverage.coveragePercent,
    documentedFieldCount: coverage.total,
    presentFieldCount: coverage.present,
  };
}

export function validateJson(schema: JsonSchema, data: unknown) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = Boolean(validate(data));

  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map(formatValidationError),
  };
}

export function calculateCoverage(schema: JsonSchema, data: unknown): CoverageResult {
  const fields = inspectSchemaNode(schema, data, '');
  const unlistedFields = inspectUnlistedFields(schema, data, '');
  const total = fields.length;
  const presentFields = fields.filter((field) => field.present).map((field) => field.path);
  const missingFields = fields.filter((field) => !field.present).map((field) => field.path);
  const missingRequiredFields = fields
    .filter((field) => !field.present && field.required)
    .map((field) => field.path);
  const missingOptionalFields = fields
    .filter((field) => !field.present && !field.required)
    .map((field) => field.path);

  return {
    total,
    present: presentFields.length,
    coveragePercent: total === 0 ? 100 : Math.round((presentFields.length / total) * 100),
    presentFields,
    missingFields,
    missingRequiredFields,
    missingOptionalFields,
    unlistedFields,
  };
}

function formatValidationError(error: ErrorObject) {
  return {
    path: error.instancePath || '/',
    message: error.message,
    keyword: error.keyword,
  };
}

function inspectSchemaNode(schema: unknown, data: unknown, basePath: string): CoverageField[] {
  if (!isRecord(schema)) {
    return [];
  }

  if (schema.type === 'array') {
    return inspectArrayItems(schema, data, basePath);
  }

  if (schema.type !== 'object' && !isRecord(schema.properties)) {
    return [];
  }

  const requiredKeys = getRequiredKeys(schema);

  return Object.entries(asRecord(schema.properties)).flatMap(([key, childSchema]) => {
    const childPath = basePath ? `${basePath}.${key}` : key;
    const hasField = hasOwn(data, key);
    const ownField = { path: childPath, present: hasField, required: requiredKeys.has(key) };

    if (!hasField || !isRecord(data)) {
      return [ownField];
    }

    return [ownField, ...inspectNestedNode(childSchema, data[key], childPath)];
  });
}

function inspectNestedNode(schema: unknown, data: unknown, path: string): CoverageField[] {
  if (!isRecord(schema)) {
    return [];
  }

  if (schema.type === 'object' || isRecord(schema.properties)) {
    return inspectSchemaNode(schema, data, path);
  }

  if (schema.type === 'array') {
    return inspectArrayItems(schema, data, path);
  }

  return [];
}

function inspectArrayItems(schema: JsonSchema, data: unknown, basePath: string): CoverageField[] {
  if (!Array.isArray(data) || !isRecord(schema.items) || data.length === 0) {
    return [];
  }

  if (schema.items.type === 'object' || isRecord(schema.items.properties)) {
    const itemFields = Object.entries(asRecord(schema.items.properties));
    const requiredKeys = getRequiredKeys(schema.items);

    return itemFields.flatMap(([key, itemSchema]) => {
      const path = `${basePath}[].${key}`;
      const present = data.some((item) => hasOwn(item, key));
      const matches = data.filter((item) => hasOwn(item, key)).map((item) => asRecord(item)[key]);
      const nested = matches.flatMap((value) => inspectNestedNode(itemSchema, value, path));

      return [{ path, present, required: requiredKeys.has(key) }, ...dedupeFields(nested)];
    });
  }

  return [];
}

function inspectUnlistedFields(schema: unknown, data: unknown, basePath: string): string[] {
  if (!isRecord(schema)) {
    return [];
  }

  if (schema.type === 'array') {
    return inspectUnlistedArrayItems(schema, data, basePath);
  }

  if (!isRecord(data) || (schema.type !== 'object' && !isRecord(schema.properties))) {
    return [];
  }

  const properties = asRecord(schema.properties);
  const propertyKeys = new Set(Object.keys(properties));
  const ownUnlisted = Object.keys(data)
    .filter((key) => !propertyKeys.has(key))
    .map((key) => (basePath ? `${basePath}.${key}` : key));

  const nested = Object.entries(properties).flatMap(([key, childSchema]) => {
    if (!hasOwn(data, key)) {
      return [];
    }

    const childPath = basePath ? `${basePath}.${key}` : key;
    return inspectUnlistedFields(childSchema, data[key], childPath);
  });

  return dedupeStrings([...ownUnlisted, ...nested]);
}

function inspectUnlistedArrayItems(schema: JsonSchema, data: unknown, basePath: string): string[] {
  if (!Array.isArray(data) || !isRecord(schema.items)) {
    return [];
  }

  return dedupeStrings(data.flatMap((item) => inspectUnlistedFields(schema.items, item, `${basePath}[]`)));
}

function dedupeFields(fields: CoverageField[]) {
  const byPath = new Map<string, CoverageField>();

  for (const field of fields) {
    const existing = byPath.get(field.path);
    byPath.set(field.path, {
      path: field.path,
      present: Boolean(existing?.present || field.present),
      required: Boolean(existing?.required || field.required),
    });
  }

  return [...byPath.values()];
}

function dedupeStrings(values: string[]) {
  return [...new Set(values)];
}

function hasOwn(value: unknown, key: string) {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function getRequiredKeys(schema: JsonSchema) {
  return new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((key): key is string => typeof key === 'string')
      : [],
  );
}

function pickPathKey(paths: OpenApiPaths, requestPath: string) {
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

function pathToRegex(path: string) {
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
function dereferenceSchema(schema: unknown, spec: JsonSchema, seen = new Set<string>()): unknown {
  if (!isRecord(schema)) {
    return schema;
  }

  if (typeof schema.$ref === 'string') {
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

function resolveRef(ref: string, spec: JsonSchema) {
  if (!ref.startsWith('#/')) {
    throw new CheckError(`Only local schema references are supported: ${ref}.`);
  }

  const resolved = ref
    .slice(2)
    .split('/')
    .reduce<unknown>((node, part) => (isRecord(node) ? node[part] : undefined), spec);

  if (!resolved) {
    throw new CheckError(`Schema reference could not be resolved: ${ref}.`);
  }

  return resolved;
}

function isRecord(value: unknown): value is Record<string | number, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value as Record<string, unknown> : {};
}

function isErrorLike(error: unknown): error is { name?: string; message: string } {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string';
}
