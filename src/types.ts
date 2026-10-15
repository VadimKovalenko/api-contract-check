import type { ComponentType, CSSProperties, FormEvent } from 'react';
import type { LucideProps } from 'lucide-react';

export type AuthType = 'none' | 'bearer' | 'cookie' | 'custom';
export type HealthTone = 'neutral' | 'good' | 'warn' | 'bad';
export type Tone = HealthTone | 'cool' | 'present' | 'missing' | 'optional' | 'unlisted';
export type FieldHighlightTarget = 'response' | 'schema';

export interface FieldHighlight {
  path: string;
}

export interface CheckFormState {
  url: string;
  authType: AuthType;
  token: string;
  cookie: string;
  headerName: string;
  headerValue: string;
  yamlSpec: string;
}

export interface SavedYaml {
  id: string;
  title: string;
  url: string;
  yamlSpec: string;
  createdAt: string;
}

export interface ValidationErrorItem {
  path: string;
  message?: string;
  keyword: string;
}

export interface CheckResult {
  status: number;
  ok: boolean;
  responseTimeMs: number;
  contentType: string;
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
  responsePreview: unknown;
}

export type UpdateFormField = <Field extends keyof CheckFormState>(
  field: Field,
  value: CheckFormState[Field],
) => void;

export type RunCheck = (event?: FormEvent) => Promise<void>;

export interface MetricCardConfig {
  icon: ComponentType<LucideProps>;
  label: string;
  getValue: (result: CheckResult | null) => string | number;
  getTone: (result: CheckResult | null, health: HealthTone) => Tone;
  getMeter?: (result: CheckResult | null) => number;
  meterVariant?: 'ring';
}

export interface ResultListConfig {
  title: string;
  key: 'missingFields' | 'missingRequiredFields' | 'missingOptionalFields' | 'unlistedFields' | 'presentFields';
  emptyText: string;
  infoText?: string;
  tone: Tone;
}

export type StyleVars = CSSProperties & Record<`--${string}`, string>;
