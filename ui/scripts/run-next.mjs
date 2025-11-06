#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

const rootDir = resolve(process.cwd(), '..');
const envFiles = ['.env'];

for (const file of envFiles) {
  const fullPath = resolve(rootDir, file);
  if (existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: file !== '.env' });
  }
}

const [mode = 'dev', ...rest] = process.argv.slice(2);

const defaultPort = process.env.NEXT_UI_PORT ?? '6005';
const port = rest.includes('--port') || rest.includes('-p') ? null : defaultPort;

const env = {
  ...process.env,
  NEXT_UI_PORT: process.env.NEXT_UI_PORT ?? defaultPort,
  NEXT_DISABLE_TURBOPACK: process.env.NEXT_DISABLE_TURBOPACK ?? '1'
};
if (!env.PORT) {
  env.PORT = env.NEXT_UI_PORT;
}

const args = [mode];
if (port) {
  args.push('--port', env.NEXT_UI_PORT);
}
args.push(...rest);


const subprocess = spawn('next', args, {
  stdio: 'inherit',
  env,
  shell: false
});

subprocess.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
