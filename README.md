# Agent Plugins — Claude Code & Codex 兼容版

两个插件（ponytail + addy-agent-skills），适配 Claude Code 和 Codex CLI 的 plugin/skill/hook 体系。本文件供人类阅读和 AI Agent 自动执行任务双重使用。

---

## 目录结构

```
CodeSkillHook/
├── README.md                 ← 本文件
├── CLAUDE.md                 ← Claude Code 全局行为准则
├── AGENTS.md                 ← Codex 全局行为准则（内容同 CLAUDE.md）
├── addy-agent-skills/        ← Addy Osmani 24 个工程技能
│   ├── CLAUDE.md             ← 元技能注入
│   ├── .codex-plugin/
│   │   └── plugin.json       ← Codex 插件元数据
│   ├── hooks/                ← SessionStart hook 脚本
│   └── skills/               ← 各工程技能（SKILL.md × 24）
└── ponytail/                 ← Dietrich Gebert 懒惰高级开发模式
    ├── CLAUDE.md             ← 元指令
    ├── .codex-plugin/
    │   └── plugin.json       ← Codex 插件元数据
    ├── hooks/                ← 生命周期 hook 脚本
    └── skills/               ← 6 个技能（ponytail / help / review / audit / gain / debt）
```

## 全局规则

`CLAUDE.md` 和 `AGENTS.md` 内容相同，定义项目级行为准则（Think Before Coding / 简单优先 / 手术式修改 / 目标驱动）。

- **Claude Code**：放在项目根目录自动读取，或复制到 `~/.claude/CLAUDE.md` 作为全局默认
- **Codex**：放在项目根目录自动读取，或复制到 `~/.codex/AGENTS.md` 作为全局默认

---

## 安装

### Claude Code

```powershell
New-Item -Type Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse -Force "${PLUGIN_DIR}\addy-agent-skills" "$env:USERPROFILE\.claude\skills\addy-agent-skills"
Copy-Item -Recurse -Force "${PLUGIN_DIR}\ponytail" "$env:USERPROFILE\.claude\skills\ponytail"
```

启动后运行 `/reload-plugins` 生效。

### Codex CLI

**Codex 不支持直接复制文件到 `~/.codex/plugins/`**，必须通过 marketplace 注册后安装。

#### 前置修复（3 处必须处理）

**1. 修复 ponytail hooks 环境变量**

ponytail 的 `hooks/claude-codex-hooks.json` 使用了 `${CLAUDE_PLUGIN_ROOT}` 环境变量——这是 Claude Code 专属的，Codex 不会设置该变量。需要在安装前把 `commandWindows` 字段中的 `$env:CLAUDE_PLUGIN_ROOT` 替换为插件的实际安装路径（`command` 字段是 Linux 路径，Codex 在 Windows 上不会用到，保留原样即可）。

> 最终路径可通过 `codex plugin list --json` 获取 `installedPath` 字段确定。

**2. 修复 addy-agent-skills 的 plugin.json**

`.codex-plugin/plugin.json` 中 `"hooks"` 字段为空 `{}`，需要改为 `"hooks": "./hooks/hooks.json"`，否则 Codex 不会加载 hooks。

**3. 修复 addy-agent-skills 的 hooks.json — 添加 commandWindows**

`hooks/hooks.json` 只有 Linux bash 的 `command` 字段，缺少 Windows 的 `commandWindows` 字段。需添加：

```json
"commandWindows": "pwsh -NoProfile -Command \"& '<plugin_root>\\hooks\\session-start.ps1'\""
```

#### 安装步骤

```powershell
# 步骤 1：创建 local marketplace
$mpRoot = "$env:USERPROFILE\.codex\local-marketplaces\code-skill-hook"
New-Item -Type Directory -Force -Path "$mpRoot\.agents\plugins"
New-Item -Type Directory -Force -Path "$mpRoot\plugins"

# 步骤 2：复制插件到 marketplace 目录
Copy-Item -Recurse -Force "${PLUGIN_DIR}\ponytail" "$mpRoot\plugins\ponytail"
Copy-Item -Recurse -Force "${PLUGIN_DIR}\addy-agent-skills" "$mpRoot\plugins\addy-agent-skills"

# 步骤 3：执行前置修复（见上文三处必须处理）

# 步骤 4：用 Node.js 生成 marketplace.json（避免 PowerShell BOM 污染）
node -e "
const fs = require('fs');
const mp = {
  name: 'code-skill-hook',
  interface: { displayName: 'Code Skill Hook' },
  plugins: [
    {
      name: 'ponytail',
      source: { source: 'local', path: './plugins/ponytail' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Productivity'
    },
    {
      name: 'agent-skills',
      source: { source: 'local', path: './plugins/addy-agent-skills' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Productivity'
    }
  ]
};
fs.mkdirSync('${mpRoot}/.agents/plugins'.replace(/\\/g,'/'), {recursive: true});
fs.writeFileSync('${mpRoot}/.agents/plugins/marketplace.json'.replace(/\\/g,'/'), JSON.stringify(mp, null, 2)+'\n');
console.log('marketplace.json written');
"

# 步骤 5：注册 marketplace 并安装
codex plugin marketplace add $mpRoot
codex plugin add ponytail@code-skill-hook
codex plugin add agent-skills@code-skill-hook

# 步骤 6：通过 codex plugin list 获取实际安装路径，然后修复 hooks 中的环境变量
codex plugin list --json
```

---

## AI Agent 行为约束（必读）

**以下规则出自本次安装中踩过的每一个坑。在 Codex 上安装任何插件时必须逐条遵守，不得凭直觉跳过。**

### 规则 1：Codex ≠ Claude Code，永远不要假设文件复制即可安装

Claude Code 允许将插件直接复制到 `~/.claude/skills/` 即可生效。Codex **完全不同**——`~/.codex/plugins/` 目录不会被自动扫描。

> **约束**：安装 Codex 插件前，先用 `codex plugin --help` 确认安装机制。永远不要假设"放到某个目录就行"。

### 规则 2：marketplace.json 必须严格放在 `.agents/plugins/` 下

Codex marketplace 的 manifest 文件路径是硬性约束：`<marketplace_root>/.agents/plugins/marketplace.json`。放在 marketplace root 或其他任何位置都会报 `marketplace root does not contain a supported manifest`。

> **约束**：创建 marketplace 前，先用 `codex plugin marketplace add --help` 和已安装的 bundled marketplace 目录结构交叉验证 manifest 路径。不要自行猜测。

### 规则 3：永远不要假设跨工具的环境变量互通

`${CLAUDE_PLUGIN_ROOT}` 和 `$env:CLAUDE_PLUGIN_ROOT` 是 Claude Code 专属的环境变量。Codex **不会设置这些变量**，在 Codex 的 hook 执行环境中它们为空。

> **约束**：任何包含 `CLAUDE_` 前缀环境变量的 hook 脚本，在 Codex 上必须先验证该变量是否存在，不存在则必须用绝对路径替代 `commandWindows` 字段。同理，不要假设 `CODEX_` 变量在 Claude Code 中存在。

### 规则 4：安装第三方插件前必须验证 plugin.json

`.codex-plugin/plugin.json` 中的 `hooks` 字段可能为空 `{}`——这意味着插件声明了 hook 支持但实际上没有指向任何 hook 文件。直接安装后 hooks 不会触发。

> **约束**：安装任何第三方 Codex 插件前，必须先读取其 `.codex-plugin/plugin.json`，确认：
> - `hooks` 字段非空且指向真实存在的 hooks 文件
> - `skills` 字段指向真实存在的 skills 目录
> 任一为空则标黄修复后再安装。

### 规则 5：Windows 上每个 hook entry 必须有 commandWindows

hooks.json 中只有 `command`（Linux/Mac bash）而没有 `commandWindows` 的插件，在 Windows 上的 Codex 不会执行任何 hook。

> **约束**：安装插件前检查 hooks.json 的每个 entry，若缺少 `commandWindows` 字段则必须补充。`commandWindows` 应使用 PowerShell 语法，路径为 Windows 反斜杠格式。

### 规则 6：PowerShell 生成的 JSON 文件默认带 UTF-8 BOM，必须用 Node.js 写入

`Set-Content -Encoding UTF8` 在 Windows PowerShell 中会在文件头写入 BOM（`\uFEFF`），此后 `JSON.parse()` 会失败。同理 `Out-File`、`Add-Content` 也带此行为。PowerShell Core（pwsh）的 `-Encoding UTF8NoBOM` 可以避免，但不是所有 Windows 都默认安装了 Core。

> **约束**：在 Windows 上生成 JSON 文件时，优先使用 Node.js 的 `fs.writeFileSync()`，它写入的是纯 UTF-8 无 BOM。如果必须用 PowerShell 写入 JSON，用 `[System.IO.File]::WriteAllText($path, $json)` 或 pwsh 的 `-Encoding UTF8NoBOM`。读取 JSON 时先 strip BOM：`.replace(/^\uFEFF/, '')`。

### 规则 7：Slash 命令是 Claude Code 专属功能，Codex 不支持

Claude Code 通过 `plugin.json` 的 `"commands"` 字段读取 `commands/` 下的 `.toml`/`.md` 文件，自动注册为 `/ship`、`/build`、`/test` 等 slash 命令。Codex 的 plugin.json schema **根本没有 `commands` 字段**——Codex 只认 `skills`、`hooks`、`mcpServers` 三种能力入口。

> **约束**：安装第三方插件时，如果发现 `commands/` 目录下有 `.toml` 或 `.md` 文件，不要尝试在 Codex plugin.json 中添加 `"commands"` 字段——Codex 会直接忽略。适配方案：为每个 command 创建 alias skill（极简 SKILL.md 只做路由转发）。不要在 Codex 上浪费时间去适配 Claude Code 专属特性。

### 规则 8：Codex 从缓存加载插件的所有能力，不从 marketplace 源目录加载

`codex plugin add` 将插件复制到 `~\.codex\plugins\cache\<marketplace>\<name>\<version>\`。**所有能力（skills、hooks、MCP）都从缓存加载，不从 marketplace 源目录加载。** 这意味着：
1. 修改 marketplace 源目录的文件不会自动生效——Codex 不会重新扫描源目录
2. 安装后新增/修改 skill 文件时，必须**同步到缓存目录**（`codex plugin list --json` 查看实际路径），否则 Codex 看不到
3. `codex plugin list --json` 返回的 `source.path` 可能指向 marketplace 源目录而非缓存，不要被它误导

> **约束**：
> - 新增 skill 文件后，必须同时复制到 marketplace 源目录（下次重装用）和缓存目录（当前运行用）
> - hooks 中的路径引用也以缓存目录下的实际路径为准
> - 要触发 Codex 重新读取 skill 列表：直接往缓存版本号目录新增 skill 文件即可，无需重装插件

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

通过 codex CLI 卸载（推荐）：

```powershell
codex plugin remove ponytaill@code-skill-hook
codex plugin remove agent-skills@code-skill-hook
codex plugin marketplace remove code-skill-hook
```

然后清理残留文件：
```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.codex\.tmp\marketplaces\.staging\marketplace-add-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.codex\local-marketplaces\code-skill-hook" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.codex\plugins\cache\code-skill-hook" -ErrorAction SilentlyContinue
```

如果采用了直接修改 `config.toml` 的方式，还需手动清理：
- 移除 `[marketplaces."code-skill-hook"]` 段
- 移除 `[plugins."ponytail@code-skill-hook"]` 段
- 移除 `[plugins."agent-skills@code-skill-hook"]` 段

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
| Git Bash | addy-agent-skills bash 脚本（仅 Linux/Mac） | `winget install Git.Git` |
| jq | SDD 缓存 hook JSON 解析（仅 Linux/Mac） | `winget install jqlang.jq` |
| curl | SDD 缓存 hook HTTP 请求 | Git Bash 自带 |

> **Windows 用户注意**：addy-agent-skills 的 hooks 和 SDD 缓存脚本是 bash 写的，在 Windows 上需要 WSL/Git Bash 或手动改写为 PowerShell/Node.js。如不需要 session-start.sh 和 SDD 缓存功能，可仅使用其 24 个 skills（通过 CLAUDE.md 注入即可）。

---

## 验证

启动 Claude Code 或 Codex 后运行：

| 命令 | 效果 |
|------|------|
| `/addy-agent-skills:using-agent-skills` | 显示 24 个技能发现元技能 |
| `/ponytail:ponytail-help` | 显示 Ponytail 参考卡片 |
