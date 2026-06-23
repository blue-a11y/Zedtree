import { addWorktree, getPrimaryPath } from '../core/git.js';
import { deriveRepoName, deriveWorktreePath } from '../core/worktree.js';
import { loadConfig } from '../core/config.js';
import { openInZed } from '../core/zed.js';

type ExecaLike = { stderr?: string; stdout?: string; message?: string };

export const runNew = async (branch: string, shouldOpen: boolean): Promise<void> => {
  if (!branch) throw new Error('分支名必填：zt new <branch>');
  const config = loadConfig();
  const primaryPath = await getPrimaryPath();
  const repo = deriveRepoName(primaryPath);
  const worktreePath = deriveWorktreePath(config.rootDir, repo, branch);

  try {
    await addWorktree(worktreePath, branch);
  } catch (err) {
    const e = err as ExecaLike;
    const msg = e.stderr ?? e.stdout ?? e.message ?? String(err);
    if (/already exists|exists/i.test(String(msg))) {
      throw new Error(`分支 ${branch} 已存在，用 \`zt open ${branch}\` 打开`);
    }
    throw new Error(String(msg));
  }

  console.log(`✅ 已创建 worktree: ${worktreePath}`);
  if (shouldOpen) {
    await openInZed(worktreePath, config.openMode);
    console.log('🚀 已在 zed 打开');
  }
};
