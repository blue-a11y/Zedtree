import {
  getCurrentToplevel,
  listWorktrees,
  getDirtyCount,
  getBehindCount,
  getPrimaryBranch,
} from '../core/git.js';
import { renderWorktreeTable, type WorktreeStatus } from '../utils/format.js';

export const runList = async (): Promise<void> => {
  const trees = await listWorktrees();
  if (trees.length === 0) {
    console.log('（没有 worktree）');
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
  console.log(renderWorktreeTable(trees, statuses, current, primaryPath));
};
