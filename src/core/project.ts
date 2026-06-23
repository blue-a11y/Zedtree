import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execa } from 'execa';
import { loadConfig } from './config.js';
import { parseWorktrees, type Worktree } from './worktree.js';

export type WorktreeProject = {
  name: string;
  path: string;
  worktrees: Worktree[];
};

const hasGitFile = (path: string): boolean => existsSync(join(path, '.git'));

const findManagedWorktreePaths = (path: string): string[] => {
  if (!existsSync(path)) return [];
  if (hasGitFile(path)) return [path];

  const found: string[] = [];
  const entries = readdirSync(path, { withFileTypes: true });
  entries.forEach((entry) => {
    if (!entry.isDirectory()) return;
    found.push(...findManagedWorktreePaths(join(path, entry.name)));
  });
  return found;
};

const listWorktreesFrom = async (
  cwd: string,
  managedRoot: string,
): Promise<Worktree[]> => {
  const { stdout } = await execa('git', ['-C', cwd, 'worktree', 'list', '--porcelain']);
  return parseWorktrees(stdout)
    .map((t) => ({ ...t, missing: t.bare ? false : !existsSync(t.path) }))
    .filter((t) => t.isPrimary || !t.missing || t.path.startsWith(managedRoot));
};

export const listManagedProjects = async (): Promise<WorktreeProject[]> => {
  const { rootDir } = loadConfig();
  if (!existsSync(rootDir)) return [];

  const entries = readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const projects: WorktreeProject[] = [];
  for (const entry of entries) {
    const projectPath = join(rootDir, entry.name);
    const managedPaths = findManagedWorktreePaths(projectPath);
    const firstPath = managedPaths[0];
    if (!firstPath) continue;

    try {
      const worktrees = await listWorktreesFrom(firstPath, projectPath);
      if (worktrees.length === 0) continue;
      projects.push({ name: entry.name, path: projectPath, worktrees });
    } catch {
      // Ignore stale project directories that no longer point at a git worktree.
    }
  }

  return projects;
};
