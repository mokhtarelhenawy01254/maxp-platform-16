import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SECRETS_PATH = join(homedir(), '.opencode', 'secrets.json');

function loadSecrets() {
  if (!existsSync(SECRETS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SECRETS_PATH, 'utf-8'));
  } catch (e) {
    return {};
  }
}

export default async () => {
  return {
    'shell.env': (_input, output) => {
      Object.assign(output, loadSecrets());
    }
  };
};
