# Ponytail — Lazy Senior Developer Mode

強制使用最簡單、最短、最能工作的方案。YAGNI 優先，標準庫優先，能不寫就不寫。

## 技能列表 (6個)

| 技能 | 命令 | 說明 |
|------|------|------|
| ponytail | `/ponytail [lite\|full\|ultra\|off]` | 懶惰模式本身，支持強度分級 |
| ponytail-review | `/ponytail-review` | 過度工程審查，找出可刪除的代碼 |
| ponytail-audit | `/ponytail-audit` | 全倉庫過度工程審計 |
| ponytail-debt | `/ponytail-debt` | 收集所有 ponytail: 快捷方式標記 |
| ponytail-gain | `/ponytail-gain` | 顯示實測影響記分板 |
| ponytail-help | `/ponytail-help` | 快速參考卡片 |

## 強度級別

| 級別 | 行為 |
|------|------|
| **lite** | 按要求構建，附一行更懶的替代方案 |
| **full** | 階梯強制執行：YAGNI → stdlib → native → 一行 → 最小（默認） |
| **ultra** | YAGNI 極端主義，刪除優先，挑戰需求本身 |

## Hook 系統

### SessionStart (ponytail-activate.js)
自動激活 ponytail 模式，注入規則到會話上下文。

### SubagentStart (ponytail-subagent.js)
將 ponytail 規則注入子代理。

### UserPromptSubmit (ponytail-mode-tracker.js)
監控 `/ponytail` 命令切換模式。

## 配置

### 環境變量
- `PONYTAIL_DEFAULT_MODE` — 默認模式（off/lite/full/ultra），優先級最高
- `PONYTAIL_QUIET_STARTUP=1` — 靜默啟動
- `PONYTAIL_HIDE_STATUS=1` — 隱藏狀態欄指示器
- `PONYTAIL_SUBAGENT_MATCHER` — 子代理匹配正則

### 配置文件
`~/.config/ponytail/config.json`（Windows: `%APPDATA%\ponytail\config.json`）:
```json
{ "defaultMode": "full" }
```

## 依賴

- **Node.js 22+**（Hook 腳本必需）
- 狀態欄功能需要終端支持 ANSI 顏色
