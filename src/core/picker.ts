import type { Worktree } from './worktree.js';
import { getBehindCount, getCurrentToplevel, getDirtyCount, getPrimaryBranch, listWorktrees } from './git.js';
import { listManagedProjects } from './project.js';
import { selectItem, selectWorktree } from './selector.js';
import { toSelectItem } from '../utils/format.js';

const isInGitRepo = async (): Promise<boolean> => {
  try {
    await getCurrentToplevel();
    return true;
  } catch {
    return false;
  }
};

const primaryBranchOf = (trees: Worktree[]): string => (
  trees.find((t) => t.isPrimary)?.branch ?? 'main'
);

const buildWorktreeItems = async (
  trees: Worktree[],
  mainBranch: string,
) => Promise.all(
  trees.map(async (t) => {
    if (t.missing || t.bare) return toSelectItem(t, { dirty: 0, behind: 0, missing: t.missing });
    const [dirty, behind] = await Promise.all([
      getDirtyCount(t.path),
      getBehindCount(t.path, mainBranch),
    ]);
    return toSelectItem(t, { dirty, behind });
  }),
);

export const selectFromWorktrees = async (
  trees: Worktree[],
  message = '选择 worktree',
): Promise<Worktree | null> => {
  if (trees.length === 0) return null;
  const items = await buildWorktreeItems(trees, primaryBranchOf(trees));
  const picked = message === '选择 worktree'
    ? await selectWorktree(items)
    : await selectItem(message, items);
  if (!picked) return null;
  return trees.find((t) => t.path === picked) ?? null;
};

export const selectWorktreeForContext = async (): Promise<Worktree | null> => {
  if (await isInGitRepo()) {
    const trees = await listWorktrees();
    const mainBranch = await getPrimaryBranch();
    const items = await buildWorktreeItems(trees, mainBranch);
    const picked = await selectWorktree(items);
    if (!picked) return null;
    return trees.find((t) => t.path === picked) ?? null;
  }

  const projects = await listManagedProjects();
  if (projects.length === 0) {
    throw new Error('当前不在 git 仓库中，且没有 zt 管理的项目');
  }

  const pickedProject = await selectItem(
    '选择项目',
    projects.map((project) => ({
      name: project.name,
      value: project.name,
      hint: `${project.worktrees.length} worktree`,
    })),
  );
  if (!pickedProject) return null;

  const project = projects.find((p) => p.name === pickedProject);
  if (!project) return null;
  return selectFromWorktrees(project.worktrees, '选择分支');
};

export const resolveWorktreeByBranch = async (branch: string): Promise<Worktree | null> => {
  if (await isInGitRepo()) {
    const trees = await listWorktrees();
    return trees.find((t) => t.branch === branch) ?? null;
  }

  const matches = (await listManagedProjects())
    .flatMap((project) => project.worktrees)
    .filter((t) => t.branch === branch);

  if (matches.length > 1) {
    throw new Error(`分支 ${branch} 存在于多个项目，请先进入目标 git 仓库或直接运行 zt 选择项目`);
  }
  return matches[0] ?? null;
};
