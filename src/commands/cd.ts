import { listWorktrees } from '../core/git.js';

export const runCd = async (name?: string): Promise<void> => {
  if (!name) {
    console.error('用法: zt cd <branch>');
    process.exit(2);
  }
  const trees = await listWorktrees();
  const tree = trees.find((t) => t.branch === name);
  if (!tree) {
    console.error(`未找到分支 ${name} 的 worktree`);
    process.exit(2);
  }
  process.stdout.write(`${tree.path}\n`);
};
