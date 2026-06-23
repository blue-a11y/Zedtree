import {
  getCurrentToplevel,
  listWorktrees,
  getDirtyCount,
  getBehindCount,
  getPrimaryBranch,
} from '../core/git.js';
import { renderWorktreeTable, type WorktreeStatus } from '../utils/format.js';

type ListOptions = {
  json?: boolean;
};

const getStatusText = (status: WorktreeStatus): string => {
  if (status.missing) return 'missing';
  if (status.dirty === 0 && status.behind === 0) return 'clean';
  return 'changed';
};

export const runList = async (opts: ListOptions = {}): Promise<void> => {
  const trees = await listWorktrees();
  if (trees.length === 0) {
    console.log(opts.json ? '[]' : '（没有 worktree）');
    return;
  }
  const primaryPath = trees.find((t) => t.isPrimary)?.path ?? '';
  const mainBranch = await getPrimaryBranch();
  const current = await getCurrentToplevel().catch(() => '');
  const statuses = new Map<string, WorktreeStatus>();
  await Promise.all(
    trees.map(async (t) => {
      if (t.missing || t.bare) {
        statuses.set(t.path, { dirty: 0, behind: 0, missing: t.missing });
        return;
      }
      const [dirty, behind] = await Promise.all([
        getDirtyCount(t.path),
        getBehindCount(t.path, mainBranch),
      ]);
      statuses.set(t.path, { dirty, behind });
    }),
  );
  if (opts.json === true) {
    const payload = trees.map((t) => {
      const status = statuses.get(t.path) ?? { dirty: 0, behind: 0 };
      return {
        branch: t.branch,
        path: t.path,
        head: t.head,
        current: t.path === current,
        primary: t.isPrimary,
        bare: t.bare,
        detached: t.detached,
        missing: t.missing,
        dirty: status.dirty,
        behind: status.behind,
        status: getStatusText(status),
      };
    });
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  console.log(renderWorktreeTable(trees, statuses, current, primaryPath));
};
