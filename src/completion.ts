import { listWorktrees } from './core/git.js';

export const runComplete = async (mode: string): Promise<void> => {
  if (mode === 'commands') {
    const cmds = [
      'ls', 'list', 'new', 'n', 'open', 'o', 'rm',
      'prune', 'p', 'init', 'cd', 'completion',
      '--help', '-h', '--version', '-v',
    ];
    process.stdout.write(cmds.join('\n'));
    return;
  }

  if (mode === 'branches') {
    try {
      const trees = await listWorktrees();
      const branches = trees
        .filter((t) => !t.bare && !t.missing)
        .map((t) => t.branch);
      process.stdout.write(branches.join('\n'));
    } catch {
      // 不在 git 仓库或无 worktree，输出空
    }
    return;
  }

  if (mode === 'shells') {
    process.stdout.write('zsh\nbash\nfish');
    return;
  }
};

const ZSH_COMPLETION = `#compdef zt

_zt() {
  local -a opts
  local state line context

  _arguments -C '1: :->cmd' '*::arg:->args'

  case \$state in
    cmd)
      opts=(\${(f)"\$(zt --complete commands 2>/dev/null)"})
      _describe 'command' opts
      ;;
    args)
      case \$words[1] in
        new|open|rm|cd)
          opts=(\${(f)"\$(zt --complete branches 2>/dev/null)"})
          _describe 'branch' opts
          ;;
        init|completion)
          _describe 'shell' '(zsh bash fish)'
          ;;
      esac
      ;;
  esac
}

compdef _zt zt`;

const BASH_COMPLETION = `_zt() {
  local cur words cword
  cur="\${COMP_WORDS[COMP_CWORD]}"
  if [ "\$COMP_CWORD" -eq 1 ]; then
    local cmds=\$(zt --complete commands 2>/dev/null)
    COMPREPLY=( \$(compgen -W "\$cmds" -- "\$cur") )
  else
    case "\${COMP_WORDS[1]}" in
      new|open|rm|cd)
        local branches=\$(zt --complete branches 2>/dev/null)
        COMPREPLY=( \$(compgen -W "\$branches" -- "\$cur") )
        ;;
      init|completion)
        COMPREPLY=( \$(compgen -W "zsh bash fish" -- "\$cur") )
        ;;
    esac
  fi
}
complete -F _zt zt`;

const FISH_COMPLETION = `function __zt_complete
  set -l cmd (commandline -opc)
  if test (count \$cmd) -le 2
    zt --complete commands 2>/dev/null
  else
    switch \$cmd[2]
      case new open rm cd
        zt --complete branches 2>/dev/null
      case init completion
        echo zsh bash fish
    end
  end
end
complete -c zt -f -a "(__zt_complete)"`;

const SCRIPTS: Record<string, string> = {
  zsh: ZSH_COMPLETION,
  bash: BASH_COMPLETION,
  fish: FISH_COMPLETION,
};

export const renderCompletionScript = (shell: string): string => {
  const script = SCRIPTS[shell];
  if (!script) throw new Error(`不支持的 shell: ${shell}（可选 zsh / bash / fish）`);
  return script;
};
