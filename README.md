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
└── Codex/
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
```

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
└── Codex/
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
```

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
└── Codex/
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
```

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
