import YAML from 'yaml';
import { authTypes } from './constants';

const defaultPathParamExamples: Record<string, string> = {
  id: '1',
  page: 'Earth',
  slug: 'earth',
  title: 'Earth',
};

export function useAuthTypes() {
  return authTypes;
}

export function formatYamlSpec(value: string) {
  const document = YAML.parseDocument(value);

  if (document.errors.length > 0) {
    throw new Error(document.errors[0]?.message ?? 'Invalid YAML.');
  }

  return document.toString({
    indent: 2,
    lineWidth: 0,
  });
}

export function deriveExampleUrlFromOpenApi(value: string) {
  try {
    const parsed = YAML.parse(value) as unknown;

    if (!isRecord(parsed) || !isRecord(parsed.paths)) {
      return '';
    }

    const serverUrl = getServerUrl(parsed.servers);
    if (!serverUrl) {
      return '';
    }

    const path = Object.entries(parsed.paths).find(([, pathItem]) => (
      isRecord(pathItem) && isRecord(pathItem.get)
    ))?.[0];

    if (!path) {
      return '';
    }

    return joinUrl(serverUrl, path.replace(/\{([^}]+)\}/g, (_match, key: string) => (
      encodeURIComponent(defaultPathParamExamples[key.toLowerCase()] ?? 'example')
    )));
  } catch {
    return '';
  }
}

export interface YamlTabResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function applyYamlTab(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  outdent = false,
): YamlTabResult {
  if (selectionStart === selectionEnd) {
    return outdent
      ? outdentAtCursor(value, selectionStart)
      : {
          value: value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd),
          selectionStart: selectionStart + 2,
          selectionEnd: selectionStart + 2,
        };
  }

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === '\n'
    ? selectionEnd - 1
    : selectionEnd;
  const selectedText = value.slice(lineStart, lineEnd);
  const lines = selectedText.split('\n');

  if (!outdent) {
    const indented = lines.map((line) => '  ' + line).join('\n');
    const added = indented.length - selectedText.length;

    return {
      value: value.slice(0, lineStart) + indented + value.slice(lineEnd),
      selectionStart: selectionStart + 2,
      selectionEnd: selectionEnd + added,
    };
  }

  let removedTotal = 0;
  const outdented = lines
    .map((line) => {
      const removed = line.startsWith('  ') ? 2 : line.startsWith('\t') ? 1 : 0;
      removedTotal += removed;
      return line.slice(removed);
    })
    .join('\n');

  return {
    value: value.slice(0, lineStart) + outdented + value.slice(lineEnd),
    selectionStart: Math.max(lineStart, selectionStart - getRemovedBeforeSelection(lines, lineStart, selectionStart)),
    selectionEnd: Math.max(lineStart, selectionEnd - removedTotal),
  };
}

function getRemovedBeforeSelection(lines: string[], lineStart: number, selectionStart: number) {
  let offset = lineStart;
  let removedBeforeSelection = 0;

  for (const line of lines) {
    if (offset >= selectionStart) {
      break;
    }

    if (line.startsWith('  ')) {
      removedBeforeSelection += 2;
    } else if (line.startsWith('\t')) {
      removedBeforeSelection += 1;
    }

    offset += line.length + 1;
  }

  return removedBeforeSelection;
}

function outdentAtCursor(value: string, selectionStart: number): YamlTabResult {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const beforeCursor = value.slice(lineStart, selectionStart);
  const removable = beforeCursor.endsWith('  ') ? 2 : beforeCursor.endsWith('\t') ? 1 : 0;

  if (removable === 0) {
    return { value, selectionStart, selectionEnd: selectionStart };
  }

  return {
    value: value.slice(0, selectionStart - removable) + value.slice(selectionStart),
    selectionStart: selectionStart - removable,
    selectionEnd: selectionStart - removable,
  };
}

function getServerUrl(servers: unknown) {
  if (!Array.isArray(servers)) {
    return '';
  }

  const firstServer = servers.find((server) => isRecord(server) && typeof server.url === 'string');
  return isRecord(firstServer) && typeof firstServer.url === 'string' ? firstServer.url.trim() : '';
}

function joinUrl(serverUrl: string, path: string) {
  return `${serverUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
