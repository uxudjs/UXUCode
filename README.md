# CodeSkillHook

> 为 Claude Code 与 Codex CLI 分别构建的工程工作流技能与 Ponytail
> 极简主义 Hook。

### 🌐 选择语言 \| 選擇語言 \| Choose Language

-   [🇨🇳 简体中文](#-简体中文)
-   [🇹🇼 繁體中文](#-繁體中文)
-   [🇺🇸 English](#-english)

------------------------------------------------------------------------

## 🇨🇳 简体中文

CodeSkillHook 将软件工程全生命周期技能与 Ponytail
的"资深工程师极简模式"结合。

自 `v2.0.0` 起，Claude Code 与 Codex CLI 完全独立维护：

-   独立目录
-   独立插件配置
-   独立技能系统
-   独立 Hook 生命周期
-   独立运行环境

### 主要功能

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  🧠 完整工程工作流技能                                                                                           🪶 Ponytail 极简工程模式                                                           🔒 完全隔离架构
  --------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------- ----------------------------------------------------------------------
  需求分析`<br>`{=html}技术规格`<br>`{=html}项目规划`<br>`{=html}代码实现`<br>`{=html}测试验证`<br>`{=html}Code   避免过度设计`<br>`{=html}优先解决真实需求`<br>`{=html}保持代码简单、可靠、可维护   Claude 与 Codex
  Review`<br>`{=html}性能优化`<br>`{=html}安全检查`<br>`{=html}发布与迁移                                                                                                                            不共享运行目录`<br>`{=html}不使用符号链接`<br>`{=html}可独立升级维护

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### 项目结构

``` text
CodeSkillHook/
├── README.md
├── Claude/
│   ├── .claude-plugin/
│   ├── CLAUDE.md
│   ├── hooks/
│   ├── references/
│   ├── scripts/
│   └── skills/
└── Codex/
    ├── .codex-plugin/
    ├── AGENTS.md
    ├── hooks/
    ├── references/
    ├── scripts/
    └── skills/
```

### 安装方式

#### Claude Code

``` bash
claude --plugin-dir ./Claude
```

永久安装：

``` text
/plugin marketplace add ./Claude
/plugin install code-skill-hook@code-skill-hook-claude
```

#### Codex CLI

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

### 校验

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

### 鸣谢

-   DietrichGebert/ponytail：提供 Ponytail 极简工程模式与生命周期 Hook
    设计基础。
-   addyosmani/agent-skills：提供软件工程生命周期技能、检查清单与工作流基础。
-   multica-ai/andrej-karpathy-skills：启发 Think Before
    Coding、Simplicity First、Surgical Changes 与 Goal-Driven Execution
    等工程准则。

------------------------------------------------------------------------

## 🇹🇼 繁體中文

CodeSkillHook 將軟體工程全生命週期技能與 Ponytail
的「資深工程師極簡模式」結合。

自 `v2.0.0` 起，Claude Code 與 Codex CLI 完全獨立維護：

-   獨立目錄
-   獨立插件設定
-   獨立技能系統
-   獨立 Hook 生命週期
-   獨立執行環境

### 主要功能

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  🧠 完整工程工作流技能                                                                                           🪶 Ponytail 極簡工程模式                                                           🔒 完全隔離架構
  --------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------- ----------------------------------------------------------------------
  需求分析`<br>`{=html}技術規格`<br>`{=html}專案規劃`<br>`{=html}程式實作`<br>`{=html}測試驗證`<br>`{=html}Code   避免過度設計`<br>`{=html}優先解決真實需求`<br>`{=html}保持程式簡潔、可靠、易維護   Claude 與 Codex
  Review`<br>`{=html}效能優化`<br>`{=html}安全檢查`<br>`{=html}發布與遷移                                                                                                                            不共享執行目錄`<br>`{=html}不使用符號連結`<br>`{=html}可獨立升級維護

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### 安裝方式

Claude Code：

``` bash
claude --plugin-dir ./Claude
```

Codex CLI：

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

### 致謝

感謝 DietrichGebert/ponytail、addyosmani/agent-skills 與
multica-ai/andrej-karpathy-skills 提供工程模式、技能框架與最佳實踐。

------------------------------------------------------------------------

## 🇺🇸 English

CodeSkillHook combines full software-engineering lifecycle skills with
Ponytail's senior-engineer minimalism.

Since `v2.0.0`, Claude Code and Codex CLI are maintained independently.

### Features

  -----------------------------------------------------------------------------------------------------------------------------------------------
  🧠 Engineering Workflow Skills                                             🪶 Ponytail Minimal Engineering      🔒 Complete Isolation
  -------------------------------------------------------------------------- ------------------------------------ -------------------------------
  Requirement Analysis`<br>`{=html}Technical                                 Avoid                                Claude and Codex do not share
  Specification`<br>`{=html}Project                                          over-engineering`<br>`{=html}Focus   runtime
  Planning`<br>`{=html}Implementation`<br>`{=html}Testing`<br>`{=html}Code   on real                              directories`<br>`{=html}No
  Review`<br>`{=html}Performance Optimization`<br>`{=html}Security           requirements`<br>`{=html}Keep code   symbolic
  Review`<br>`{=html}Release & Migration                                     simple, reliable, and maintainable   links`<br>`{=html}Independent
                                                                                                                  upgrades

  -----------------------------------------------------------------------------------------------------------------------------------------------

### Installation

Claude Code:

``` bash
claude --plugin-dir ./Claude
```

Codex CLI:

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

### Acknowledgements

Thanks to DietrichGebert/ponytail, addyosmani/agent-skills, and
multica-ai/andrej-karpathy-skills for engineering patterns, skills, and
development principles.
