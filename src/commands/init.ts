import { renderInitScript } from '../utils/shell.js';

export const runInit = (shell: string): void => {
  console.log(renderInitScript(shell));
};
