import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { listAllWorktrees, moveWorktree } from '../core/git.js';
import { loadConfig } from '../core/config.js';
import { deriveRepoName, deriveWorktreePath } from '../core/worktree.js';

export const runMigrate = async (branch?: string): Promise<void> => {
  const config = loadConfig();
  const all = await listAllWorktrees();
  const primary = all.find((t) => t.isPrimary);
  if (!primary) throw new Error('未找到主 worktree');

  const candidates = all.filter(
    (t) => !t.isPrimary && !t.missing && !t.path.startsWith(config.rootDir),
  );
  const targets = branch ? candidates.filter((t) => t.branch === branch) : candidates;

  if (targets.length === 0) {
    console.log(
      branch
        ? `未找到分支 ${branch} 的可迁移 worktree`
        : '没有可迁移的 worktree（都已在 zt 管理下或目录缺失）',
    );
    return;
  }

  const repo = deriveRepoName(primary.path);
  console.log(`计划迁移 ${targets.length} 个 worktree 到 ${config.rootDir}/${repo}/:`);
  targets.forEach((t) => console.log(`  - ${t.branch}  ${t.path}`));

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const ans = await rl.question('\n确认迁移？(y/N) ');
    if (ans.trim().toLowerCase() !== 'y') {
      console.log('已取消');
      return;
    }
  } finally {
    rl.close();
  }

  for (const t of targets) {
    const newPath = deriveWorktreePath(config.rootDir, repo, t.branch);
    if (existsSync(newPath)) {
      console.log(`⏭️  ${t.branch} 目标已存在，跳过: ${newPath}`);
      continue;
    }
    try {
      mkdirSync(dirname(newPath), { recursive: true });
      await moveWorktree(t.path, newPath);
      console.log(`✅ ${t.branch}  ${t.path} → ${newPath}`);
    } catch (err) {
      const e = err as { stderr?: string; message?: string };
      console.error(`❌ ${t.branch}  ${e.stderr ?? e.message ?? String(err)}`);
    }
  }
};
