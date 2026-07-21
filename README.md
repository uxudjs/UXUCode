# CodeSkillHook

> 为 Claude Code 与 Codex CLI 分别构建的工程工作流技能与 Ponytail 极简主义 Hook。

**简体中文** | [繁體中文](#繁體中文) | [English](#english)

---

## 简体中文

CodeSkillHook 将软件工程全生命周期技能与 Ponytail 的“资深工程师极简模式”组合在一起。自 `v2.0.0` 起，Claude Code 与 Codex CLI 完全分目录维护：两套清单、指令文件、技能、Hook 和运行时互不依赖，可以针对各自 CLI 独立演进。

### 主要特性

- **双 CLI 原生适配**：Claude Code 使用 `.claude-plugin`、`CLAUDE.md` 和 `CLAUDE_PLUGIN_ROOT`；Codex 使用 `.codex-plugin`、`.agents`、`AGENTS.md`、`PLUGIN_ROOT` 与 `PLUGIN_DATA`。
- **38 个工程技能**：覆盖需求澄清、规格、规划、实现、测试、审查、简化、性能、安全、发布与迁移。
- **Ponytail 模式**：通过会话与提示词 Hook 持续约束过度设计，同时保留正确性、安全性、可访问性和用户需求。
- **真正隔离**：`Claude/` 与 `Codex/` 各自包含完整副本，不使用共享目录、符号链接或跨平台兼容路径。

### 目录结构

```text
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
    ├── .agents/
    ├── .codex-plugin/
    ├── AGENTS.md
    ├── hooks/
    ├── references/
    ├── scripts/
    └── skills/
```

### 安装

先克隆仓库：

```bash
git clone https://github.com/uxudjs/CodeSkillHook.git
cd CodeSkillHook
```

#### Claude Code

临时加载并验证：

```bash
claude --plugin-dir ./Claude
```

持久安装：

```text
/plugin marketplace add ./Claude
/plugin install code-skill-hook@code-skill-hook-claude
```

重启 Claude Code，或执行 `/reload-plugins`。技能调用格式为 `/code-skill-hook:<skill-name>`，例如 `/code-skill-hook:plan`。

#### Codex CLI

注册本地 Marketplace 并安装：

```text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

重启 Codex。技能调用格式为 `@<skill-name>`，例如 `@plan`；可用 `/hooks` 检查 Hook 状态。

> 本地 Marketplace 记录依赖克隆目录，请不要在安装后立即删除仓库。更新时执行 `git pull`，再按对应 CLI 的插件更新流程刷新。

### 使用示例

```text
# Claude Code
/code-skill-hook:spec 为登录限流功能编写规格
/code-skill-hook:ponytail ultra

# Codex CLI
@spec 为登录限流功能编写规格
@ponytail ultra
```

### 校验

```bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

### 鸣谢

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)：提供 Ponytail 极简工程模式与生命周期 Hook 的设计基础。
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)：提供软件工程生命周期技能、检查清单与工作流基础。
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)：启发了 Think Before Coding、Simplicity First、Surgical Changes 与 Goal-Driven Execution 四项行为准则。

---

## 繁體中文

[简体中文](#简体中文) | **繁體中文** | [English](#english)

CodeSkillHook 結合軟體工程全生命週期技能與 Ponytail 的資深工程師極簡模式。自 `v2.0.0` 起，Claude Code 與 Codex CLI 完全分開維護，各自擁有獨立的清單、指令、技能、Hook 與執行環境。

### 主要功能

- Claude Code 原生使用 `.claude-plugin`、`CLAUDE.md` 與 `CLAUDE_PLUGIN_ROOT`。
- Codex 原生使用 `.codex-plugin`、`.agents`、`AGENTS.md`、`PLUGIN_ROOT` 與 `PLUGIN_DATA`。
- 38 個工程技能涵蓋規格、規劃、實作、測試、審查、簡化、安全、效能與發佈。
- `Claude/` 與 `Codex/` 不共享目錄、符號連結或相容層，可獨立更新。

### 安裝方式

```bash
git clone https://github.com/uxudjs/CodeSkillHook.git
cd CodeSkillHook
```

Claude Code：

```bash
claude --plugin-dir ./Claude
```

或在 Claude Code 中持久安裝：

```text
/plugin marketplace add ./Claude
/plugin install code-skill-hook@code-skill-hook-claude
```

以 `/code-skill-hook:<skill-name>` 呼叫技能。

Codex CLI：

```text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

以 `@<skill-name>` 呼叫技能，並可用 `/hooks` 檢查 Hook。

### 致謝

感謝 [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)、[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) 與 [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) 提供的模式、技能與工程行為準則。

---

## English

[简体中文](#简体中文) | [繁體中文](#繁體中文) | **English**

CodeSkillHook combines full-lifecycle software-engineering skills with Ponytail's senior-engineer minimalism. Since `v2.0.0`, Claude Code and Codex CLI are maintained as fully independent distributions, each with its own manifests, instructions, skills, hooks, and runtime contract.

### Key Features

- **Native dual-CLI support**: Claude Code uses `.claude-plugin`, `CLAUDE.md`, and `CLAUDE_PLUGIN_ROOT`; Codex uses `.codex-plugin`, `.agents`, `AGENTS.md`, `PLUGIN_ROOT`, and `PLUGIN_DATA`.
- **38 engineering skills** spanning discovery, specification, planning, implementation, testing, review, simplification, security, performance, migration, and shipping.
- **Ponytail mode** continuously discourages over-engineering without weakening correctness, security, accessibility, or requested behavior.
- **Complete isolation**: `Claude/` and `Codex/` share no runtime folders, symlinks, or compatibility paths.

### Installation

Clone the repository first:

```bash
git clone https://github.com/uxudjs/CodeSkillHook.git
cd CodeSkillHook
```

For a temporary Claude Code load:

```bash
claude --plugin-dir ./Claude
```

For a persistent Claude Code installation:

```text
/plugin marketplace add ./Claude
/plugin install code-skill-hook@code-skill-hook-claude
```

Invoke skills as `/code-skill-hook:<skill-name>`.

For Codex CLI:

```text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

Invoke skills as `@<skill-name>` and inspect hooks with `/hooks`.

### Validation

```bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

### Acknowledgements

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) for the Ponytail minimal-engineering mode and lifecycle-hook foundation.
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) for the engineering lifecycle skills, checklists, and workflow foundation.
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) for inspiring the Think Before Coding, Simplicity First, Surgical Changes, and Goal-Driven Execution guidelines.

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=uxudjs/CodeSkillHook&type=Date)](https://star-history.com/#uxudjs/CodeSkillHook&Date)
