import * as p from '@clack/prompts';

export type SelectItem = {
  name: string;
  value: string;
  hint: string;
};

export const selectItem = async (
  message: string,
  items: SelectItem[],
): Promise<string | null> => {
  const options = items.map((it) => ({ value: it.value, label: `${it.name}  ${it.hint}` }));
  const result = await p.select({ message, options });
  if (p.isCancel(result)) return null;
  return result as string;
};

export const selectWorktree = async (items: SelectItem[]): Promise<string | null> => {
  if (items.length === 0) return null;
  return selectItem('选择 worktree', items);
};

export const confirmDanger = async (message: string): Promise<boolean> => {
  const result = await p.confirm({ message, initialValue: false });
  return !p.isCancel(result) && result === true;
};

const SHELL_OPTIONS = [
  { value: 'zsh', label: 'zsh', hint: '~/.zshrc' },
  { value: 'bash', label: 'bash', hint: '~/.bashrc' },
  { value: 'fish', label: 'fish', hint: '~/.config/fish/config.fish' },
];

export const selectShell = async (): Promise<string | null> => {
  const result = await p.select({ message: '选择 shell', options: SHELL_OPTIONS });
  if (p.isCancel(result)) return null;
  return result as string;
};
