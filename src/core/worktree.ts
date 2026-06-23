import { basename, join } from 'node:path';
import { homedir } from 'node:os';

export const DEFAULT_ROOT_DIR = join(homedir(), '.zt', 'worktrees');

export type Worktree = {
  path: string;
  branch: string;
  head: string;
  bare: boolean;
  detached: boolean;
  isPrimary: boolean;
  missing: boolean;
};

export const deriveRepoName = (primaryPath: string): string => basename(primaryPath);

export const deriveWorktreePath = (
  rootDir: string,
  repo: string,
  branch: string,
): string => join(rootDir, repo, branch);

const stripRefsPrefix = (ref: string): string => ref.replace(/^refs\/heads\//, '');

type PorcelainField = {
  worktree?: string;
  head?: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
};

export const parseWorktrees = (porcelain: string): Worktree[] => {
  const text = porcelain.trim();
  if (!text) return [];
  const blocks = text.split(/\n\s*\n/);
  const trees: Worktree[] = [];
  blocks.forEach((block, index) => {
    const field: PorcelainField = { bare: false, detached: false };
    block.split('\n').forEach((line) => {
      if (line.startsWith('worktree ')) field.worktree = line.slice('worktree '.length);
      else if (line.startsWith('HEAD ')) field.head = line.slice('HEAD '.length);
      else if (line.startsWith('branch ')) field.branch = line.slice('branch '.length);
      else if (line === 'bare') field.bare = true;
      else if (line === 'detached') field.detached = true;
    });
    if (!field.worktree) return;
    const branch = field.detached
      ? (field.head?.slice(0, 7) ?? 'detached')
      : stripRefsPrefix(field.branch ?? 'unknown');
    trees.push({
      path: field.worktree,
      head: field.head ?? '',
      branch,
      bare: field.bare,
      detached: field.detached,
      isPrimary: index === 0,
      missing: false,
    });
  });
  return trees;
};
