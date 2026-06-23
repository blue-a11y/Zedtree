import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { DEFAULT_ROOT_DIR } from './worktree.js';

export type OpenMode = 'focus' | 'new-window';

export type SelectorKind = 'fzf' | 'prompts';

export type ZtConfig = {
  rootDir: string;
  openMode: OpenMode;
  selector: SelectorKind;
};

const CONFIG_PATH = join(homedir(), '.zt', 'config.json');

const DEFAULT_CONFIG: ZtConfig = {
  rootDir: DEFAULT_ROOT_DIR,
  openMode: 'focus',
  selector: 'fzf',
};

const expandHome = (p: string): string => (p.startsWith('~/') ? join(homedir(), p.slice(2)) : p);

export const loadConfig = (): ZtConfig => {
  if (!existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ZtConfig>;
    const merged = { ...DEFAULT_CONFIG, ...parsed };
    return { ...merged, rootDir: expandHome(merged.rootDir) };
  } catch {
    return DEFAULT_CONFIG;
  }
};
