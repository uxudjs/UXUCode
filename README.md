# UXUCode

> 面向 Claude Code 与 Codex CLI 的统一软件工程工作流。
> 双端原生适配，技能语义同步，并以最小正确实现与明确发布门禁贯穿开发全流程。

### 🌐 选择语言 \| 選擇語言 \| Choose Language

-   [🇨🇳 简体中文](#-简体中文)
-   [🇹🇼 繁體中文](#-繁體中文)
-   [🇺🇸 English](#-english)

------------------------------------------------------------------------

# 🇨🇳 简体中文

📖 [查看完整简体中文使用指南](docs/USAGE.zh-CN.md)

UXUCode 是面向 Claude Code 与 Codex CLI 的统一软件工程工作流系统，覆盖需求澄清、规格设计、项目规划、增量实现、调试测试、代码审查、复杂度治理与发布门禁。

项目为两个 CLI 提供独立的原生插件包，并同步维护技能、内部工作流参考、Hook、三语言指南与一致性校验脚本。自 `v3.0.0` 起，Claude Code 与 Codex CLI 完全独立维护：

-   独立目录
-   独立插件配置
-   独立技能系统
-   独立 Hook 生命周期
-   独立运行环境

避免两个 CLI 因架构差异产生兼容问题。

`OpenClaw/` 是单独的通用助理 workspace 策略，不是第三个代码 CLI 插件，也不参与 Claude/Codex 的 16 个命令一致性校验。

## 主要功能

| 🧭 完整工程工作流 | 🛡️ 验证与发布门禁 | ⚙️ 双 CLI 原生适配 |
|----------------------|----------------------|----------------------|
| 需求澄清、规格设计与项目规划 | 测试、构建与运行证据 | Claude Code 与 Codex 独立插件包 |
| 增量实现、调试与测试 | 正确性、安全、性能与复杂度审查 | 16 个公开命令与工作流语义同步 |
| Code Review 与最小正确实现 | Blocker、Recommended 与 GO／NO-GO | 独立 Hook、配置与运行环境 |
| 简化、技术债与上下文压缩 | 高风险操作保护与回滚检查 | 三语言指南与自动一致性校验 |
| 发布、迁移与状态追踪 | 失败即停止，不以猜测代替验证 | 可分别安装、更新与维护 | 

## 项目结构

``` text
UXUCode/
├── README.md
├── Claude/
├── Codex/
└── OpenClaw/
```

## 安装

先克隆仓库：

``` bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### Claude Code

临时加载并验证：

``` bash
claude --plugin-dir ./Claude
```

持久安装：

``` text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
```

重启 Claude Code，或执行 `/reload-plugins`。技能调用格式为 `/uxu-code:<skill-name>`，例如 `/uxu-code:plan`。

### Codex CLI

注册本地 Marketplace 并安装：

``` text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

重启 Codex。技能调用格式为 `@<skill-name>`，例如 `@plan`；可用 `/hooks` 检查 Hook 状态。

本地 Marketplace 记录依赖克隆目录，请不要在安装后立即删除仓库。

### OpenClaw

OpenClaw 使用写入指定 workspace `AGENTS.md` 的策略配置，不安装插件、Hook 或技能，也不读取 Claude/Codex 的共享全局模式。完整说明见 [OpenClaw/README.md](OpenClaw/README.md)。

先预览，再安装默认的 `standard` 模式；`ultra` 仅用于明确选择的简单低风险任务：

``` text
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard
```

运行前必须把引号内的占位文字替换为实际 OpenClaw workspace 的绝对路径。安装器会从 `OpenClaw/templates/SOUL.md` 与 `OpenClaw/templates/IDENTITY.md` 自动创建 workspace 根目录中缺失的同名文件；已有文件始终保留且不会被读取、修改或覆盖。安装后请审阅并按需定制新文件，然后启动新的 OpenClaw 会话以重新加载 workspace 文件。MVP 没有运行时模式命令、遥测、会话读取或共享全局配置。

### 更新

先在克隆目录拉取最新版本：

``` bash
cd UXUCode
git pull --ff-only
```

Claude Code（在 Claude Code 会话中执行）：

``` text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

Codex CLI：

完成 `git pull --ff-only` 后直接重启 Codex，即可从更新后的本地目录加载插件。

OpenClaw：

对每个目标 workspace 先重新运行 `--dry-run`，再用该 workspace 已选模式执行安装命令。移除时只删除成对 managed markers 及其中内容；回滚时核对并恢复同一 workspace 的 `AGENTS.md.uxucode-backup-*`。标记损坏时停止，不要覆盖整个 `AGENTS.md`。

### 使用示例

``` text
# Claude Code
/uxu-code:spec 为登录限流功能编写规格
/uxu-code:mode full

# Codex CLI
@spec 为登录限流功能编写规格
@mode full
```

## 校验

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
node OpenClaw/scripts/validate-profile.js
node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js
node OpenClaw/evaluation/score-results.js <results.json>
```

OpenClaw 评测协议见 [OpenClaw/evaluation/README.md](OpenClaw/evaluation/README.md)。它使用 52 个脱敏用例，对无配置基线与启用配置的 workspace 进行固定环境配对评测。发布门禁要求输出 token 中位数至少降低 35%、低风险正确率至少 95%、未经请求的外部变更为零、必要风险信息遗漏为零。静态测试只验证门禁逻辑，不能证明真实 token 节省。

## 鸣谢

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

------------------------------------------------------------------------

# 🇹🇼 繁體中文

📖 [查看完整繁體中文使用指南](docs/USAGE.zh-TW.md)

UXUCode 是面向 Claude Code 與 Codex CLI 的統一軟體工程工作流系統，涵蓋需求釐清、規格設計、專案規劃、增量實作、除錯測試、程式碼審查、複雜度治理與發布門禁。

專案為兩個 CLI 提供獨立的原生插件套件，並同步維護技能、內部工作流參考、Hook、三語言指南與一致性校驗腳本。自 `v3.0.0` 起，Claude Code 與 Codex CLI 完全獨立維護：

-   獨立目錄
-   獨立插件設定
-   獨立技能系統
-   獨立 Hook 生命週期
-   獨立執行環境

避免兩個 CLI 因架構差異產生相容性問題。

`OpenClaw/` 是獨立的通用助理 workspace 策略，不是第三個程式碼 CLI 插件，也不參與 Claude/Codex 的 16 個命令一致性驗證。

## 主要功能

| 🧭 完整工程工作流 | 🛡️ 驗證與發布門禁 | ⚙️ 雙 CLI 原生適配 |
|----------------------|----------------------|----------------------|
| 需求釐清、規格設計與專案規劃 | 測試、建置與執行證據 | Claude Code 與 Codex 獨立插件套件 |
| 增量實作、除錯與測試 | 正確性、安全、效能與複雜度審查 | 16 個公開命令與工作流語意同步 |
| Code Review 與最小正確實作 | Blocker、Recommended 與 GO／NO-GO | 獨立 Hook、設定與執行環境 |
| 簡化、技術債與上下文壓縮 | 高風險操作保護與回復檢查 | 三語言指南與自動一致性校驗 |
| 發布、遷移與狀態追蹤 | 失敗即停止，不以猜測取代驗證 | 可分別安裝、更新與維護 | 

## 專案結構

``` text
UXUCode/
├── README.md
├── Claude/
├── Codex/
└── OpenClaw/
```

## 安裝

先複製倉庫：

``` bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### Claude Code

臨時載入並驗證：

``` bash
claude --plugin-dir ./Claude
```

持久安裝：

``` text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
```

重啟 Claude Code，或執行 `/reload-plugins`。技能呼叫格式為 `/uxu-code:<skill-name>`，例如 `/uxu-code:plan`。

### Codex CLI

註冊本地 Marketplace 並安裝：

``` text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

重啟 Codex。技能呼叫格式為 `@<skill-name>`，例如 `@plan`；可用 `/hooks` 檢查 Hook 狀態。

本地 Marketplace 記錄依賴複製目錄，請不要在安裝後立即刪除倉庫。

### OpenClaw

OpenClaw 使用寫入指定 workspace `AGENTS.md` 的策略設定，不安裝插件、Hook 或技能，也不讀取 Claude/Codex 的共享全域模式。完整說明見 [OpenClaw/README.md](OpenClaw/README.md)。

先預覽，再安裝預設的 `standard` 模式；`ultra` 僅適用於明確選擇的簡單低風險工作：

``` text
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard
```

執行前必須把引號內的佔位文字替換為實際 OpenClaw workspace 的絕對路徑。安裝器會從 `OpenClaw/templates/SOUL.md` 與 `OpenClaw/templates/IDENTITY.md` 自動建立 workspace 根目錄中缺少的同名檔案；既有檔案一律保留，不會被讀取、修改或覆寫。安裝後請審閱並按需自訂新檔案，再啟動新的 OpenClaw 工作階段以重新載入 workspace 檔案。MVP 沒有執行期模式命令、遙測、對話讀取或共享全域設定。

### 更新

先在複製目錄拉取最新版本：

``` bash
cd UXUCode
git pull --ff-only
```

Claude Code（在 Claude Code 工作階段中執行）：

``` text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

Codex CLI：

完成 `git pull --ff-only` 後直接重新啟動 Codex，即可從更新後的本機目錄載入插件。

OpenClaw：

對每個目標 workspace 先重新執行 `--dry-run`，再用該 workspace 已選模式執行安裝命令。移除時只刪除成對 managed markers 及其中內容；回復時核對並還原同一 workspace 的 `AGENTS.md.uxucode-backup-*`。標記損壞時停止，不要覆寫整個 `AGENTS.md`。

### 使用範例

``` text
# Claude Code
/uxu-code:spec 為登入限流功能編寫規格
/uxu-code:mode full

# Codex CLI
@spec 為登入限流功能編寫規格
@mode full
```

## 驗證

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
node OpenClaw/scripts/validate-profile.js
node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js
node OpenClaw/evaluation/score-results.js <results.json>
```

OpenClaw 評估協議見 [OpenClaw/evaluation/README.md](OpenClaw/evaluation/README.md)。它使用 52 個脫敏案例，對無設定基線與啟用設定的 workspace 進行固定環境配對評估。發布門禁要求輸出 token 中位數至少降低 35%、低風險正確率至少 95%、未經請求的外部變更為零、必要風險資訊遺漏為零。靜態測試只驗證門禁邏輯，不能證明真實 token 節省。

## 致謝

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

------------------------------------------------------------------------

# 🇺🇸 English

📖 [Read the complete English usage guide](docs/USAGE.en.md)

UXUCode is a unified software engineering workflow system for Claude Code and Codex CLI, covering requirement clarification, specification, planning, incremental implementation, debugging and testing, code review, complexity control, and release gates.

The project provides a native, independent plugin package for each CLI while keeping skills, internal workflow references, hooks, trilingual guides, and parity checks synchronized. Since `v3.0.0`, Claude Code and Codex CLI are maintained as completely independent distributions:

-   Independent directories
-   Independent plugin configurations
-   Independent skill systems
-   Independent Hook lifecycles
-   Independent runtime environments

This avoids compatibility issues caused by architectural differences
between the two CLIs.

`OpenClaw/` is a separate general-assistant workspace policy. It is not a third coding-CLI plugin and is not included in the 16-command Claude/Codex parity contract.

## Features

| 🧭 Complete Engineering Workflow | 🛡️ Validation & Release Gates | ⚙️ Native Dual-CLI Support |
|----------------------------------|--------------------------------|------------------------------|
| Requirement clarification, specification, and planning | Test, build, and runtime evidence | Independent Claude Code and Codex plugin packages |
| Incremental implementation, debugging, and testing | Correctness, security, performance, and complexity review | 16 synchronized public commands and workflow semantics |
| Code review and minimal correct implementation | Blocker, Recommended, and GO/NO-GO decisions | Independent hooks, configuration, and runtimes |
| Simplification, technical debt, and context compression | High-risk operation safeguards and rollback checks | Trilingual guides and automated parity validation |
| Release, migration, and status tracking | Stop on failure; never replace verification with guesses | Independent installation, updates, and maintenance |

## Project Structure

``` text
UXUCode/
├── README.md
├── Claude/
├── Codex/
└── OpenClaw/
```

## Installation

Clone the repository first:

``` bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### Claude Code

Load temporarily for verification:

``` bash
claude --plugin-dir ./Claude
```

Persistent install:

``` text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
```

Restart Claude Code, or run `/reload-plugins`. Invoke skills as `/uxu-code:<skill-name>`, e.g. `/uxu-code:plan`.

### Codex CLI

Register the local Marketplace and install:

``` text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

Restart Codex. Invoke skills as `@<skill-name>`, e.g. `@plan`; use `/hooks` to check Hook status.

Local Marketplace entries reference the cloned directory, so do not delete the repository after installation.

### OpenClaw

OpenClaw uses a policy installed into the selected workspace `AGENTS.md`. It installs no plugin, hook, or skill and does not read the shared Claude/Codex global mode. See [OpenClaw/README.md](OpenClaw/README.md) for the complete guide.

Preview, then install the default `standard` mode. `ultra` is an explicit choice for simple, low-risk work:

``` text
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard
```

Before running either command, replace the quoted placeholder with the absolute path to the actual OpenClaw workspace. The installer automatically creates missing `SOUL.md` and `IDENTITY.md` files in the workspace root from `OpenClaw/templates/SOUL.md` and `OpenClaw/templates/IDENTITY.md`; existing files are preserved and never read, edited, or overwritten. Review and customize newly created files after installation, then start a new OpenClaw session to reload the workspace files. The MVP has no runtime mode command, telemetry, conversation access, or shared global configuration.

### Updating

Pull the latest version in the cloned repository:

``` bash
cd UXUCode
git pull --ff-only
```

Claude Code (run inside a Claude Code session):

``` text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

Codex CLI:

After `git pull --ff-only` completes, restart Codex to load the plugin from the updated local directory.

OpenClaw:

For each target workspace, rerun `--dry-run`, then run the installer with that workspace's selected mode. To remove the profile, delete only the paired managed markers and their contents. To roll back, verify and restore that workspace's `AGENTS.md.uxucode-backup-*`. Stop on malformed markers instead of overwriting all of `AGENTS.md`.

### Usage Examples

``` text
# Claude Code
/uxu-code:spec Write a spec for login rate-limiting
/uxu-code:mode full

# Codex CLI
@spec Write a spec for login rate-limiting
@mode full
```

## Validation

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
node OpenClaw/scripts/validate-profile.js
node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js
node OpenClaw/evaluation/score-results.js <results.json>
```

See [OpenClaw/evaluation/README.md](OpenClaw/evaluation/README.md) for the OpenClaw protocol. It uses 52 sanitized cases to compare an unprofiled baseline workspace with a profiled workspace under pinned conditions. The release gate requires at least 35% lower median output tokens, at least 95% low-risk correctness, zero unsolicited external mutations, and zero missing required risk information. Static tests validate the gate logic; they do not prove real token savings.

## Acknowledgements

Thanks to:

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

------------------------------------------------------------------------

## Star History

[![Star History
Chart](https://api.star-history.com/svg?repos=uxudjs/UXUCode&type=Date)](https://star-history.com/#uxudjs/UXUCode&Date)
