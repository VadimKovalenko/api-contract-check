import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { initialState } from './constants';
import type { AuthType, CheckFormState, CheckResult, HealthTone } from '../../types';

type AuthPayload =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'cookie'; cookie: string }
  | { type: 'custom'; headerName: string; headerValue: string };

interface CheckPayload {
  url: string;
  yamlSpec: string;
  auth: AuthPayload;
}

function buildAuth(form: CheckFormState): AuthPayload {
  if (form.authType === 'bearer') return { type: 'bearer', token: form.token };
  if (form.authType === 'cookie') return { type: 'cookie', cookie: form.cookie };
  if (form.authType === 'custom') {
    return { type: 'custom', headerName: form.headerName, headerValue: form.headerValue };
  }
  return { type: 'none' };
}

function getHealth(result: CheckResult | null): HealthTone {
  if (!result) return 'neutral';
  if (result.coveragePercent >= 90) return 'good';
  if (result.coveragePercent >= 60) return 'warn';
  return 'bad';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The check failed.';
}

async function checkSchema(payload: CheckPayload): Promise<CheckResult> {
  const response = await fetch('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as CheckResult | { error?: string };

  if (!response.ok) {
    throw new Error('error' in body ? body.error || 'The check failed.' : 'The check failed.');
  }

  return body as CheckResult;
}

export function useSchemaCheck() {
  const [form, setForm] = useState<CheckFormState>(initialState);
  const [result, setResult] = useState<CheckResult | null>(null);
  const checkMutation = useMutation({
    mutationFn: checkSchema,
    onError: () => setResult(null),
    onSuccess: setResult,
  });

  const health = useMemo(() => getHealth(result), [result]);

  function updateField<Field extends keyof CheckFormState>(field: Field, value: CheckFormState[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function runCheck(event?: FormEvent) {
    event?.preventDefault();

    try {
      await checkMutation.mutateAsync({
        url: form.url,
        yamlSpec: form.yamlSpec,
        auth: buildAuth(form),
      });
    } catch {
      // The mutation owns the error state exposed below.
    }
  }

  const error = checkMutation.isError ? getErrorMessage(checkMutation.error) : '';
  const loading = checkMutation.isPending;

  return { error, form, health, loading, result, runCheck, updateField };
}

export type SchemaCheckState = ReturnType<typeof useSchemaCheck>;
export type { AuthType };
