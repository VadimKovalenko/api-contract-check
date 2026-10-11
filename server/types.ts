import type { IncomingHttpHeaders } from 'node:http';

export type AuthPayload =
  | { type: 'none' }
  | { type: 'bearer'; token?: string }
  | { type: 'cookie'; cookie?: string }
  | { type: 'custom'; headerName?: string; headerValue?: string };

export interface CheckRequestBody {
  url?: unknown;
  auth?: AuthPayload;
  yamlSpec?: unknown;
}

export interface OutboundFetchLimits {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
}

export interface OutboundFetchOptions {
  url: string;
  headers: Record<string, string>;
  limits?: Partial<OutboundFetchLimits>;
}

export interface OutboundFetchResult {
  status: number;
  ok: boolean;
  contentType: string;
  headers?: Record<string, string>;
  body: string;
}

export type OutboundFetch = (options: OutboundFetchOptions) => Promise<OutboundFetchResult>;

export interface ValidationErrorItem {
  path: string;
  message?: string;
  keyword: string;
}

export interface CoverageField {
  path: string;
  present: boolean;
  required: boolean;
}

export interface CoverageResult {
  total: number;
  present: number;
  coveragePercent: number;
  presentFields: string[];
  missingFields: string[];
  missingRequiredFields: string[];
  missingOptionalFields: string[];
  unlistedFields: string[];
}

export interface CheckResult {
  valid: boolean;
  validationErrors: ValidationErrorItem[];
  missingFields: string[];
  missingRequiredFields: string[];
  missingOptionalFields: string[];
  unlistedFields: string[];
  presentFields: string[];
  coveragePercent: number;
  documentedFieldCount: number;
  presentFieldCount: number;
}

export type JsonSchema = Record<string, unknown>;
export type OpenApiPaths = Record<string, Record<string, unknown>>;
export type ResponseHeaders = IncomingHttpHeaders;
