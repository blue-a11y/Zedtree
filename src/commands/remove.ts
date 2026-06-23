import { removeWorktree, getDirtyCount } from '../core/git.js';
import { confirmDanger } from '../core/selector.js';
import { resolveWorktreeByBranch, selectWorktreeForContext } from '../core/picker.js';

export const runRemove = async (
  name: string | undefined,
  force: boolean,
): Promise<void> => {
  let targetTree = name
    ? await resolveWorktreeByBranch(name)
    : await selectWorktreeForContext();
  if (name && !targetTree) {
    throw new Error(`未找到分支 ${name} 的 worktree`);
  }

  if (!targetTree) {
    console.log('已取消');
    process.exit(1);
  }
  if (targetTree.isPrimary) {
    throw new Error('⛔ 拒绝删除主 worktree');
  }
  if (targetTree.missing) {
    throw new Error(`该 worktree 目录已缺失：${targetTree.path}\n用 \`zt prune\` 清理失效引用`);
  }

  if (!force && !targetTree.bare) {
    const dirty = await getDirtyCount(targetTree.path);
    if (dirty > 0) {
      const ok = await confirmDanger(
        `⚠️  ${targetTree.branch} 有 ${dirty} 个未提交变更，确认删除？`,
      );
      if (!ok) {
        console.log('已取消');
        process.exit(1);
      }
    }
  }

  await removeWorktree(targetTree.path, force);
  console.log(`🗑️  已删除: ${targetTree.path}`);
};
