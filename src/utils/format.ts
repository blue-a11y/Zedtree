import pc from 'picocolors';
import Table from 'cli-table3';
import { basename, relative } from 'node:path';
import type { Worktree } from '../core/worktree.js';
import type { SelectItem } from '../core/selector.js';

export type WorktreeStatus = { dirty: number; behind: number; missing?: boolean };
type Colors = Pick<typeof pc, 'bold' | 'cyan' | 'dim' | 'green' | 'red' | 'yellow'>;

const promptColors = pc.createColors(process.env.NO_COLOR ? false : true);

const formatStatusWith = (colors: Colors, st: WorktreeStatus): string => {
  if (st.missing) return colors.red('missing');
  const parts: string[] = [];
  if (st.dirty > 0) parts.push(colors.red(`${st.dirty} dirty`));
  if (st.behind > 0) parts.push(colors.yellow(`${st.behind} behind`));
  if (parts.length === 0) return colors.green('clean');
  return parts.join(colors.dim(' · '));
};

export const formatStatus = (st: WorktreeStatus): string => formatStatusWith(pc, st);

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
  name: t.isPrimary ? promptColors.bold(t.branch) : t.branch,
  value: t.path,
  hint: formatStatusWith(promptColors, st),
});

export const formatProjectHint = (count: number): string => (
  promptColors.cyan(`${count} worktree`)
);
