import { resolveWorktreeByBranch, selectWorktreeForContext } from '../core/picker.js';

export const runPath = async (name?: string): Promise<void> => {
  let target: string | undefined;

  if (name) {
    const tree = await resolveWorktreeByBranch(name);
    if (!tree) {
      console.error(`未找到分支 ${name} 的 worktree`);
      process.exit(2);
    }
    target = tree.path;
  } else {
    const tree = await selectWorktreeForContext();
    if (!tree) {
      process.exit(1);
    }
    target = tree.path;
  }

  process.stdout.write(`${target}\n`);
};
