import fs from 'fs';
import path from 'path';
import os from 'os';
import type { IntelConfig } from './types.js';

export const CONFIG_DIR = path.join(os.homedir(), '.ghost-intel');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS: IntelConfig = {
  anthropicApiKey: '',
  profile: {
    currentTitle: '',
    skills: [],
    yearsOfExperience: 0,
    targetRoles: [],
  },
  search: {
    keywords: ['software engineer', 'browser automation'],
    maxJobsPerSource: 50,
  },
};

export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

export function loadConfig(): IntelConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('No config found. Run: ghost-intel setup');
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as IntelConfig;
  } catch {
    throw new Error('Config file is corrupted. Run: ghost-intel setup');
  }
}

export function saveConfig(config: IntelConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const tmp = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
  fs.renameSync(tmp, CONFIG_PATH);
}

export function getOrCreateConfig(): IntelConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULTS);
    return structuredClone(DEFAULTS);
  }
  return loadConfig();
}
