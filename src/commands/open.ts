import {
  listWorktrees,
  getDirtyCount,
  getBehindCount,
  getPrimaryBranch,
} from '../core/git.js';
import { loadConfig } from '../core/config.js';
import { openInZed } from '../core/zed.js';
import { selectWorktree } from '../core/selector.js';
import { toSelectItem } from '../utils/format.js';

export const runOpen = async (name?: string): Promise<void> => {
  const config = loadConfig();
  const trees = await listWorktrees();
  if (trees.length === 0) {
    console.log('（没有 worktree）');
    return;
  }

  let target = name ? trees.find((t) => t.branch === name)?.path : undefined;

  if (!target) {
    const mainBranch = await getPrimaryBranch();
    const items = await Promise.all(
      trees.map(async (t) => {
        if (t.missing || t.bare) return toSelectItem(t, { dirty: 0, behind: 0, missing: t.missing });
        const [dirty, behind] = await Promise.all([
          getDirtyCount(t.path),
          getBehindCount(t.path, mainBranch),
        ]);
        return toSelectItem(t, { dirty, behind });
      }),
    );
    const picked = await selectWorktree(items);
    target = picked ?? undefined;
  }

  if (!target) {
    console.log('已取消');
    process.exit(1);
  }

  await openInZed(target, config.openMode);
  console.log(`🚀 已在 zed 打开: ${target}`);
};
