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

避免两个 CLI 因架构差异产生兼容问题。

### 主要功能

-   ✅ **双 CLI 原生适配**
    -   Claude Code：`.claude-plugin`、`CLAUDE.md`、`CLAUDE_PLUGIN_ROOT`
    -   Codex
        CLI：`.codex-plugin`、`.agents`、`AGENTS.md`、`PLUGIN_ROOT`
-   🧠 **完整工程工作流技能**
    -   需求分析
    -   技术规格
    -   项目规划
    -   代码实现
    -   测试验证
    -   Code Review
    -   性能优化
    -   安全检查
    -   发布与迁移
-   🪶 **Ponytail 极简工程模式**
    -   避免过度设计
    -   优先解决真实需求
    -   保持代码简单、可靠、可维护
-   🔒 **完全隔离架构**
    -   Claude 与 Codex 不共享运行目录
    -   不使用符号链接
    -   可独立升级维护

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

安装 Claude Code 后：

``` bash
claude --plugin-dir ./Claude
```

永久安装：

``` text
/plugin marketplace add ./Claude
/plugin install code-skill-hook@code-skill-hook-claude
```

技能调用：

``` text
/code-skill-hook:<skill-name>
```

示例：

``` text
/code-skill-hook:plan
/code-skill-hook:ponytail
```

#### Codex CLI

安装 Codex CLI 后：

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

技能调用：

``` text
@<skill-name>
```

查看 Hook：

``` text
/hooks
```

### 校验

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

### 鸣谢

-   DietrichGebert/ponytail\
    提供 Ponytail 极简工程模式与生命周期 Hook 设计基础。

-   addyosmani/agent-skills\
    提供软件工程生命周期技能、检查清单与工作流理念。

-   multica-ai/andrej-karpathy-skills\
    启发 Think Before Coding、Simplicity First、Surgical Changes 与
    Goal-Driven Execution 等工程准则。

------------------------------------------------------------------------

## 🇹🇼 繁體中文

CodeSkillHook 結合軟體工程生命週期技能與 Ponytail 資深工程師極簡模式。

自 `v2.0.0` 起，Claude Code 與 Codex CLI 完全分離維護：

-   獨立目錄
-   獨立插件設定
-   獨立技能系統
-   獨立 Hook 執行環境

### 主要功能

-   ✅ Claude Code 與 Codex CLI 原生適配
-   🧠 涵蓋需求、規格、規劃、開發、測試、審查、安全與發布流程
-   🪶 Ponytail 極簡工程模式，降低過度設計
-   🔒 Claude 與 Codex 完全隔離，可獨立演進

### 安裝

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

感謝：

-   DietrichGebert/ponytail
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

提供的工程模式、技能框架與最佳實踐。

------------------------------------------------------------------------

## 🇺🇸 English

CodeSkillHook combines full software-engineering lifecycle skills with
Ponytail's senior-engineer minimalism.

Since `v2.0.0`, Claude Code and Codex CLI are maintained as completely
independent distributions.

### Features

-   ✅ Native Claude Code and Codex CLI support
-   🧠 Engineering workflow skills covering planning, implementation,
    testing, review, security, and delivery
-   🪶 Ponytail minimal engineering mode to prevent unnecessary
    complexity
-   🔒 Fully isolated Claude and Codex environments

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

### Validation

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

### Acknowledgements

Thanks to:

-   DietrichGebert/ponytail
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

for providing engineering patterns, skills, and development principles.

------------------------------------------------------------------------

## Star History

[![Star History
Chart](https://api.star-history.com/svg?repos=uxudjs/CodeSkillHook&type=Date)](https://star-history.com/#uxudjs/CodeSkillHook&Date)
