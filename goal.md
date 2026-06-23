# zt — git worktree × zed CLI 工具 · Goal 规格

> 📁 **目录约定**：
> - **源码项目**：`~/Documents/web/blue/zt`（blue 的代码项目统一放 `~/Documents/web/blue/`）
> - **运行时数据**：`~/.zt/`（worktree 数据、config.json）—— 与源码分离

## 1. 角色与使命

你是 **zt** 的实现 agent。`zt` 是一个 Node.js / TypeScript 编写的命令行工具，服务 **zed 编辑器用户**，让他们在终端用一条命令管理 git worktree，并在 zed 中秒级切换。

**北极星**：让用户从"想切到某个 worktree"到"zed 里已经在那个 worktree 干活"——**< 5 秒、1 条命令**，全程不碰 `git worktree` 语法、不手动 `cd` + `zed`。

## 2. 目标用户与场景

- **用户**：日常用 zed 写码、用 git worktree 做并行分支开发的工程师
- **典型场景**：
  - 正在 `feat-a` 干活，PM 催看 `main` 的 bug → `zt` 选 `main` 秒开
  - 新开需求 → `zt new feat-login -o` 一条命令建好分支 + worktree + zed 打开
  - 收尾清理 → `zt rm feat-old` 删掉

## 3. 功能规格（命令清单）

### 3.1 `zt`（无参数 · 默认行为）
- 列出当前 git 仓库所有 worktree
- 启动 `fzf` 交互选择（每行：分支名 + 状态标记）
- 选中后用 `zed` 打开该 worktree 路径
- **降级**：`fzf` 不存在时改用 `@clack/prompts` 选择器
- 退出码：`0` 成功 / `1` 用户取消 / `2` 错误

### 3.2 `zt ls`（别名 `list`）
- 输出当前仓库所有 worktree 表格，列：`标记 | 分支 | 路径 | 状态`
- 标记：`>` = 当前 worktree，空格 = 其他
- 状态：`clean` / `●N`（N 个未提交文件）/ `↓N`（落后 main N 个 commit）
- 当前 worktree 由 `git rev-parse --show-toplevel` 识别

### 3.3 `zt new <branch>`（别名 `n`）
- **参数**：`branch`（必填，新分支名）
- **选项**：`-o, --open` 创建后立即在 zed 打开
- **行为**：`git worktree add -b <branch> <path>`
- **路径规则**：`~/.zt/worktrees/<repo>/<branch>`，其中 `<repo>` = 主仓库路径的 `basename`
- 分支已存在 → 报错并提示用 `zt open <branch>`
- 成功输出：✅ 创建的 worktree 路径

### 3.4 `zt open [name]`（别名 `o`）
- **参数**：`name`（可选，分支名）
- 缺省 → `fzf` 选择
- **行为**：`zed <worktree-path>`（复用已开窗口、聚焦）
- `zed` 不在 PATH → 友好提示安装命令（zed 菜单 → Install CLI）

### 3.5 `zt rm [name]`
- **参数**：`name`（可选）
- 缺省 → `fzf` 选择
- **选项**：`-f, --force` 跳过确认
- **安全**：
  - worktree 有未提交变更 → 二次确认（`@clack/prompts` confirm）
  - 主 worktree（`git worktree list --porcelain` 主条目）→ 拒绝删除并报错
- **行为**：`git worktree remove <path>`

### 3.6 `zt prune`（别名 `p`）
- **行为**：`git worktree prune`
- 输出清理的失效引用数

### 3.7 `zt init <shell>`
- **参数**：`shell` ∈ {`zsh`, `bash`, `fish`}
- **输出**：对应 shell 的集成脚本，注入 `z` 函数（函数体调用 `cd "$(zt cd <name>)"`）
- **用法**：用户在 rc 文件加 `eval "$(zt init zsh)"`

### 3.8 `zt cd [name]`
- **参数**：`name`
- **行为**：仅输出 worktree 绝对路径到 stdout（供 shell 函数消费，不执行 cd）

## 4. 技术设计

### 4.1 技术栈
| 类别 | 选型 |
|---|---|
| 语言 | TypeScript（`strict: true`） |
| 运行时 | Node.js ≥ 20 |
| 分发 | npm 全局包（`npm install -g zt`） |
| CLI 框架 | `cac` |
| subprocess | `execa` |
| 着色 | `picocolors` |
| 表格 | `cli-table3` |
| 交互选择 | 优先 shell out `fzf`，降级 `@clack/prompts` |
| 构建 | `tsup`（打包单文件，bin 指向 dist） |
| 包管理 | pnpm |

### 4.2 目录结构

**源码项目** `~/Documents/web/blue/zt`：
```
~/Documents/web/blue/zt/
├── package.json        # bin: { zt: ./dist/index.js }
├── tsconfig.json
├── tsup.config.ts
├── README.md
├── goal.md             # 本文件
├── src/
│   ├── index.ts        # 入口 + cac 命令路由
│   ├── commands/
│   │   ├── list.ts
│   │   ├── new.ts
│   │   ├── open.ts
│   │   ├── remove.ts
│   │   ├── prune.ts
│   │   ├── init.ts
│   │   └── cd.ts
│   ├── core/
│   │   ├── git.ts      # git worktree 操作封装
│   │   ├── zed.ts      # zed CLI 封装
│   │   ├── selector.ts # fzf + 降级选择器
│   │   ├── worktree.ts # worktree 模型 + 路径推导
│   │   └── config.ts   # 配置读写
│   └── utils/
│       ├── format.ts   # 表格/状态格式化
│       └── shell.ts    # init 脚本生成
├── dist/               # 构建产物
└── node_modules/       # 依赖
```

**运行时数据** `~/.zt`（与源码分离，不进版本控制）：
```
~/.zt/
├── config.json         # zt 运行时配置（可选）
└── worktrees/          # 用户 worktree 存放根
    └── <repo>/
        └── <branch>/
```

### 4.3 关键实现要点
- **worktree 列表**：`git worktree list --porcelain`，解析 `worktree <path>` / `branch <ref>` / `HEAD`
- **当前 worktree**：`git rev-parse --show-toplevel` 对比列表
- **repo 名**：主仓库路径 `basename`
- **worktree 根**：默认 `~/.zt/worktrees`（可经 `config.json` 的 `rootDir` 覆盖）
- **dirty 检测**：`git -C <path> status --porcelain` 统计行数
- **落后 commit**：`git -C <path> rev-list --count main..HEAD`
- **fzf 调用**：`spawnSync('fzf', ['--prompt', 'worktree> ', '--ansi'], { input, stdio: ['pipe','inherit','inherit'] })`
- **zed 调用**：`execa('zed', [path])`，detach 不等待返回

### 4.4 配置文件
`~/.zt/config.json`（可选），优先级：**CLI flag > config > 默认**
```json
{
  "rootDir": "~/.zt/worktrees",
  "openMode": "focus",
  "selector": "fzf"
}
```

## 5. 验收标准（P0 达成 = MVP 成功）
- [x] `zt ls` 正确列出全部 worktree，标记 + 状态正确
- [x] `zt new <branch>` 创建到 `~/.zt/worktrees/<repo>/<branch>`，分支已存在时友好报错
- [x] `zt rm` 对主 worktree 拒删（代码层），`-f` 跳过确认
- [x] `fzf` 不存在时降级到 `@clack/prompts`，不崩
- [x] `zed` 不在 PATH 时给出安装提示
- [x] `npm install -g .` 后 `zt` 全局可用
- [x] TypeScript `strict` 编译零错误（迁移后再次验证 exit=0）
- [x] 无魔法值（路径根、提示文案等提取为常量）
- [ ] fzf 交互选择 + zed 打开（需手动验证）
- [ ] dirty 二次确认运行时（需手动验证）

## 6. 约束与非目标
- 📁 **源码** `~/Documents/web/blue/zt`；**运行时数据** `~/.zt/`，两者分离
- ❌ 不做 TUI 全屏界面（fzf 够用）
- ❌ 不做 zed 扩展（市场不支持 worktree 扩展）
- ❌ 不做远程 worktree 同步
- ❌ 不支持 VS Code / 其他编辑器（只服务 zed）
- ❌ 不预先创建空目录、不写注释掉的代码、不写无意义 console.log
- ✅ 依赖最小化，启动快

## 7. 交付物
- 可 `npm install -g` 的 `zt` 包
- `README.md`：安装、命令速查、shell 集成步骤（`eval "$(zt init zsh)"`）
- P0 全部验收项通过

## 8. 编码规范（强制）
- 文件名 **kebab-case**；组件/函数用**箭头函数**
- 类型一律用 **`type`**，不用 `interface`；Props 命名 `I组件名Props`
- 禁止魔法值；常量集中定义
- 错误信息人类可读，带 emoji 但不过度
- 单文件 ≤ 200 行，超长必拆
