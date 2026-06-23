import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { selectShell, confirmDanger } from '../core/selector.js';
import { renderInitScript } from '../utils/shell.js';

const SHELL_RC: Record<string, string> = {
  zsh: '.zshrc',
  bash: '.bashrc',
  fish: '.config/fish/config.fish',
};

const renderRcLine = (shell: string): string => {
  if (shell === 'fish') return 'zt init fish | source';
  return `eval "$(zt init ${shell})"`;
};

export const runSetup = async (shell?: string): Promise<void> => {
  const resolved = shell ?? await selectShell();
  if (!resolved) {
    console.log('已取消');
    return;
  }

  renderInitScript(resolved);
  const rcName = SHELL_RC[resolved];
  if (!rcName) throw new Error(`不支持的 shell: ${resolved}（可选 zsh / bash / fish）`);

  const rcPath = join(homedir(), rcName);
  const marker = renderRcLine(resolved);
  const content = existsSync(rcPath) ? readFileSync(rcPath, 'utf8') : '';
  if (content.includes(marker)) {
    console.log(`已存在 zt shell 集成: ${rcPath}`);
    return;
  }

  const ok = await confirmDanger(`确认把 zt shell 集成写入 ${rcPath}？`);
  if (!ok) {
    console.log('已取消');
    return;
  }

  mkdirSync(dirname(rcPath), { recursive: true });
  appendFileSync(rcPath, `\n# zt shell integration\n${marker}\n`);
  console.log(`✅ 已追加到 ${rcPath}`);
};
