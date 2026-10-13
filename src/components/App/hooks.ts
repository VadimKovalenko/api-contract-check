import type { FormEvent, KeyboardEvent, PointerEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { initialAppState, initialState, savedYamlStorageKey } from './constants';
import { applyColorTheme, getColorVariables, type ThemeMode } from '../../colors';
import type { AuthType, CheckFormState, CheckResult, HealthTone, SavedYaml, StyleVars } from '../../types';

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

  function applySavedYaml(savedYaml: Pick<SavedYaml, 'url' | 'yamlSpec'>) {
    setForm((current) => ({
      ...current,
      authType: 'none',
      token: '',
      cookie: '',
      headerValue: '',
      url: savedYaml.url,
      yamlSpec: savedYaml.yamlSpec,
    }));
    setResult(null);
    checkMutation.reset();
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

  return { applySavedYaml, error, form, health, loading, result, runCheck, updateField };
}

export type SchemaCheckState = ReturnType<typeof useSchemaCheck>;
export type { AuthType };

function parseSavedYamls(value: string | null): SavedYaml[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is SavedYaml => (
      typeof item === 'object'
      && item !== null
      && 'id' in item
      && 'title' in item
      && 'url' in item
      && 'yamlSpec' in item
      && 'createdAt' in item
      && typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.url === 'string'
      && typeof item.yamlSpec === 'string'
      && typeof item.createdAt === 'string'
    ));
  } catch {
    return [];
  }
}

function createSavedYamlId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSavedYamlLibrary() {
  const [savedYamls, setSavedYamls] = useState<SavedYaml[]>(() => (
    parseSavedYamls(window.localStorage.getItem(savedYamlStorageKey))
  ));

  useEffect(() => {
    window.localStorage.setItem(savedYamlStorageKey, JSON.stringify(savedYamls));
  }, [savedYamls]);

  function createSavedYaml({
    title,
    url,
    yamlSpec,
  }: Pick<SavedYaml, 'title' | 'url' | 'yamlSpec'>) {
    const savedYaml: SavedYaml = {
      id: createSavedYamlId(),
      title: title.trim() || 'Untitled YAML',
      url: url.trim(),
      yamlSpec,
      createdAt: new Date().toISOString(),
    };

    setSavedYamls((current) => [savedYaml, ...current]);
    return savedYaml;
  }

  function removeSavedYaml(id: string) {
    setSavedYamls((current) => current.filter((savedYaml) => savedYaml.id !== id));
  }

  return { createSavedYaml, removeSavedYaml, savedYamls };
}

export function useAppUiState() {
  const [appState] = useState(initialAppState);

  return appState;
}

export function useThemeController() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const isLightTheme = theme === 'light';

  useEffect(() => {
    applyColorTheme(theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const themeStyle = useMemo(() => getColorVariables(theme), [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return { isLightTheme, theme, themeStyle, toggleTheme };
}

const MIN_WORKSPACE_PANEL_PERCENT = 32;
const MAX_WORKSPACE_PANEL_PERCENT = 68;
const WORKSPACE_KEYBOARD_STEP = 4;

function clampWorkspacePercent(value: number) {
  return Math.min(Math.max(value, MIN_WORKSPACE_PANEL_PERCENT), MAX_WORKSPACE_PANEL_PERCENT);
}

export function useWorkspaceResize() {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [requestPanelPercent, setRequestPanelPercent] = useState(47);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!resizing) {
      return undefined;
    }

    function updateFromPointer(event: PointerEvent) {
      const bounds = workspaceRef.current?.getBoundingClientRect();

      if (!bounds || bounds.width <= 0) {
        return;
      }

      const nextPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
      setRequestPanelPercent(clampWorkspacePercent(nextPercent));
    }

    function stopResize() {
      setResizing(false);
    }

    window.addEventListener('pointermove', updateFromPointer);
    window.addEventListener('pointerup', stopResize, { once: true });
    window.addEventListener('pointercancel', stopResize, { once: true });

    return () => {
      window.removeEventListener('pointermove', updateFromPointer);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, [resizing]);

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (window.matchMedia('(max-width: 980px)').matches) {
      return;
    }

    event.preventDefault();
    setResizing(true);
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setRequestPanelPercent((current) => clampWorkspacePercent(current - WORKSPACE_KEYBOARD_STEP));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setRequestPanelPercent((current) => clampWorkspacePercent(current + WORKSPACE_KEYBOARD_STEP));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setRequestPanelPercent(MIN_WORKSPACE_PANEL_PERCENT);
    } else if (event.key === 'End') {
      event.preventDefault();
      setRequestPanelPercent(MAX_WORKSPACE_PANEL_PERCENT);
    }
  }

  const workspaceStyle: StyleVars = {
    '--workspace-request-width': `${requestPanelPercent}%`,
  };

  return {
    requestPanelPercent,
    resizing,
    startResize,
    workspaceRef,
    workspaceStyle,
    handleResizeKeyDown,
  };
}
