# UXUCode

> 为 Claude Code、Codex 和 OpenClaw 提供清晰、可验证的软件工程工作流。
>
> A clear, verifiable software-engineering workflow for Claude Code, Codex, and OpenClaw.

### 🌐 选择语言 | 選擇語言 | Choose Language

- [🇨🇳 简体中文](#-简体中文)
- [🇹🇼 繁體中文](#-繁體中文)
- [🇺🇸 English](#-english)

---

# 🇨🇳 简体中文

## 产品用途

UXUCode 把需求澄清、计划、实现、调试、测试、评审、简化和发布门禁串成一套可验证的工作流，帮助你在 Claude Code 或 Codex 中持续完成软件工程任务。

当任务需要先明确范围时，可以从 `spec` 开始；需求已经清楚时，也可以直接进入 `plan`。推荐流程：

```text
[需要时先运行 spec] → plan → build → review → simplify → ship
```

UXUCode 会把生成的规格、计划和过程记录集中保存在 `work-products/`，避免打乱项目原有目录。产品源码和最终交付文件仍遵循项目现有结构。

`work-products/` 中的正式规格、实施计划、任务清单和测试是可进入版本控制的正式项目事实；调试记录、评审报告、发布门禁报告和其他未声明过程文件默认只保留在本地。任何操作创建的新测试都放入 `work-products/tests/`，测试引用仓库文件时使用从最终位置出发的相对路径，不写入机器绑定的绝对路径。仓库静态校验通过不代表已安装的插件缓存已经重新加载这些变更。

如果历史 UXUCode 过程文件错放在目录外，先用 `/uxu-code:clean` 或 `@clean` 零写入预览；确认后仅以精确的 `apply` 参数执行整理。`clean` 不是删除命令；它会按跨语言 `test`／`spec` 命名及必要的静态测试证据识别内部测试，同时跳过依赖、版本控制、`__pycache__` 和补丁派生文件。可证明的根路径与统一 diff 引用会随迁移同步改写；重复目标、目标祖先链接／逃逸或缺少路径结构证据的裸字符串会返回 `BLOCKED`。

在代码仓库中，建议配合 [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) 使用，以便更快定位相关代码和调用路径。

## 选择宿主

| 你使用的宿主 | 安装方式 | 命令示例 |
|---|---|---|
| Claude Code | 安装 `Claude/` 插件 | `/uxu-code:plan` |
| Codex CLI | 安装 `Codex/` 插件 | `@plan` |
| OpenClaw | 将策略安装到指定 workspace | 使用 OpenClaw 的正常对话入口 |

如果你也使用 OpenClaw，可以把 UXUCode 的执行与输出策略应用到指定 workspace。它与 Claude Code、Codex 插件分别安装，详细步骤见 [OpenClaw 指南](OpenClaw/README.md)。

## 快速安装

先在系统终端克隆仓库并进入目录：

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### Claude Code

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

### Codex CLI

在系统终端、UXUCode 仓库根目录运行：

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

安装后重启 Codex。

### OpenClaw

在系统终端、UXUCode 仓库根目录中，把引号内的占位文字替换为目标 workspace 的绝对路径，先预览再安装：

```text
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard
```

安装后启动新的 OpenClaw 会话，让 workspace 文件重新加载。

## 第一次使用与验证

### Claude Code

在 Claude Code 会话内运行：

```text
/uxu-code:help
```

看到命令目录和当前语言指南路径，即表示插件入口可用。之后可用 `/uxu-code:<command>` 执行任务。

### Codex CLI

在 Codex 中运行：

```text
@help
```

看到命令目录和当前语言指南路径，即表示插件入口可用。之后可用 `@<command>` 执行任务。

### OpenClaw

启动新的 OpenClaw 会话，并确认目标 workspace 已加载安装后的 `AGENTS.md`、`SOUL.md` 和 `IDENTITY.md`。如需诊断，请查看 [OpenClaw 指南](OpenClaw/README.md)。

## 更新

先在系统终端更新本地仓库：

```bash
cd UXUCode
git pull --ff-only
```

### Claude Code

进入 Claude Code 会话后运行：

```text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

本地仓库更新完成后重启 Codex，使其重新加载插件。

### OpenClaw

在系统终端针对每个目标 workspace 重新运行安装器：先使用 `OpenClaw/scripts/install-profile.js` 和 `--dry-run` 预览，再使用该 workspace 已选模式执行安装，然后启动新会话。移除与回滚步骤见 [OpenClaw 指南](OpenClaw/README.md)。

## 完整指南

[查看完整简体中文使用指南](docs/USAGE.zh-CN.md)，了解命令、模式、生成文件位置、故障排查和维护者校验。

## 致谢

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

---

# 🇹🇼 繁體中文

## 產品用途

UXUCode 把需求釐清、計畫、實作、除錯、測試、評審、簡化和發佈門禁串成一套可驗證的工作流程，協助你在 Claude Code 或 Codex 中持續完成軟體工程任務。

當任務需要先明確範圍時，可以從 `spec` 開始；需求已經清楚時，也可以直接進入 `plan`。推薦流程：

```text
[需要時先執行 spec] → plan → build → review → simplify → ship
```

UXUCode 會把產生的規格、計畫和過程記錄集中保存在 `work-products/`，避免打亂專案原有目錄。產品原始碼和最終交付檔案仍遵循專案現有結構。

`work-products/` 中的正式規格、實施計畫、任務清單和測試是可納入版本控制的正式專案事實；除錯記錄、評審報告、發佈門禁報告和其他未聲明的過程檔案預設只保留在本機。任何操作建立的新測試都放入 `work-products/tests/`，測試引用儲存庫檔案時使用從最終位置出發的相對路徑，不寫入綁定特定機器的絕對路徑。儲存庫靜態驗證通過不代表已安裝的外掛快取已重新載入這些變更。

如果歷史 UXUCode 過程檔案錯放在目錄外，先用 `/uxu-code:clean` 或 `@clean` 零寫入預覽；確認後僅以精確的 `apply` 參數執行整理。`clean` 不是刪除命令；它會按跨語言 `test`／`spec` 命名及必要的靜態測試證據識別內部測試，同時跳過依賴、版本控制、`__pycache__` 和補丁衍生檔案。可證明的根路徑與統一 diff 引用會隨遷移同步改寫；重複目標、目標祖先連結／逃逸或缺少路徑結構證據的裸字串會回傳 `BLOCKED`。

在程式碼儲存庫中，建議搭配 [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) 使用，以便更快定位相關程式碼和呼叫路徑。

## 選擇宿主

| 你使用的宿主 | 安裝方式 | 命令範例 |
|---|---|---|
| Claude Code | 安裝 `Claude/` 外掛 | `/uxu-code:plan` |
| Codex CLI | 安裝 `Codex/` 外掛 | `@plan` |
| OpenClaw | 將策略安裝到指定 workspace | 使用 OpenClaw 的一般對話入口 |

如果你也使用 OpenClaw，可以把 UXUCode 的執行與輸出策略套用到指定 workspace。它與 Claude Code、Codex 外掛分別安裝，詳細步驟請見 [OpenClaw 指南](OpenClaw/README.md)。

## 快速安裝

先在系統終端複製儲存庫並進入目錄：

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### Claude Code

在系統終端、UXUCode 儲存庫根目錄執行：

```bash
claude
```

進入 Claude Code 工作階段後執行：

```text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

在系統終端、UXUCode 儲存庫根目錄執行：

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

安裝後重新啟動 Codex。

### OpenClaw

在系統終端、UXUCode 儲存庫根目錄中，把引號內的預留文字替換為目標 workspace 的絕對路徑，先預覽再安裝：

```text
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard
```

安裝後啟動新的 OpenClaw 工作階段，讓 workspace 檔案重新載入。

## 第一次使用與驗證

### Claude Code

在 Claude Code 工作階段內執行：

```text
/uxu-code:help
```

看到命令目錄和目前語言指南路徑，即表示外掛入口可用。之後可用 `/uxu-code:<command>` 執行任務。

### Codex CLI

在 Codex 中執行：

```text
@help
```

看到命令目錄和目前語言指南路徑，即表示外掛入口可用。之後可用 `@<command>` 執行任務。

### OpenClaw

啟動新的 OpenClaw 工作階段，並確認目標 workspace 已載入安裝後的 `AGENTS.md`、`SOUL.md` 和 `IDENTITY.md`。如需診斷，請查看 [OpenClaw 指南](OpenClaw/README.md)。

## 更新

先在系統終端更新本機儲存庫：

```bash
cd UXUCode
git pull --ff-only
```

### Claude Code

進入 Claude Code 工作階段後執行：

```text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

本機儲存庫更新完成後重新啟動 Codex，使其重新載入外掛。

### OpenClaw

在系統終端針對每個目標 workspace 重新執行安裝器：先使用 `OpenClaw/scripts/install-profile.js` 和 `--dry-run` 預覽，再使用該 workspace 已選模式執行安裝，然後啟動新工作階段。移除與復原步驟請見 [OpenClaw 指南](OpenClaw/README.md)。

## 完整指南

[查看完整繁體中文使用指南](docs/USAGE.zh-TW.md)，瞭解命令、模式、產生檔案位置、故障排除和維護者驗證。

## 致謝

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

---

# 🇺🇸 English

## What It Does

UXUCode connects requirement clarification, planning, implementation, debugging, testing, review, simplification, and release gates into one verifiable workflow for ongoing software-engineering work in Claude Code or Codex.

Start with `spec` when the scope still needs definition; when the request is already clear, you can go directly to `plan`. Recommended flow:

```text
[run spec first when needed] → plan → build → review → simplify → ship
```

UXUCode keeps generated specifications, plans, and process records together under `work-products/` so the project's existing layout stays organized. Product source code and final deliverables continue to follow the project's own structure.

Under `work-products/`, formal specifications, implementation plans, task lists, and tests are formal project facts that can be tracked in version control; debug records, review reports, release-gate reports, and other undeclared process files remain local by default. Every operation places newly created tests under `work-products/tests/`; tests reference repository files with relative paths from their final location, never machine-specific absolute paths. Passing repository static validation does not mean the installed plugin cache has reloaded these changes.

If historical UXUCode process files are misplaced outside that directory, run `/uxu-code:clean` or `@clean` first for a zero-write preview, then use only the exact `apply` argument after review. `clean` is not a delete command. It recognizes internal tests from cross-language `test`/`spec` names plus static evidence where required, while skipping dependency, version-control, `__pycache__`, and derived patch-artifact paths. Proven repository-root and unified-diff references are rewritten with the move; duplicate targets, linked or escaping target ancestors, and bare strings without path-structure evidence return `BLOCKED`.

For code repositories, we recommend using UXUCode with [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) to locate related code and call paths faster.

## Choose a Host

| Your host | Installation | Command example |
|---|---|---|
| Claude Code | Install the `Claude/` plugin | `/uxu-code:plan` |
| Codex CLI | Install the `Codex/` plugin | `@plan` |
| OpenClaw | Apply the policy to a selected workspace | Use the normal OpenClaw conversation entry |

If you also use OpenClaw, you can apply UXUCode's execution and output policies to a selected workspace. Install it separately from the Claude Code and Codex plugins; see the [OpenClaw guide](OpenClaw/README.md) for details.

## Quick Installation

In a system terminal, clone the repository and enter it:

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### Claude Code

In a system terminal, from the UXUCode repository root, run:

```bash
claude
```

After entering the Claude Code session, run:

```text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

In a system terminal, from the UXUCode repository root, run:

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

Restart Codex after installation.

### OpenClaw

In a system terminal, from the UXUCode repository root, replace the quoted placeholder with the absolute path to the target workspace, then preview and install:

```text
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard
```

Start a new OpenClaw session after installation so it reloads the workspace files.

## First Use and Verification

### Claude Code

Inside the Claude Code session, run:

```text
/uxu-code:help
```

If the command catalog and current-language guide path appear, the plugin entry is available. Use `/uxu-code:<command>` for subsequent tasks.

### Codex CLI

In Codex, run:

```text
@help
```

If the command catalog and current-language guide path appear, the plugin entry is available. Use `@<command>` for subsequent tasks.

### OpenClaw

Start a new OpenClaw session and confirm that the target workspace loaded the installed `AGENTS.md`, `SOUL.md`, and `IDENTITY.md` files. For diagnostics, see the [OpenClaw guide](OpenClaw/README.md).

## Updating

First update the local repository in a system terminal:

```bash
cd UXUCode
git pull --ff-only
```

### Claude Code

After entering the Claude Code session, run:

```text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

After updating the local repository, restart Codex so it reloads the plugin.

### OpenClaw

In a system terminal, rerun the installer for each target workspace: preview with `OpenClaw/scripts/install-profile.js` and `--dry-run`, install with that workspace's selected mode, then start a new session. See the [OpenClaw guide](OpenClaw/README.md) for removal and rollback.

## Complete Guide

[Read the complete English usage guide](docs/USAGE.en.md) for commands, modes, generated-file locations, troubleshooting, and maintainer validation.

## Acknowledgements

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=uxudjs/UXUCode&type=Date)](https://star-history.com/#uxudjs/UXUCode&Date)
