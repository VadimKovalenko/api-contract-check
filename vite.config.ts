import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import packageJson from './package.json';

function getReleaseVersion() {
  const ciRelease = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined;

  if (ciRelease?.startsWith('v')) {
    return ciRelease;
  }

  try {
    const tag = execFileSync('git', ['tag', '--points-at', 'HEAD', '--list', 'v*'], {
      encoding: 'utf8',
    }).trim().split('\n').find(Boolean);

    if (tag) {
      return tag;
    }
  } catch {
    // Git metadata is not available in every local build environment.
  }

  return `v${packageJson.version}`;
}

export default defineConfig({
  define: {
    __APP_RELEASE_VERSION__: JSON.stringify(getReleaseVersion()),
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
