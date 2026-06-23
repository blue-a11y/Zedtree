import pc from 'picocolors';
import Table from 'cli-table3';
import { basename, relative } from 'node:path';
import type { Worktree } from '../core/worktree.js';
import type { SelectItem } from '../core/selector.js';

export type WorktreeStatus = { dirty: number; behind: number; missing?: boolean };

export const formatStatus = (st: WorktreeStatus): string => {
  if (st.missing) return pc.red('missing');
  const parts: string[] = [];
  if (st.dirty > 0) parts.push(pc.red(`${st.dirty} dirty`));
  if (st.behind > 0) parts.push(pc.yellow(`${st.behind} behind`));
  if (parts.length === 0) return pc.green('clean');
  return parts.join(pc.dim(' · '));
};

const STAR = pc.green('★');
const SPACE = ' ';

const displayPath = (path: string, primaryPath: string): string => {
  if (path === primaryPath) return pc.dim('~');
  const rel = relative(primaryPath, path);
  if (rel.startsWith('..')) return `~/${basename(path)}`;
  return rel;
};

export const renderWorktreeTable = (
  trees: Worktree[],
  statuses: Map<string, WorktreeStatus>,
  currentPath: string,
  primaryPath: string,
): string => {
  const table = new Table({ head: ['', '分支', '路径', '状态'], style: { head: ['cyan'] } });
  trees.forEach((t) => {
    const isCurrent = t.path === currentPath;
    const st = statuses.get(t.path) ?? { dirty: 0, behind: 0 };
    table.push([
      isCurrent ? STAR : SPACE,
      isCurrent ? pc.green(t.branch) : t.branch,
      displayPath(t.path, primaryPath),
      formatStatus(st),
    ]);
  });
  return table.toString();
};

export const toSelectItem = (t: Worktree, st: WorktreeStatus): SelectItem => ({
  name: t.branch,
  value: t.path,
  hint: formatStatus(st),
});
