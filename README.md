# Zedtree (`zt`) 🌳

面向 zed 用户和 agent 的 git worktree 切换器。一条命令定位 worktree，并在 zed 中秒级切换。

仓库：`blue-a11y/Zedtree`

## 安装

```bash
npm install -g zt
```

## 命令速查

| 命令 | 别名 | 作用 |
|---|---|---|
| `zt` | — | 选择 worktree 并在 zed 打开；git 外先选项目，再选分支 |
| `zt ls` | `list` | 列出所有 worktree（分支 / 状态 / 当前标记，`--json` 输出结构化数据） |
| `zt new <branch>` | `n` | 创建分支 + worktree，`-o` 立即在 zed 打开 |
| `zt open [name]` | `o` | 在 zed 打开（缺省交互选择） |
| `zt rm [name]` | — | 删除（dirty 二次确认，主 worktree 拒删，`-f` 跳过） |
| `zt prune` | `p` | 清理失效引用 |
| `zt init <shell>` | — | 输出 shell 集成脚本（zsh / bash / fish） |
| `zt path [name]` | — | 输出 worktree 路径（无参弹选择器） |
| `zt migrate [branch]` | — | 迁移已有 worktree 到 zt 管理目录 |
| `zt setup [shell]` | — | 确认后把 shell 集成写入 rc 文件 |

## Shell 集成（cd 支持）

在 `~/.zshrc` 加一行：

```bash
eval "$(zt init zsh)"
```

之后用 `zw <branch>` 即可 cd 到对应 worktree（无参会弹选择器）。bash / fish 同理。

也可以执行 `zt setup zsh`，确认后自动写入 rc 文件。

## 选择规则

- 在 git 仓库内运行 `zt` / `zt open` / `zt path` / `zt rm`：直接选择当前仓库的分支 worktree。
- 在非 git 目录运行这些无参交互命令：先选择 `~/.zt/worktrees` 下的项目，再选择该项目的分支 worktree。

## Worktree 布局

集中存放在 `~/.zt/worktrees/<repo>/<branch>`，主仓库保持干净、零 `.gitignore`。

## 配置（可选）

`~/.zt/config.json`：

```json
{
  "rootDir": "~/.zt/worktrees",
  "openMode": "focus"
}
```

优先级：CLI flag > config > 默认。

## 依赖

- **git**
- **zed CLI**（zed 菜单 → Install CLI）

## License

MIT
