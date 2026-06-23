# zt 🌳

git worktree × zed CLI 切换器。一条命令管理 worktree，并在 zed 中秒级切换。

## 安装

```bash
npm install -g zt
```

## 命令速查

| 命令 | 别名 | 作用 |
|---|---|---|
| `zt` | — | 列出 worktree → fzf 选择 → zed 打开 |
| `zt ls` | `list` | 列出所有 worktree（分支 / 状态 / 当前标记） |
| `zt new <branch>` | `n` | 创建分支 + worktree，`-o` 立即在 zed 打开 |
| `zt open [name]` | `o` | 在 zed 打开（缺省交互选择） |
| `zt rm [name]` | — | 删除（dirty 二次确认，主 worktree 拒删，`-f` 跳过） |
| `zt prune` | `p` | 清理失效引用 |
| `zt init <shell>` | — | 输出 shell 集成脚本（zsh / bash / fish） |
| `zt cd [name]` | — | 输出 worktree 路径（供 shell 函数） |

## Shell 集成（cd 支持）

在 `~/.zshrc` 加一行：

```bash
eval "$(zt init zsh)"
```

之后用 `z <branch>` 即可 cd 到对应 worktree。bash / fish 同理。

## Worktree 布局

集中存放在 `~/.zt/worktrees/<repo>/<branch>`，主仓库保持干净、零 `.gitignore`。

## 配置（可选）

`~/.zt/config.json`：

```json
{
  "rootDir": "~/.zt/worktrees",
  "openMode": "focus",
  "selector": "fzf"
}
```

优先级：CLI flag > config > 默认。

## 依赖

- **git**
- **fzf**（可选，缺失自动降级到内置选择器）
- **zed CLI**（zed 菜单 → Install CLI）

## License

MIT
