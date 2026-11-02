# UXUCode 使用指南

[返回 README](../README.md)

## 1. 产品定位与适用场景

UXUCode 为 Claude Code 和 Codex 提供同一套软件工程工作流，帮助你把需求澄清、计划、实现、调试、测试、评审、简化和发布门禁连成可验证的过程。两个宿主使用不同的命令前缀，但任务含义和结果一致。

适合使用 UXUCode 的场景包括：

- 新功能、跨模块修改或验收标准尚未明确；
- 已有明确要求，需要拆分计划并逐项实施；
- 已观察到错误，需要先复现再修复；
- 合并或发布前，需要检查质量、安全、兼容性和回滚条件；
- 已验证功能正确，希望安全地降低复杂度。

如果你也使用 OpenClaw，可以把 UXUCode 的执行与输出策略应用到指定 workspace。它与 Claude Code、Codex 插件分别安装。

## 2. 快速开始

1. 按第 3 节选择并安装宿主。
2. 按第 4 节运行最短验证命令。
3. 根据任务是否需要先明确范围，选择第 5 节的工作流。

Claude Code 使用 `/uxu-code:<command>`，Codex 使用 `@<command>`。例如：

```text
/uxu-code:plan
@plan
```

除 `mode` 和 `clean` 外，一般公开命令把命令入口和可选内联参数写在首行；后续行属于同一命令的任务正文。路由会保留任务正文内部换行，只去除无意义的首尾空白。

Claude Code 示例：

```text
/uxu-code:audit inspect gates
重点检查状态生命周期，
不要修改文件。
```

Codex 示例：

```text
@audit inspect gates
重点检查状态生命周期，
不要修改文件。
```

`mode` 仍严格只接受单行，并且必须只有一个 `standard|lite|full|ultra|off` 参数。`clean` 也严格只接受单行：无参数仅做零写入预览，精确的 `apply` 才会在检查后执行；两者都不得追加多行任务正文。

`ship` 只给出合并或发布就绪结论，不会自行提交、推送或部署。

## 3. 按宿主安装

先在系统终端克隆仓库并进入目录：

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### 3.1 Claude Code

在系统终端、UXUCode 仓库根目录运行：

```bash
claude
```

进入 Claude Code 会话后运行：

```text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

本地 Marketplace 会引用克隆目录，请保留该目录。

### 3.2 Codex CLI

在系统终端、UXUCode 仓库根目录运行：

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

安装后重启 Codex。本地 Marketplace 会引用克隆目录，请保留该目录。

### 3.3 OpenClaw

在系统终端、UXUCode 仓库根目录中，把引号内的占位文字替换为目标 workspace 的绝对路径，先预览再安装：

```text
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard
```

安装后启动新的 OpenClaw 会话，让 workspace 文件重新加载。

## 4. 第一次使用

**GPUBackfill（Codex / Claude Code）**

插件内置本地 stdio MCP，不新增公开命令。客户端使用已有 Node.js 20+ 和 OpenSSH；执行端为 Linux + NVIDIA，使用用户指定的现存绝对 Python 3.8+ 解释器，仅用标准库，不安装依赖。每次调用传入 `target: {host?, root, python}`：`host` 是已配置的 SSH 目标，省略时为 Linux 本机；`root` 是现存绝对项目目录，`python` 是解释器绝对路径。保留 SSH 主机密钥校验。OpenClaw 不接入此 MCP。

先让 AI 调用 `gpu_probe` 只读列出全部 GPU 的序号、UUID、型号、总/空闲显存、利用率和进程，再询问你选择若干卡或全选。AI 不能默选；全选固定为你看到的 UUID 集合。确认后才用 `gpu_create_queue` 提交所选 `gpu_uuids`、`inventory_id` 和 `selection_confirmed: true`；硬件清单变化需重新选择，忙卡可选但资源不足时等待。相同 GPU 的队列使用同一服务器协调根。

创建队列、提交任务或显式 `gpu_prepare` 会在该项目根内准备 `.gpubackfill/`，上传并校验固定脚本，以独立版本目录和原子切换更新。`gpu_probe`、`gpu_status` 零写入；取消和暂停操作不安装脚本。插件更新只交付 MCP，宿主重载且允许启用后才可发现工具，不启动任务。已运行 worker 固定使用原版本，原 FedLoRA 任务不自动迁移或接管。

用 `gpu_submit` 提交 `queue_id` 与任务：`job_id`、命令参数数组 `command`、`cwd`、全部进程的峰值 `memory_mib` 和 `max_runtime_seconds`（正数或明确 `null`）。默认额外保留 1024 MiB，允许外部任务共卡；可在创建队列时设置 `allow_external: false`。没有完整断点协议的任务只在空卡上独占执行。单卡暂忙时等待；仅需求超过任一所选单卡安全容量且任务已有显存切分适配时，才按声明的卡数、逐卡显存预算和兼容型号组合申请同机多卡，不把显存简单相加或自动改写训练脚本。

支持恢复的任务需通过 STOP 文件、checkpoint 目录、请求/attempt 身份及 resume 路径协作；完整保存后以退出码 75 让路。多卡任务自行保证全部 rank 一致保存，内容完整性校验不证明训练状态语义完整。`gpu_status` 查询状态，`gpu_cancel` 只取消自己的指定任务，`gpu_queue_control` 暂停/恢复队列；暂停阻止新启动，外部任务不被停止。队列、日志和断点持久化，关闭聊天或 SSH 断连后继续后台执行；worker 被硬杀或服务器重启后需核验，不静默从零重训。

`command[0]` 必须是现存可执行文件的绝对路径，Python 任务使用项目既有解释器。多卡请求必须填写非空、无重复的 `multi_gpu.compatible_models`，使用探测清单的完整型号名，实际分配仅限这些型号。恢复默认关闭；仅在任务接好完整保存/恢复后设置 `resume: {enabled: true}`，可声明 `grace_seconds`（1—600）和 `max_restarts`。Python 适配器从环境 `GPU_BACKFILL_HELPER_DIR` 加载 `checkpoint.py`，调用 `Checkpoint.from_environment()`；`load_bytes()` 返回状态字节与进度，`save_bytes(payload, {"step": n})` 提交完整状态，`exit_if_requested(save_callback)` 在 STOP 时保存并以 75 退出。任务自行序列化并恢复模型、优化器、数据游标等全部状态。

验证证据须区分仓库静态合同、隔离 Linux 测试、真实宿主加载和真实 GPU 行为；前两层通过不代表后两层已验证。

### 4.1 Claude Code

在 Claude Code 会话内运行：

```text
/uxu-code:help
```

看到命令目录和简体中文指南路径，即表示插件入口可用。

### 4.2 Codex CLI

在 Codex 中运行：

```text
@help
```

看到命令目录和简体中文指南路径，即表示插件入口可用。

### 4.3 OpenClaw

启动新的 OpenClaw 会话，并确认目标 workspace 已加载安装后的 `AGENTS.md`、`SOUL.md` 和 `IDENTITY.md`。如文件未加载，请先核对安装时使用的 workspace 路径。

## 5. 推荐工作流

当范围或验收标准仍需明确时，先运行 `spec`；要求已经足够清楚时，可以直接进入 `plan`：

```text
[需要时先运行 spec] → plan → build → review → simplify → ship
```

方括号表示一个可选阶段，不是命令的一部分。常用选择：

| 任务 | 推荐流程 |
|---|---|
| 新功能或高影响修改 | `spec → plan → build → review → simplify → ship` |
| 要求清楚、验收标准明确 | `plan → build → review → simplify → ship` |
| 已观察到错误 | `debug → review → ship` |
| 只需独立检查现有改动 | `review` 或 `test` |

对于普通计划或执行策略为 `serial` 的计划，一次 `build` 默认只完成下一个待办，便于检查和回滚。只有计划稳定、验收标准明确、自动化测试可靠、用户明确允许连续执行且任务可独立回滚时，才使用 `/uxu-code:build auto` 或 `@build auto`。

`plan fast` 只有在 `fast` 是精确小写首参数时启用安全并行规划；它不会强制并行，也不会绕过规格充分性或批准门禁。

批准后的 `work-products/plan.md` 保持不可变，`work-products/todo.md` 是唯一原子执行状态账本。

部分完成波次重入不会重跑已完成任务；默认 `build` 只执行下一安全波次，只有 `build auto` 可跨波继续。

不存在 `build fast`。

普通规格或计划只需对当前唯一、已展示的候选作出明确自然语言批准，例如“批准当前计划”；用户无需查看、复制或复述任何内部标识。

系统会保存当前文件的精确原始字节并进行流式逐字节比较；发生漂移、目标冲突或多候选时会展示可读差异并重新请求普通自然语言批准。

普通批准不会自动运行下一个命令，也不授权 `build auto`、提交、推送、联网、付费、训练、外部写入、发布或部署。

只有已批准项目规格直接枚举的高风险 `action_id` 才可保留其 exact-set 授权；普通批准既不能替代它，也不能扩大其范围。

## 6. 命令参考

### 6.1 核心工作流

| 用途 | Claude Code | Codex | 你会得到什么 |
|---|---|---|---|
| 定义规格 | `/uxu-code:spec <需求>` | `@spec <需求>` | 目标、范围、约束、风险和验收标准 |
| 制定计划 | `/uxu-code:plan` | `@plan` | 按依赖排序、可独立验证的任务 |
| 实施任务 | `/uxu-code:build` | `@build` | 下一个完整切片及测试证据 |
| 修复故障 | `/uxu-code:debug <问题>` | `@debug <问题>` | 复现、根因、最小修复和回归证据 |
| 设计或运行测试 | `/uxu-code:test` | `@test` | 测试范围、结果和证据边界 |
| 评审改动 | `/uxu-code:review` | `@review` | 按严重性排序的问题和建议 |
| 降低复杂度 | `/uxu-code:simplify` | `@simplify` | 行为不变的简化及验证结果 |
| 检查发布就绪 | `/uxu-code:ship` | `@ship` | Blocker、Recommended、Acknowledged 和 GO／NO-GO |

### 6.2 辅助命令

| 用途 | Claude Code | Codex | 你会得到什么 |
|---|---|---|---|
| 查看帮助 | `/uxu-code:help` | `@help` | 命令目录、流程和指南路径 |
| 选择模式 | `/uxu-code:mode full` | `@mode full` | 当前实现与输出策略 |
| 审计复杂度 | `/uxu-code:audit` | `@audit` | 可删除、复用或替换的候选项 |
| 盘点技术债 | `/uxu-code:debt` | `@debt` | 债务边界和升级条件 |
| 生成提交信息 | `/uxu-code:commit` | `@commit` | 基于真实差异的提交建议 |
| 压缩上下文文件 | `/uxu-code:compress <file>` | `@compress <file>` | 保留技术标记、可恢复的精简结果 |
| 查看可验证指标 | `/uxu-code:stats` | `@stats` | 来源、范围和可计算指标 |
| 查看当前状态 | `/uxu-code:status` | `@status` | 模式、任务进度、验证和门禁状态 |
| 整理错放的过程文件 | `/uxu-code:clean` | `@clean` | 零写入预览、移动与引用／ignore 变化 |

`clean` 不是删除命令。无参数调用只生成零写入预览；检查完整映射、引用和仓库 `.gitignore` 变化后，只有 `/uxu-code:clean apply` 或 `@clean apply` 才会执行。测试命名只用于跨语言发现候选，不证明归属；未获固定历史映射或 `work-products/clean-migration.json` 中精确条目授权的产品原生测试保留原位。该版本 1 清单的每项必须显式声明 `source`、`target`、`tracking` 和 `rewritePolicy`。
扫描会跳过任意层级的依赖、版本控制与 `__pycache__` 目录。

`tracking` 的 `tracked`／`local` 决定目标应保持可跟踪还是本地忽略；`rewritePolicy` 的 `references`、`preserve-content` 和 `mutable-patch` 分别允许安全引用改写、要求逐字节保持内容、或仅允许改写显式授权的 `.patch`／`.diff` 统一 diff 路径。已识别校验清单会保护绑定内容，策略不兼容或校验失败时停止。其他层级的 `<prefix>/work-products/tests/<rest>` 会归一到根级 `work-products/tests/<prefix>/<rest>`，且只移除与根级规范精确同构的非根级 ignore 规则族；相邻注释、部分匹配和其他规则保持不变。

根级 `tasks/` 会先完整核对；存在未映射条目时返回 `BLOCKED` 并保留该目录。重复目标、目标祖先链接／逃逸、缺少路径结构证据的裸字符串或无法安全改写也会在任何写入前返回 `BLOCKED`。`version: 2` 报告以 `preservedProductFiles`、`unclassifiedLegacyFiles`、`integrityProtectedFiles` 和 `inactiveManifestEntries` 区分保留、未分类、完整性保护及已满足／非活动清单项；无需整理时返回 `NO_CHANGES`。

## 7. 模式选择

| 模式 | 行为 | 建议场景 |
|---|---|---|
| `standard` | 最小正确实现，表达完整而简洁 | 日常默认 |
| `lite` | 保留更多教学解释，只提示更简单方案 | 新仓库、教学、讨论 |
| `full` | 更强地约束复用、范围和可维护性 | 熟悉项目后的常规开发 |
| `ultra` | 更积极地删除无价值复杂度，输出更短 | 明确、低风险的小任务 |
| `off` | 关闭全局简化与压缩策略 | 排查策略影响或特殊任务 |

无论选择哪种模式，正确性和安全始终优先。删除、迁移、认证、支付、权限、部署、架构和回滚等高风险场景会恢复完整说明。

## 8. 生成文件位置

UXUCode 将自身生成的过程产物集中放在以下位置：

| 内容 | 默认位置 |
|---|---|
| 规格 | `work-products/SPEC.md` |
| 实施计划 | `work-products/plan.md` |
| 任务清单 | `work-products/todo.md` |
| 调试记录 | `work-products/debug/` |
| 评审报告 | `work-products/reviews/` |
| 发布门禁报告 | `work-products/ship/` |
| 新建测试、测试数据和报告 | `work-products/tests/` |

`work-products/` 中的正式规格、实施计划、任务清单和测试是可进入版本控制的正式项目事实；调试记录、评审报告、发布门禁报告和其他未声明过程文件默认只保留在本地。仓库静态校验通过不代表已安装的插件缓存已经重新加载这些变更。

开发、测试、依赖安装和工具配置先读取项目合同、锁文件与包装脚本，并优先使用项目环境。Python 没有其他明确合同时，使用仓库根目录 `.venv/`，并通过其中的精确解释器运行依赖命令；不得用裸 `pip` 或全局环境掩盖缺失环境。构建、修复、测试或配置请求可授权所需的项目内环境修改；只读请求不得创建环境或安装依赖。任何仓库外环境变更都必须先说明精确命令、目标、项目内方案不可用原因、影响、验证和回滚，再取得明确授权；无法安全创建或修复环境、归属冲突或边界不清时停止。该策略是行为合同，不是系统级沙箱或强制命令拦截器。

`clean apply` 会最小同步仓库自身 `.gitignore`：正式事实保持可跟踪，其他本地过程产物默认忽略，旧根路径规则不保留。用户级 `core.excludesFile` 和仓库 `.git/info/exclude` 只报告影响，不会修改。

产品源码和最终交付物仍使用项目原有位置。任何操作创建的新测试及相关测试产物都必须放入 `work-products/tests/`；测试引用仓库文件时使用从最终位置出发的相对路径，不得写入机器绑定的绝对路径。测试框架、CI 或打包规则中的明确旧路径必须随迁移同步更新。

## 9. 更新、移除与故障排查

### 9.1 更新

先在系统终端更新本地仓库：

```bash
cd UXUCode
git pull --ff-only
```

#### Claude Code

进入 Claude Code 会话后运行：

```text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

#### Codex CLI

本地仓库更新完成后重启 Codex，使其重新加载插件。

#### OpenClaw

在系统终端针对每个目标 workspace 重新运行 `OpenClaw/scripts/install-profile.js`：先使用 `--dry-run` 预览，再使用该 workspace 已选模式执行安装，最后启动新会话。

### 9.2 移除与回滚

Claude Code 和 Codex 请使用各自宿主的插件管理入口移除插件；不要只删除仍被本地 Marketplace 引用的仓库目录。

OpenClaw 移除时，先备份 `AGENTS.md`，再只删除由 UXUCode 标记的成对边界及其内容。需要回滚更新时，核对并恢复同一 workspace 的 `AGENTS.md.uxucode-backup-*`。如果边界缺失、重复、嵌套或顺序异常，请停止操作并查看专项指南。

### 9.3 故障排查

- Claude Code：确认 `/plugin ...` 命令是在 Claude Code 会话内执行，并在安装或更新后运行 `/reload-plugins`。
- Codex：确认命令在仓库根目录执行，克隆目录仍存在，并在安装或更新后重启。
- OpenClaw：确认 `--workspace` 使用绝对路径，先查看 `--dry-run` 输出，再启动新会话。
- Clean：仅在结构化权限错误且宿主提供审批机制时，才会以相同参数最多重跑一次；预览绝不升级为 `apply`。其他 Git 或 ignore 错误继续返回 `BLOCKED`。
- 命令入口不可用时，先重新运行第 4 节的 `help` 验证，再检查宿主插件状态。

## 10. 高级配置

### 10.1 Claude Code 与 Codex 配置

默认配置：

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

Claude Code 与 Codex 在 Windows 使用 `%APPDATA%\uxucode\config.json`，在 macOS/Linux 使用 `~/.config/uxucode/config.json`。项目级状态写入 `.uxucode-state.json`。OpenClaw 不读取这些共享配置或状态文件。

### 10.2 会话状态与输出

会话启动时，Codex 输出 `UXUCODE:<MODE>`，Claude Code 输出 `UXUCode is active in <mode> mode.`。这些信息只确认当前策略模式，不代表任务已完成或测试已通过。使用 `status` 查看任务与门禁状态。

## 11. OpenClaw

### 11.1 能为使用者带来什么

OpenClaw 安装会把 UXUCode 的范围控制、执行纪律、输出风格和高风险信息保护应用到指定 workspace。`standard` 是默认选择；`ultra` 适合明确、简单且低风险的任务。不同 workspace 可以选择不同模式。

### 11.2 文件保护与原生控制

安装器只更新 `AGENTS.md` 中由 UXUCode 标记的一段内容，更新前会创建备份。缺少 `SOUL.md` 或 `IDENTITY.md` 时会从模板创建；已有同名文件不会被读取、修改或覆盖。

继续使用 OpenClaw 自带的 `/usage`、`/compact`、`/verbose`、`/reasoning`、`/think` 和 `/model` 控制。UXUCode 不复制这些功能。

### 11.3 详细文档

- 安装、文件保护、更新、移除与回滚：[OpenClaw/README.md](../OpenClaw/README.md)
- 独立评测流程与证据要求：[OpenClaw/evaluation/README.md](../OpenClaw/evaluation/README.md)

## 12. 面向项目维护者的校验附录

### 12.1 统一校验入口

在仓库根目录运行：

```text
node scripts/validate-all.js
```

该入口失败即停，并显示失败步骤。需要进一步定位时，再运行该步骤报告的单项验证器或测试。提交前还应运行项目要求的差异、格式和平台检查。

### 12.2 证据边界

统一入口提供仓库静态校验和本地测试证据，不证明真实 Marketplace 安装、Hook 实际加载或 OpenClaw Gateway 运行正常。发布或合并结论必须明确记录哪些检查已运行、哪些真实宿主验证尚未完成。
