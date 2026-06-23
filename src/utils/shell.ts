const ZSH_INIT = `# zt shell integration
z() {
  local target
  target=$(zt cd "$@")
  if [ -n "$target" ]; then
    cd "$target"
  fi
}`;

const FISH_INIT = `# zt shell integration
function z
  set target (zt cd $argv)
  if test -n "$target"
    cd "$target"
  end
end`;

const SCRIPTS: Record<string, string> = {
  zsh: ZSH_INIT,
  bash: ZSH_INIT,
  fish: FISH_INIT,
};

export const renderInitScript = (shell: string): string => {
  const script = SCRIPTS[shell];
  if (!script) throw new Error(`不支持的 shell: ${shell}（可选 zsh / bash / fish）`);
  return script;
};
