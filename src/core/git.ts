import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { parseWorktrees, type Worktree } from './worktree.js';
import { loadConfig } from './config.js';

export const getCurrentToplevel = async (): Promise<string> => {
  const { stdout } = await execa('git', ['rev-parse', '--show-toplevel']);
  return stdout.trim();
};

// 只保留主 worktree + zt 自己创建的（路径在 rootDir 下），过滤 Claude Code 等其他来源
export const listWorktrees = async (): Promise<Worktree[]> => {
  const { stdout } = await execa('git', ['worktree', 'list', '--porcelain']);
  const { rootDir } = loadConfig();
  return parseWorktrees(stdout)
    .map((t) => ({ ...t, missing: t.bare ? false : !existsSync(t.path) }))
    .filter((t) => t.isPrimary || !t.missing || t.path.startsWith(rootDir));
};

export const getPrimaryPath = async (): Promise<string> => {
  const trees = await listWorktrees();
  const primary = trees.find((t) => t.isPrimary) ?? trees[0];
  if (!primary) throw new Error('当前不在 git 仓库中');
  return primary.path;
};

export const getPrimaryBranch = async (): Promise<string> => {
  const trees = await listWorktrees();
  return trees.find((t) => t.isPrimary)?.branch ?? 'main';
};

export const addWorktree = async (path: string, branch: string): Promise<void> => {
  await execa('git', ['worktree', 'add', '-b', branch, path]);
};

export const removeWorktree = async (path: string, force: boolean): Promise<void> => {
  const args = ['worktree', 'remove'];
  if (force) args.push('--force');
  args.push(path);
  await execa('git', args);
};

export const pruneWorktrees = async (): Promise<number> => {
  try {
    const { stdout } = await execa('git', ['worktree', 'prune', '--verbose']);
    return stdout.trim().split('\n').filter((l) => l.startsWith('Removing ')).length;
  } catch {
    return 0;
  }
};

export const getDirtyCount = async (path: string): Promise<number> => {
  if (!existsSync(path)) return 0;
  const { stdout } = await execa('git', ['-C', path, 'status', '--porcelain']);
  const trimmed = stdout.trim();
  if (!trimmed) return 0;
  return trimmed.split('\n').length;
};

export const getBehindCount = async (path: string, mainBranch: string): Promise<number> => {
  if (!mainBranch || !existsSync(path)) return 0;
  try {
    const { stdout } = await execa('git', ['-C', path, 'rev-list', '--count', `${mainBranch}..HEAD`]);
    return Number(stdout.trim()) || 0;
  } catch {
    return 0;
  }
};
