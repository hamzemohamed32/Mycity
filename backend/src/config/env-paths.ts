import { existsSync } from 'fs';
import { resolve } from 'path';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function getEnvFileCandidates(): string[] {
  return unique([
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'backend', '.env'),
    resolve(__dirname, '../../.env'),
  ]).filter((candidate) => existsSync(candidate));
}

export function loadEnvFiles(): void {
  const loader = (process as typeof process & {
    loadEnvFile?: (path: string) => void;
  }).loadEnvFile;

  if (!loader) {
    return;
  }

  for (const envFile of getEnvFileCandidates()) {
    loader(envFile);
  }
}
