# UXUCode

> 为 Claude Code 与 Codex CLI 分别构建的工程工作流技能与 Ponytail
> 极简主义 Hook。

### 🌐 选择语言 \| 選擇語言 \| Choose Language

-   [🇨🇳 简体中文](#-简体中文)
-   [🇹🇼 繁體中文](#-繁體中文)
-   [🇺🇸 English](#-english)

------------------------------------------------------------------------

# 🇨🇳 简体中文

📖 [查看完整简体中文使用指南](docs/USAGE.zh-CN.md)

UXUCode 将软件工程全生命周期技能与 Ponytail
的「资深工程师极简模式」结合。

自 `v3.0.0` 起，Claude Code 与 Codex CLI 完全独立维护：

-   独立目录
-   独立插件配置
-   独立技能系统
-   独立 Hook 生命周期
-   独立运行环境

避免两个 CLI 因架构差异产生兼容问题。

## 主要功能

| 🧠 完整工程工作流技能 | 🪶 Ponytail 极简工程模式 | 🔒 完全隔离架构 |
|----------------------|--------------------------|------------------|
| 需求分析 | 避免过度设计 | Claude 与 Codex 不共享运行目录 |
| 技术规格 | 优先解决真实需求 | 不使用符号链接 |
| 项目规划 | 保持代码简单、可靠、可维护 | 可独立升级维护 |
| 代码实现 | | |
| 测试验证 | | |
| Code Review | | |
| 性能优化 | | |
| 安全检查 | | |
| 发布与迁移 | | |                                        

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

本地 Marketplace 记录依赖克隆目录，请不要在安装后立即删除仓库。更新时执行 `git pull`，再按对应 CLI 的插件更新流程刷新。

## 更新

先进入克隆的 UXUCode 目录并拉取最新版本：

``` bash
git pull origin main
```

### Claude Code

在 Claude Code 中依次执行：

``` text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

如果已拉取新提交但 `/plugin update` 提示已是最新版本，说明本地缓存仍在使用未变更的插件版本号；可保留插件数据并强制重新安装：

``` text
/plugin uninstall uxu-code@uxu-code-claude --keep-data
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

Codex 会把本地 Marketplace 插件复制到缓存中。拉取最新提交后，重新安装以更新缓存：

``` bash
codex plugin remove uxu-code@uxu-code-codex
codex plugin add uxu-code@uxu-code-codex
```

然后退出并重新启动 Codex。`codex plugin marketplace upgrade` 用于刷新 Marketplace 来源；对于此本地 Marketplace，重新安装才会更新已缓存的插件内容。

## 推荐搭配

建议配合 [CodeGraph](https://github.com/colbymchenry/codegraph) 使用：先用 CodeGraph 浏览仓库结构与依赖关系，再用 UXUCode 的 `spec`、`plan`、`build`、`review` 等工作流完成实现与验证。CodeGraph 需单独安装。

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

-   DietrichGebert/ponytail
-   JuliusBrussee/caveman
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

------------------------------------------------------------------------

# 🇹🇼 繁體中文

📖 [查看完整繁體中文使用指南](docs/USAGE.zh-TW.md)

UXUCode 結合軟體工程生命週期技能與 Ponytail
的「資深工程師極簡模式」。

自 `v3.0.0` 起，Claude Code 與 Codex CLI 完全獨立維護：

-   獨立目錄
-   獨立插件設定
-   獨立技能系統
-   獨立 Hook 生命週期
-   獨立執行環境

避免兩個 CLI 因架構差異產生相容性問題。

## 主要功能

| 🧠 完整工程工作流技能 | 🪶 Ponytail 極簡工程模式 | 🔒 完全隔離架構 |
|----------------------|--------------------------|------------------|
| 需求分析 | 避免過度設計 | Claude 與 Codex 不共享執行目錄 |
| 技術規格 | 優先解決真實需求 | 不使用符號連結 |
| 專案規劃 | 保持程式碼簡單、可靠、易維護 | 可獨立升級維護 |
| 程式實作 | | |
| 測試驗證 | | |
| Code Review | | |
| 效能最佳化 | | |
| 安全檢查 | | |
| 發布與遷移 | | |                                           

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

本地 Marketplace 記錄依賴複製目錄，請不要在安裝後立即刪除倉庫。更新時執行 `git pull`，再按對應 CLI 的插件更新流程重新整理。

## 更新

先進入複製的 UXUCode 目錄並拉取最新版本：

``` bash
git pull origin main
```

### Claude Code

在 Claude Code 中依序執行：

``` text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

如果已拉取新提交但 `/plugin update` 顯示已是最新版本，表示本機快取仍在使用未變更的插件版本號；可保留插件資料並強制重新安裝：

``` text
/plugin uninstall uxu-code@uxu-code-claude --keep-data
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

Codex 會將本機 Marketplace 插件複製到快取中。拉取最新提交後，請重新安裝以更新快取：

``` bash
codex plugin remove uxu-code@uxu-code-codex
codex plugin add uxu-code@uxu-code-codex
```

接著退出並重新啟動 Codex。`codex plugin marketplace upgrade` 用於重新整理 Marketplace 來源；對這個本機 Marketplace 而言，重新安裝才會更新已快取的插件內容。

## 建議搭配

建議搭配 [CodeGraph](https://github.com/colbymchenry/codegraph) 使用：先用 CodeGraph 瀏覽倉庫結構與相依關係，再用 UXUCode 的 `spec`、`plan`、`build`、`review` 等工作流完成實作與驗證。CodeGraph 需另外安裝。

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

-   DietrichGebert/ponytail
-   JuliusBrussee/caveman
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

------------------------------------------------------------------------

# 🇺🇸 English

📖 [Read the complete English usage guide](docs/USAGE.en.md)

UXUCode combines full software engineering lifecycle skills with
Ponytail's senior-engineer minimalism.

Since `v3.0.0`, Claude Code and Codex CLI are maintained as completely
independent distributions:

-   Independent directories
-   Independent plugin configurations
-   Independent skill systems
-   Independent Hook lifecycles
-   Independent runtime environments

This avoids compatibility issues caused by architectural differences
between the two CLIs.

## Features

| 🧠 Complete Engineering Workflow Skills | 🪶 Ponytail Minimal Engineering Mode | 🔒 Fully Isolated Architecture |
|----------------------------------------|--------------------------------------|--------------------------------|
| Requirement Analysis | Avoid over-engineering | Claude and Codex do not share runtime directories |
| Technical Specification | Solve real problems first | No symbolic links |
| Project Planning | Keep code simple, reliable, and maintainable | Independent upgrade and maintenance |
| Implementation | | |
| Testing & Validation | | |
| Code Review | | |
| Performance Optimization | | |
| Security Review | | |
| Release & Migration | | |

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

Local Marketplace entries reference the cloned directory — do not delete the repo immediately after installation. To update, run `git pull` then refresh plugins per your CLI's update flow.

## Updating

From the cloned UXUCode directory, pull the latest release:

``` bash
git pull origin main
```

### Claude Code

Run these commands in Claude Code:

``` text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

If you pulled new commits but `/plugin update` reports that the plugin is current, the local cache is still using an unchanged plugin version. Preserve plugin data and force a reinstall:

``` text
/plugin uninstall uxu-code@uxu-code-claude --keep-data
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

### Codex CLI

Codex copies local Marketplace plugins into its cache. After pulling new commits, reinstall the plugin to refresh that cache:

``` bash
codex plugin remove uxu-code@uxu-code-codex
codex plugin add uxu-code@uxu-code-codex
```

Then exit and restart Codex. `codex plugin marketplace upgrade` refreshes Marketplace sources; for this local Marketplace, reinstalling is what refreshes the cached plugin contents.

## Recommended Companion

We recommend using [CodeGraph](https://github.com/colbymchenry/codegraph) alongside UXUCode: use CodeGraph to explore repository structure and dependencies first, then use UXUCode workflows such as `spec`, `plan`, `build`, and `review` to implement and verify the change. Install CodeGraph separately.

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

-   DietrichGebert/ponytail
-   JuliusBrussee/caveman
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

------------------------------------------------------------------------

## Star History

[![Star History
Chart](https://api.star-history.com/svg?repos=uxudjs/UXUCode&type=Date)](https://star-history.com/#uxudjs/UXUCode&Date)
