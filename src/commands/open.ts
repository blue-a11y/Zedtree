import { loadConfig } from '../core/config.js';
import { openInZed } from '../core/zed.js';
import { resolveWorktreeByBranch, selectWorktreeForContext } from '../core/picker.js';

export const runOpen = async (name?: string): Promise<void> => {
  const config = loadConfig();
  const targetTree = name
    ? await resolveWorktreeByBranch(name)
    : await selectWorktreeForContext();

  if (name && !targetTree) {
    throw new Error(`未找到分支 ${name} 的 worktree`);
  }
  if (!targetTree) {
    console.log('已取消');
    process.exit(1);
  }

  await openInZed(targetTree.path, config.openMode);
  console.log(`🚀 已在 zed 打开: ${targetTree.path}`);
};
