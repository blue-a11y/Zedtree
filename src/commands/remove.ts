import { listWorktrees, removeWorktree, getDirtyCount } from '../core/git.js';
import { selectWorktree, confirmDanger } from '../core/selector.js';
import { toSelectItem } from '../utils/format.js';

export const runRemove = async (
  name: string | undefined,
  force: boolean,
): Promise<void> => {
  const trees = await listWorktrees();
  if (trees.length === 0) {
    console.log('（没有 worktree）');
    return;
  }

  let targetTree = name ? trees.find((t) => t.branch === name) : undefined;

  if (!targetTree) {
    const items = await Promise.all(
      trees.map(async (t) => {
        if (t.missing || t.bare) return toSelectItem(t, { dirty: 0, behind: 0, missing: t.missing });
        const dirty = await getDirtyCount(t.path);
        return toSelectItem(t, { dirty, behind: 0 });
      }),
    );
    const picked = await selectWorktree(items);
    if (!picked) {
      console.log('已取消');
      process.exit(1);
    }
    targetTree = trees.find((t) => t.path === picked);
  }

  if (!targetTree) {
    throw new Error('未找到对应 worktree');
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
