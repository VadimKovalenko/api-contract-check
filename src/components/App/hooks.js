import { useMemo, useState } from 'react';
import { initialState } from './constants';

function buildAuth(form) {
  if (form.authType === 'bearer') return { type: 'bearer', token: form.token };
  if (form.authType === 'cookie') return { type: 'cookie', cookie: form.cookie };
  if (form.authType === 'custom') {
    return { type: 'custom', headerName: form.headerName, headerValue: form.headerValue };
  }
  return { type: 'none' };
}

function getHealth(result) {
  if (!result) return 'neutral';
  if (result.coveragePercent >= 90) return 'good';
  if (result.coveragePercent >= 60) return 'warn';
  return 'bad';
}

export function useSchemaCheck() {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const health = useMemo(() => getHealth(result), [result]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function runCheck(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: form.url,
          yamlSpec: form.yamlSpec,
          auth: buildAuth(form),
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'The check failed.');
      }

      setResult(body);
    } catch (requestError) {
      setError(requestError.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return { error, form, health, loading, result, runCheck, updateField };
}
