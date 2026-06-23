# Zedtree (`zt`) — git worktree × zed CLI 工具 · Goal 规格

> 📁 **目录约定**：
> - **GitHub 仓库**：`blue-a11y/Zedtree`
> - **源码项目**：`~/Documents/web/blue/zt`（blue 的代码项目统一放 `~/Documents/web/blue/`）
> - **运行时数据**：`~/.zt/`（worktree 数据、config.json）—— 与源码分离

## 0. 本轮小重构目标

这次重构不追求把 Zedtree 做成完整 git 工作台，而是把它收敛成一个可靠的小工具：人可以用它快速切换工作区，agent 可以用它稳定定位工作区。

### 0.1 面向用户

用户侧追求的是少记命令、少打字、少踩坑：

- 默认命令 `zt` 就是打开选择器并在 zed 中打开 worktree。
- 如果当前目录在 git 仓库内，交互选择直接展示当前仓库分支；如果当前目录不在 git 仓库内，先选择项目，再选择分支。
- 常用动作只保留创建、打开、进入、查看、删除、清理。
- 交互行为只在用户没有给出明确目标时发生；用户给了分支名但不存在时，必须直接报错。
- 删除、迁移这类高风险动作必须显式确认，不能因为输入错误而进入另一个可执行路径。

### 0.2 面向 agent

agent 侧追求的是可预测、可脚本化、可验证：

- 所有可被脚本消费的命令都要有稳定 stdout、stderr 和退出码。
- 传入明确参数时不能进入交互选择器。
- `zt path <branch>` 是最小稳定接口，只输出路径，不能混入说明文案。
- `zt ls --json` 是 P1 稳定接口，用于让 agent 获取 worktree 列表和状态。
- 交互命令和机器接口要分开：人用表格和选择器，agent 用纯文本或 JSON。

### 0.3 产品能力边界

Zedtree 只做 worktree 定位和 zed 切换，不做代码评审、分支同步、PR 创建、任务管理、多编辑器适配或全屏 TUI。新增能力必须服务以下两件事之一：

- 更快地把用户带到正确 worktree。
- 更稳定地让 agent 找到正确 worktree。

## 1. 角色与使命

你是 **Zedtree** 的实现 agent。Zedtree 是一个 Node.js / TypeScript 编写的命令行工具，命令名是 `zt`，仓库名是 `blue-a11y/Zedtree`。它服务 **zed 编辑器用户**和自动化 agent，让他们在终端用一条命令管理 git worktree，并在 zed 中秒级切换。

**北极星**：让用户或 agent 从"想定位某个 worktree"到"拿到路径或在 zed 打开"——**< 5 秒、1 条命令**，全程不碰 `git worktree` 语法、不手动 `cd` + `zed`。

## 2. 目标用户与场景

- **用户**：日常用 zed 写码、用 git worktree 做并行分支开发的工程师
- **典型场景**：
  - 正在 `feat-a` 干活，PM 催看 `main` 的 bug → `zt` 选 `main` 秒开
  - 新开需求 → `zt new feat-login -o` 一条命令建好分支 + worktree + zed 打开
  - 收尾清理 → `zt rm feat-old` 删掉

## 3. 功能规格（命令清单）

### 3.0 能力分层

P0 是这个小工具必须稳定交付的闭环：

- `zt` / `zt open [name]`：打开 worktree。
- `zt path [name]`：输出 worktree 路径，作为 shell 和 agent 的稳定入口。
- `zt ls`：让用户看清当前仓库有哪些 worktree。
- `zt new <branch>`：按统一目录创建 worktree。
- `zt rm [name]`：安全删除 worktree。
- `zt prune`：清理失效引用。
- `zt init <shell>`：输出 shell 集成脚本。

P1 是有价值但不能干扰 P0 简洁性的增强：

- `zt ls --json`：给 agent 的结构化列表。
- `zt migrate [branch]`：显式迁移已有 worktree 到 zt 管理目录。
- `zt setup [shell]`：可选地写入 rc 文件，必须二次确认。
- shell completion：补全命令、分支和 shell 名。

P2 暂不做：

- 多编辑器支持。
- git fetch / pull / rebase / push。
- PR、任务、工单、代码评审集成。
- 全屏 TUI 或常驻 daemon。

### 3.1 `zt`（无参数 · 默认行为）
- 在 git 仓库内：列出当前 git 仓库所有 worktree
- 在非 git 目录：先列出 `~/.zt/worktrees` 下的项目，再列出所选项目的 worktree
- 启动内置交互选择器（每行：分支名 + 状态标记）
- 选中后用 `zed` 打开该 worktree 路径
- **选择器**：使用 `@clack/prompts` 内置选择器，不依赖外部选择器工具
- 退出码：`0` 成功 / `1` 用户取消 / `2` 错误

### 3.2 `zt ls`（别名 `list`）
- 输出当前仓库所有 worktree 表格，列：`标记 | 分支 | 路径 | 状态`
- 标记：`>` = 当前 worktree，空格 = 其他
- 状态：`clean` / `●N`（N 个未提交文件）/ `↓N`（落后 main N 个 commit）
- 当前 worktree 由 `git rev-parse --show-toplevel` 识别
- P1 增加 `--json`：输出稳定 JSON，供 agent 消费

### 3.3 `zt new <branch>`（别名 `n`）
- **参数**：`branch`（必填，新分支名）
- **选项**：`-o, --open` 创建后立即在 zed 打开
- **行为**：`git worktree add -b <branch> <path>`
- **路径规则**：`~/.zt/worktrees/<repo>/<branch>`，其中 `<repo>` = 主仓库路径的 `basename`
- 分支已存在 → 报错并提示用 `zt open <branch>`
- 成功输出：✅ 创建的 worktree 路径

### 3.4 `zt open [name]`（别名 `o`）
- **参数**：`name`（可选，分支名）
- 缺省 → 内置选择器；git 外先选项目，再选分支
- 传入 `name` 但未找到 → 直接报错，不能回退到交互选择
- **行为**：`zed <worktree-path>`（复用已开窗口、聚焦）
- `zed` 不在 PATH → 友好提示安装命令（zed 菜单 → Install CLI）

### 3.5 `zt rm [name]`
- **参数**：`name`（可选）
- 缺省 → 内置选择器；git 外先选项目，再选分支
- 传入 `name` 但未找到 → 直接报错，不能回退到交互选择
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
- **输出**：对应 shell 的集成脚本，注入 `zw` 函数（函数体调用 `cd "$(zt path <name>)"`）
- **用法**：用户在 rc 文件加 `eval "$(zt init zsh)"`
- **约束**：只输出脚本，不写 rc 文件；需要自动写入 rc 的能力另做 `zt setup`（P1）

### 3.8 `zt path [name]`
- **参数**：`name`（可选分支名）
- **行为**：无参时弹内置选择器，git 外先选项目，再选分支；传参时直接输出对应 worktree 绝对路径到 stdout（供 shell 函数消费，不执行 cd）
- 传入 `name` 但未找到 → stderr 报错，退出码 2

### 3.9 `zt migrate [branch]`（P1）
- **参数**：`branch`（可选）
- **行为**：把仓库中已有、但不在 `~/.zt/worktrees/<repo>/` 下的 worktree 迁移到 zt 管理目录
- **安全**：迁移前展示计划并要求确认
- **约束**：不占用 `init` 语义，避免和 shell 初始化混淆

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
| 交互选择 | `@clack/prompts` 内置选择器 |
| 构建 | `tsup`（打包单文件，bin 指向 dist） |
| 包管理 | npm |

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
│   │   ├── path.ts
│   │   ├── migrate.ts
│   │   └── setup.ts
│   ├── core/
│   │   ├── git.ts      # git worktree 操作封装
│   │   ├── picker.ts   # git 内外统一选择流程
│   │   ├── project.ts  # zt 管理项目发现
│   │   ├── zed.ts      # zed CLI 封装
│   │   ├── selector.ts # 内置选择器
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
- **git 外选择**：扫描 `~/.zt/worktrees/<repo>/` 下的可用 worktree，先选 repo，再选分支
- **dirty 检测**：`git -C <path> status --porcelain` 统计行数
- **落后 commit**：`git -C <path> rev-list --count HEAD..<mainBranch>`
- **选择器**：`@clack/prompts` select
- **zed 调用**：`execa('zed', [path])`，detach 不等待返回

### 4.4 配置文件
`~/.zt/config.json`（可选），优先级：**CLI flag > config > 默认**
```json
{
  "rootDir": "~/.zt/worktrees",
  "openMode": "focus"
}
```

## 5. 验收标准（P0 达成 = MVP 成功）
- [x] `zt ls` 正确列出全部 worktree，标记 + 状态正确
- [x] `zt new <branch>` 创建到 `~/.zt/worktrees/<repo>/<branch>`，分支已存在时友好报错
- [x] `zt open <missing>` / `zt rm <missing>` / `zt path <missing>` 直接报错，不进入选择器
- [x] `zt rm` 对主 worktree 拒删（代码层），`-f` 跳过确认
- [x] 使用内置选择器，不依赖外部选择器工具
- [x] git 仓库内交互直接选分支，非 git 目录交互先选项目再选分支
- [x] `zed` 不在 PATH 时给出安装提示
- [x] `zt init <shell>` 只输出 shell 脚本，不写用户 rc 文件
- [x] `zt path <branch>` stdout 只输出路径，可被 shell 和 agent 稳定消费
- [x] `npm install -g .` 后 `zt` 全局可用
- [x] TypeScript `strict` 编译零错误（迁移后再次验证 exit=0）
- [x] 无魔法值（路径根、提示文案等提取为常量）
- [x] 内置选择器 + zed 打开
- [x] dirty 二次确认运行时

## 6. 约束与非目标
- 📁 **源码** `~/Documents/web/blue/zt`；**运行时数据** `~/.zt/`，两者分离
- ❌ 不做 TUI 全屏界面
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
