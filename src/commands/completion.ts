import { renderCompletionScript } from '../completion.js';

export const runCompletion = (shell: string): void => {
  console.log(renderCompletionScript(shell));
};
