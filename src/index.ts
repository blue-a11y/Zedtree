import cac from 'cac';
import { runComplete } from './completion.js';
import { runList } from './commands/list.js';
import { runNew } from './commands/new.js';
import { runOpen } from './commands/open.js';
import { runRemove } from './commands/remove.js';
import { runPrune } from './commands/prune.js';
import { runPath } from './commands/path.js';
import { runCompletion } from './commands/completion.js';
import { runInit } from './commands/init.js';
import { runMigrate } from './commands/migrate.js';
import { runSetup } from './commands/setup.js';

const cli = cac('zt');

cli
  .command('[name]', '选择 worktree 并在 zed 打开（默认行为）')
  .action(async (name?: string) => {
    await runOpen(name);
  });

cli
  .command('ls', '列出所有 worktree')
  .alias('list')
  .option('--json', '输出 JSON（供 agent 使用）')
  .action((opts: { json?: boolean }) => runList(opts));

cli
  .command('new <branch>', '创建新 worktree')
  .alias('n')
  .option('-o, --open', '创建后立即在 zed 打开')
  .action(async (branch: string, opts: { open?: boolean }) => {
    await runNew(branch, opts.open === true);
  });

cli
  .command('open [name]', '在 zed 打开 worktree')
  .alias('o')
  .action(async (name?: string) => {
    await runOpen(name);
  });

cli
  .command('rm [name]', '删除 worktree')
  .option('-f, --force', '跳过确认')
  .action(async (name: string | undefined, opts: { force?: boolean }) => {
    await runRemove(name, opts.force === true);
  });

cli.command('prune', '清理失效 worktree 引用').alias('p').action(runPrune);

cli
  .command('path [name]', '输出 worktree 路径（供 shell 函数，无参弹选择器）')
  .action(async (name?: string) => {
    await runPath(name);
  });

cli
  .command('init <shell>', '输出 shell 集成脚本（zsh / bash / fish）')
  .action((shell: string) => {
    runInit(shell);
  });

cli
  .command('migrate [branch]', '把已有 worktree 迁移到 zt 管理目录')
  .action(async (branch?: string) => {
    await runMigrate(branch);
  });

cli
  .command('setup [shell]', '把 shell 集成写入 rc 文件（需要确认）')
  .action(async (shell?: string) => {
    await runSetup(shell);
  });

cli.command('completion <shell>', '输出 shell tab 补全脚本（zsh / bash / fish）').action((shell: string) => {
  runCompletion(shell);
});

cli.help();
cli.version('0.1.0');

const main = async (): Promise<void> => {
  // --complete 优先于 cac（避免被当作未知 option 报错）
  if (process.argv[2] === '--complete') {
    const mode = process.argv[3] ?? 'commands';
    await runComplete(mode);
    process.exit(0);
  }
  try {
    cli.parse(process.argv, { run: false });
    await cli.runMatchedCommand();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    process.exit(2);
  }
};

void main();
