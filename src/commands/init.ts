import { renderInitScript } from '../utils/shell.js';

export const runInit = (shell: string): void => {
  if (!shell) throw new Error('shell 必填：zt init <zsh|bash|fish>');
  process.stdout.write(`${renderInitScript(shell)}\n`);
};
