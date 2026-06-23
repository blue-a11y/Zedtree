import { spawnSync } from 'node:child_process';
import * as p from '@clack/prompts';

export type SelectItem = {
  name: string;
  value: string;
  hint: string;
};

const commandExists = (cmd: string): boolean => {
  const r = spawnSync('which', [cmd], { stdio: 'ignore' });
  return r.status === 0;
};

const selectViaFzf = (items: SelectItem[]): string | null => {
  const lines = items.map((it) => [it.name, it.hint, it.value].join('\t'));
  const r = spawnSync(
    'fzf',
    ['--prompt', 'worktree> ', '--ansi', '--delimiter', '\t', '--with-nth', '1,2', '--header', '分支 / 状态'],
    { input: lines.join('\n'), stdio: ['pipe', 'pipe', 'inherit'] },
  );
  if (r.status !== 0 || r.stdout == null) return null;
  const parts = r.stdout.toString().trim().split('\t');
  return parts[2] ?? null;
};

const selectViaPrompts = async (items: SelectItem[]): Promise<string | null> => {
  const options = items.map((it) => ({ value: it.value, label: `${it.name}  ${it.hint}` }));
  const result = await p.select({ message: '选择 worktree', options });
  if (p.isCancel(result)) return null;
  return result as string;
};

export const selectWorktree = async (items: SelectItem[]): Promise<string | null> => {
  if (items.length === 0) return null;
  if (commandExists('fzf')) return selectViaFzf(items);
  return selectViaPrompts(items);
};

export const confirmDanger = async (message: string): Promise<boolean> => {
  const result = await p.confirm({ message, initialValue: false });
  return !p.isCancel(result) && result === true;
};
