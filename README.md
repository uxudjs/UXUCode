# CodeSkillHook

> 为 Claude Code 与 Codex CLI 分别构建的工程工作流技能与 Ponytail
> 极简主义 Hook。

### 🌐 选择语言 \| 選擇語言 \| Choose Language

-   [🇨🇳 简体中文](#-简体中文)
-   [🇹🇼 繁體中文](#-繁體中文)
-   [🇺🇸 English](#-english)

------------------------------------------------------------------------

# 🇨🇳 简体中文

CodeSkillHook 将软件工程全生命周期技能与 Ponytail
的「资深工程师极简模式」结合。

自 `v2.0.0` 起，Claude Code 与 Codex CLI 完全独立维护：

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
CodeSkillHook/
├── README.md
├── Claude/
└── Codex/
```

## 安装方式

### Claude Code

``` bash
claude --plugin-dir ./Claude
```

### Codex CLI

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

## 校验

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

## 鸣谢

-   DietrichGebert/ponytail
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

------------------------------------------------------------------------

# 🇹🇼 繁體中文

CodeSkillHook 結合軟體工程生命週期技能與 Ponytail
的「資深工程師極簡模式」。

自 `v2.0.0` 起，Claude Code 與 Codex CLI 完全獨立維護：

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
CodeSkillHook/
├── README.md
├── Claude/
└── Codex/
```

## 安裝方式

### Claude Code

``` bash
claude --plugin-dir ./Claude
```

### Codex CLI

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

## 驗證

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

## 致謝

-   DietrichGebert/ponytail
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

------------------------------------------------------------------------

# 🇺🇸 English

CodeSkillHook combines full software engineering lifecycle skills with
Ponytail's senior-engineer minimalism.

Since `v2.0.0`, Claude Code and Codex CLI are maintained as completely
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
CodeSkillHook/
├── README.md
├── Claude/
└── Codex/
```

## Installation

### Claude Code

``` bash
claude --plugin-dir ./Claude
```

### Codex CLI

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

## Validation

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

## Acknowledgements

Thanks to:

-   DietrichGebert/ponytail
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

------------------------------------------------------------------------

## Star History

[![Star History
Chart](https://api.star-history.com/svg?repos=uxudjs/CodeSkillHook&type=Date)](https://star-history.com/#uxudjs/CodeSkillHook&Date)
