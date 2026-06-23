import { pruneWorktrees } from '../core/git.js';

export const runPrune = async (): Promise<void> => {
  const cleaned = await pruneWorktrees();
  console.log(`🧹 清理了 ${cleaned} 个失效引用`);
};
