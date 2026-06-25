const ZSH_INIT = `# zt shell integration
zw() {
  local target
  if [ -n "\${NO_COLOR:-}" ]; then
    target=$(zt path "$@")
  else
    target=$(FORCE_COLOR="\${FORCE_COLOR:-1}" zt path "$@")
  fi
  if [ -n "$target" ]; then
    cd "$target"
  fi
}`;

const FISH_INIT = `# zt shell integration
function zw
  if set -q NO_COLOR
    set target (zt path $argv)
  else
    set -l zt_force_color 1
    if set -q FORCE_COLOR
      set zt_force_color $FORCE_COLOR
    end
    set target (env FORCE_COLOR=$zt_force_color zt path $argv)
  end
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
