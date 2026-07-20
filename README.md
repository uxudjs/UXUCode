# Agent Plugins — Claude Code & Codex 兼容版

两个插件（ponytail + addy-agent-skills），适配 Claude Code 和 Codex CLI 的 plugin/skill/hook 体系。本文件供人类阅读和 AI Agent 自动执行任务双重使用。

---

## 目录结构

```
agent/
├── README.md                 ← 本文件
├── CLAUDE.md                 ← Claude Code 全局行为准则
├── AGENTS.md                 ← Codex 全局行为准则（内容同 CLAUDE.md）
├── addy-agent-skills/        ← Addy Osmani 24 个工程技能
│   ├── CLAUDE.md             ← 元技能注入
│   ├── hooks/                ← SessionStart / SDD 缓存 hook 脚本
│   └── skills/               ← 各工程技能（SKILL.md × 24）
└── ponytail/                 ← Dietrich Gebert 懒惰高级开发模式
    ├── CLAUDE.md             ← 元指令
    ├── hooks/                ← 生命周期 hook 脚本
    └── skills/               ← 6 个技能（ponytail / help / review / audit / gain / debt）
```

## 全局规则

`CLAUDE.md` 和 `AGENTS.md` 内容相同，定义项目级行为准则（Think Before Coding / 简单优先 / 手术式修改 / 目标驱动）。

- **Claude Code**：放在项目根目录自动读取，或复制到 `~/.claude/CLAUDE.md` 作为全局默认
- **Codex**：放在项目根目录自动读取，或复制到 `~/.codex/AGENTS.md` 作为全局默认

---

## 安装

以下 `${PLUGIN_DIR}` 表示本 README 所在目录的绝对路径（如 `C:\Users\brand\OneDrive\Desktop\agent`）。

### Claude Code

**方式一：自动加载（推荐）**

```powershell
New-Item -Type Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse -Force "${PLUGIN_DIR}\addy-agent-skills" "$env:USERPROFILE\.claude\skills\addy-agent-skills"
Copy-Item -Recurse -Force "${PLUGIN_DIR}\ponytail" "$env:USERPROFILE\.claude\skills\ponytail"
```

启动后运行 `/reload-plugins` 生效。

**方式二：--plugin-dir 指定**

```bash
claude --plugin-dir "${PLUGIN_DIR}\ponytail" --plugin-dir "${PLUGIN_DIR}\addy-agent-skills"
```

### Codex CLI

**方式一：自动加载（推荐）**

```powershell
New-Item -Type Directory -Force -Path "$env:USERPROFILE\.codex\plugins"
Copy-Item -Recurse -Force "${PLUGIN_DIR}\addy-agent-skills" "$env:USERPROFILE\.codex\plugins\addy-agent-skills"
Copy-Item -Recurse -Force "${PLUGIN_DIR}\ponytail" "$env:USERPROFILE\.codex\plugins\ponytail"
```

**方式二：config.toml 配置**

在 `~/.codex/config.toml` 中添加插件路径。

### Codex config.toml 参考

安装后在 `~/.codex/config.toml` 中自动生成的配置段：

```toml
[marketplaces.ponytail]
source = "https://github.com/DietrichGebert/ponytail.git"
source_type = "git"

[marketplaces.agent-skills]
source = "https://github.com/addyosmani/agent-skills.git"
source_type = "git"

[plugins."ponytail@ponytail"]
enabled = true

[plugins."agent-skills@agent-skills"]
enabled = true
```

---

## cc-switch 集成（重要）

如果电脑安装了 **cc-switch**（Claude Code 多模型切换工具），安装/卸载插件时 **必须同步修改 cc-switch 的配置**，否则 cc-switch 会尝试同步已删除的插件配置，导致 Claude Code 或 Codex 启动异常。

cc-switch 有两处需要修改：**GUI 界面** 和 **SQLite 数据库**。

### 安装时 — 注册插件仓库

在 cc-switch GUI 中操作：进入「通用配置」→「技能仓库管理」→ 添加以下两个仓库：

| 字段 | ponytail | addy-agent-skills |
|------|----------|-------------------|
| Owner | `DietrichGebert` | `addyosmani` |
| Name | `ponytail` | `agent-skills` |
| Branch | `main` | `main` |
| Enabled | ✅ | ✅ |

或在 cc-switch 数据库中直接写入（cc-switch 运行时请先关闭）：

```sql
-- cc-switch 数据库路径: ~/.cc-switch/cc-switch.db
INSERT INTO skill_repos (owner, name, branch, enabled)
VALUES ('DietrichGebert', 'ponytail', 'main', 1);

INSERT INTO skill_repos (owner, name, branch, enabled)
VALUES ('addyosmani', 'agent-skills', 'main', 1);

-- 查看全部注册仓库: SELECT * FROM skill_repos;
```

执行方式（Node.js 22 内置 SQLite）：

```javascript
// 使用 --experimental-sqlite 标志
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(`${process.env.USERPROFILE}\\.cc-switch\\cc-switch.db`);
db.prepare("INSERT INTO skill_repos (owner, name, branch, enabled) VALUES (?, ?, ?, ?)").run('DietrichGebert', 'ponytail', 'main', 1);
db.prepare("INSERT INTO skill_repos (owner, name, branch, enabled) VALUES (?, ?, ?, ?)").run('addyosmani', 'agent-skills', 'main', 1);
db.close();
```

### 卸载时 — 清理注册和所有残留

完整卸载需要清理 **Claude Code + Codex + cc-switch** 三处。

#### 1. Claude Code 清理

删除文件：
```
~/.claude/.ponytail-active
~/.claude/.ponytail-statusline-nudged
~/.claude/plugins/cache/ponytail/
~/.claude/plugins/data/ponytail-ponytail/
~/.claude/plugins/marketplaces/ponytail/
~/.claude/plugins/cache/addy-agent-skills/
~/.claude/plugins/data/agent-skills-addy-agent-skills/
~/.claude/plugins/marketplaces/addy-agent-skills/
```

修改配置文件 `~/.claude/settings.json`：
- 移除 `enabledPlugins` 中的 `agent-skills@addy-agent-skills` 和 `ponytail@ponytail`
- 移除 `extraKnownMarketplaces` 中的 `addy-agent-skills`

修改 `~/.claude/plugins/installed_plugins.json`：
- 移除 `ponytail@ponytail` 和 `agent-skills@addy-agent-skills` 条目

修改 `~/.claude/plugins/known_marketplaces.json`：
- 移除 `ponytail` 和 `addy-agent-skills` 键（若仅剩这两项，清空为 `{}`）

#### 2. Codex 清理

删除文件：
```
~/.codex/plugins/cache/ponytail/
~/.codex/plugins/data/ponytail-ponytail/
~/.codex/.tmp/marketplaces/ponytail/
~/.codex/plugins/cache/agent-skills/
~/.codex/.tmp/marketplaces/agent-skills/
```

修改 `~/.codex/config.toml`：
- 移除 `[marketplaces.ponytail]` 段
- 移除 `[marketplaces.agent-skills]` 段
- 移除 `[plugins."ponytail@ponytail"]` 段
- 移除 `[plugins."agent-skills@agent-skills"]` 段
- 移除所有 `[hooks.state."ponytail@ponytail:..."]` 段

#### 3. cc-switch 清理

**GUI 方式**：打开 cc-switch →「通用配置」→「技能仓库管理」→ 删除 `ponytail` 和 `agent-skills` 两条记录。

**数据库方式**（关闭 cc-switch 后操作）：

```sql
DELETE FROM skill_repos WHERE owner='DietrichGebert' AND name='ponytail';
DELETE FROM skill_repos WHERE owner='addyosmani' AND name='agent-skills';
-- 验证: SELECT * FROM skill_repos;
```

Node.js 批量备份目录清理：

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.cc-switch\skill-backups"
```

> **注意**：必须三个位置全部清理。仅删除插件文件而不修改 cc-switch 数据库，cc-switch 会在下次同步时尝试重新拉取已删除的插件，导致配置不一致。

---

## 依赖

| 依赖 | 用途 | 安装 |
|------|------|------|
| Node.js 22+ | ponytail hooks 必需 | `winget install OpenJS.NodeJS.LTS` |
| Git Bash | addy-agent-skills bash 脚本 | `winget install Git.Git` |
| jq | SDD 缓存 hook JSON 解析 | `winget install jqlang.jq` |
| curl | SDD 缓存 hook HTTP 请求 | Git Bash 自带 |

---

## 验证

启动 Claude Code 或 Codex 后运行：

| 命令 | 效果 |
|------|------|
| `/addy-agent-skills:using-agent-skills` | 显示 24 个技能发现元技能 |
| `/ponytail:ponytail-help` | 显示 Ponytail 参考卡片 |

---

## AI Agent 快速摘要

若你是执行自动化任务的 AI，以下是可执行的要件清单：

- **安装路径**：Claude Code → `~/.claude/skills/` | Codex → `~/.codex/plugins/`
- **cc-switch DB**：`~/.cc-switch/cc-switch.db`，表 `skill_repos`，字段 `owner/name/branch/enabled`
- **cc-switch settings**：`~/.cc-switch/settings.json`，字段 `skillSyncMethod`（通常为 `auto`）
- **Claude Code 配置**：`settings.json` / `installed_plugins.json` / `known_marketplaces.json`
- **Codex 配置**：`config.toml` → `[marketplaces]` `[plugins]` `[hooks.state]` 段
- **卸载黄金规则**：删文件 → 修 JSON → 修 TOML → 删 SQLite 行，四步缺一不可
