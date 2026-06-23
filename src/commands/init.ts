import { selectShell } from '../core/selector.js';
import { renderInitScript } from '../utils/shell.js';

export const runInit = async (shell?: string): Promise<void> => {
  const resolved = shell ?? await selectShell();
  if (!resolved) {
    console.log('已取消');
    return;
  }

  process.stdout.write(`${renderInitScript(resolved)}\n`);
};
