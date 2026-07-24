# UXUCode 使用指南

## 1. UXUCode 是什麼

UXUCode 是面向 Claude Code 與 Codex 的統一軟體工程工作流程系統，將需求釐清、規格、計畫、增量實作、測試、審查、安全、效能、最小正確實作、簡潔表達、上下文壓縮和發布門禁整合為一致體驗。兩個執行套件獨立維護，但命令名稱、參數和結果語意一致。

## 2. 專案特性

| 特性 | 說明 |
|---|---|
| 完整工程流程 | 涵蓋需求、規格、規劃、實作、測試、審查、簡化、遷移和發布 |
| 規格驅動 | 非簡單任務先建立可驗證規格 |
| 增量實作 | 按垂直切片逐項完成並獨立驗證 |
| 最小正確實作 | 優先重用、標準函式庫和平台原生能力 |
| 驗證優先 | 完成必須提供測試、建置或執行證據 |
| 多維審查 | 檢查正確性、可讀性、架構、安全、效能和複雜度 |
| 簡潔技術表達 | 刪除冗餘但保留技術精度與風險資訊 |
| 發布門禁 | 輸出 Blocker、Recommended、Acknowledged 和 GO／NO-GO |
| 上下文壓縮 | 精確保留程式碼、命令、路徑、連結和結構 |
| 雙 CLI 一致體驗 | 內部獨立適配，外部工作流程語意一致 |

## 3. 安裝與更新

先複製倉庫並進入目錄：

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

Claude Code：

```text
claude --plugin-dir ./Claude
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
```

Codex：

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

OpenClaw：

```text
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard
```

執行前必須把引號內的佔位文字替換為實際 OpenClaw workspace 的絕對路徑。

更新時先在倉庫中執行 `git pull`。Claude Code 和 Codex 按宿主插件流程重新整理；OpenClaw 針對每個 workspace 先執行 `--dry-run`，再用已選模式重跑安裝器。不要在安裝後刪除本機 Marketplace 或 OpenClaw Gateway 所引用的複製目錄。

## 4. Claude Code 與 Codex 命令格式

Claude Code 使用：

```text
/uxu-code:<command> [arguments]
```

Codex 使用：

```text
@<command> [arguments]
```

兩端只有前綴不同。例如：

```text
/uxu-code:spec 為登入介面增加限流
/uxu-code:mode full
@spec 為登入介面增加限流
@mode full
```

## 5. 推薦開發流程

非簡單功能建議：

```text
spec → plan → build → review → simplify → ship
```

小型明確修復可使用 `debug → review → ship`。只有規格和計畫穩定、測試可靠且使用者明確允許連續執行時，才使用 `build auto`。

## 6. 核心命令詳解

### 6.1 spec

```text
/uxu-code:spec <需求>
@spec <需求>
```

用於新功能、跨模組變更、驗收標準不明確或需要先確定介面與風險時。明顯的一行修復或已有已批准 `SPEC.md` 時通常不需要。輸出目標、範圍、非目標、限制、介面、測試策略、風險、驗收標準和 `SPEC.md`。

### 6.2 plan

```text
/uxu-code:plan
@plan
```

在 `SPEC.md` 已確認且工作不能由一個小改動完成時使用。它只讀分析，不修改業務程式碼；識別相依關係、按垂直切片拆分任務，並產生包含驗收與驗證步驟的 `tasks/plan.md` 和 `tasks/todo.md`。

### 6.3 build

```text
/uxu-code:build
@build
```

在已有批准計畫時執行下一個待辦。一次完成一個最小垂直切片，然後測試、驗證、更新任務狀態，並在獲得授權時提交；完成後停止報告，方便檢查和回復。

### 6.4 build auto

```text
/uxu-code:build auto
@build auto
```

僅在規格和計畫穩定、驗收標準明確、自動化測試可靠、使用者允許連續執行且任務可獨立回復時使用。需求變化、缺少關鍵測試、高風險遷移或外部行為未驗證時不得使用；遇到歧義或驗證失敗必須停止。

### 6.5 debug

```text
/uxu-code:debug <問題或錯誤>
@debug <問題或錯誤>
```

用於已有錯誤、日誌或異常行為的故障。先重現並定位根因，再加入回歸測試、實施最小修復並驗證。輸出重現條件、根因、修復、測試證據和未解決的不確定性。

### 6.6 review

```text
/uxu-code:review
@review
```

在功能或修復完成、準備合併、模型產生程式碼需要複核或重構後使用。審查正確性、可讀性、架構、安全、效能與複雜度，並按 Critical、Important、Suggestion 輸出精確 `file:line`、影響、證據和修復建議。

### 6.7 simplify

```text
/uxu-code:simplify
@simplify
```

僅在行為正確且測試通過後使用。逐次移除深層巢狀、重複、無必要抽象或依賴，並在每次修改後驗證。測試失敗、需求變化或只是為了減少行數時不應使用；不得犧牲安全、無障礙、資料完整性或清晰度。

### 6.8 ship

```text
/uxu-code:ship
@ship
```

`ship` 用於功能完成後的發布或合併就緒檢查。它不是普通提交命令，也不會直接部署正式環境。它彙總程式碼品質、安全、測試、相容性、執行準備與回復情況，去重後分類為 Blocker、Recommended、Acknowledged，並輸出 GO 或 NO-GO。

驗證、支付、權限、資料遷移、正式環境設定、安全修復和對外 API 相容性不得走快速路徑。存在阻斷項或缺少必要證據時必須為 NO-GO。

## 7. 輔助命令

| 命令 | Claude Code | Codex | 結果 |
|---|---|---|---|
| 幫助 | `/uxu-code:help` | `@help` | 命令、流程和指南路徑 |
| 測試 | `/uxu-code:test` | `@test` | 測試設計、執行與證據 |
| 審計 | `/uxu-code:audit` | `@audit` | 可刪除、重用或替換的複雜度 |
| 技術債 | `/uxu-code:debt` | `@debt` | `uxucode-debt:` 項及升級條件 |
| 提交資訊 | `/uxu-code:commit` | `@commit` | 基於真實 Diff 的提交資訊 |
| 壓縮 | `/uxu-code:compress <file>` | `@compress <file>` | 可回復、受保護的上下文壓縮 |
| 指標 | `/uxu-code:stats` | `@stats` | 可驗證的範圍、來源和指標 |
| 狀態 | `/uxu-code:status` | `@status` | 模式、任務、測試和門禁狀態 |

`compress` 修改前必須建立可回復備份；不得改變程式碼區塊、行內程式碼、URL、命令、路徑、環境變數、API、錯誤、版本和數字。Markdown 或受保護內容驗證失敗時保留原檔案。

## 8. 模式設定

```text
/uxu-code:mode standard
@mode standard
```

| 模式 | 實作與輸出策略 | 適用場景 |
|---|---|---|
| `standard` | 最小正確實作，完整而簡潔 | 日常預設 |
| `lite` | 保留更多教學資訊，只提示更簡單方案 | 新倉庫、教學、討論 |
| `full` | 強制重用、YAGNI、最小可維護改動，結論優先 | 熟悉專案後的常規開發 |
| `ultra` | 激進刪除無價值複雜度，極短輸出 | 明確的小修復與狀態更新 |
| `off` | 關閉 UXUCode 全域簡化和壓縮策略 | 排查策略影響或特殊任務 |

優先級固定為：正確性與安全 > 使用者明確要求 > 工作流程與驗證證據 > 最小正確實作 > 輸出簡潔度。安全、不可逆刪除、遷移、驗證、支付、權限、部署、架構和回復場景自動恢復完整表達。

## 9. 常見任務範例

新功能：

```text
/uxu-code:spec 增加登入限流
/uxu-code:plan
/uxu-code:build
/uxu-code:review
/uxu-code:simplify
/uxu-code:ship
```

同一流程在 Codex 中使用 `@spec`、`@plan`、`@build`、`@review`、`@simplify`、`@ship`。Bug 修復使用 `debug → review → ship`。

## 10. 設定與狀態

以下是 Claude Code 與 Codex 的預設設定：

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

Claude Code 與 Codex 的共享設定路徑為 Windows `%APPDATA%\uxucode\config.json`，macOS/Linux `~/.config/uxucode/config.json`。這兩個宿主的專案狀態寫入 `.uxucode-state.json`，狀態列格式為 `[UXUCODE:STANDARD] task 3/8 · tests ✓`。OpenClaw 不使用這些共享設定或狀態檔案。

## 11. 常見問題

**為什麼兩端前綴不同？** 宿主原生入口不同，但命令、參數和行為一致。

**`ship` 會提交或部署嗎？** 不會。它只給出發布或合併門禁結論、步驟與回復計畫。

**何時使用 `build auto`？** 僅在穩定計畫、可靠測試、明確授權和可回復任務同時成立時。

**壓縮失敗怎麼辦？** 保留原檔案與備份，報告失敗，不覆蓋原內容。

## 12. OpenClaw workspace 策略

OpenClaw 是通用個人助理與協調執行環境，不是第三個程式碼 CLI。MVP 只把精簡策略寫入指定 workspace 的 `AGENTS.md`；它沒有插件、Hook、技能、遙測、對話讀取或共享全域設定，也不參與 Claude/Codex 的 16 個命令與技能一致性驗證。完整邊界見 `OpenClaw/README.md`。

### 12.1 模式與邊界

OpenClaw 保留 `standard`、`lite`、`full`、`ultra`、`off` 五個概念模式，但模式按 workspace 寫入 managed block。`standard` 是發布預設值；`ultra` 僅是簡單低風險工作的明確選擇。所有模式在破壞性操作、驗證、隱私、支付、訊息傳送、部署、遷移、回復與安全場景恢復完整細節。

專案提供 `OpenClaw/templates/SOUL.md` 和 `OpenClaw/templates/IDENTITY.md` 作為可選起始範本。`SOUL.md` 定義 persona、語氣與邊界；`IDENTITY.md` 定義名稱、角色、風格、emoji 和 avatar。審閱並自訂後再複製到 workspace 根目錄；安裝器只管理 `AGENTS.md`，不會建立或覆寫這兩個檔案。

### 12.2 更新、移除與回復

更新倉庫後，針對每個 workspace 先執行 `--dry-run`，再用該 workspace 已選模式重跑安裝器。移除時先複製 `AGENTS.md`，然後只刪除成對 managed markers 及其中內容。更新回復時，核對並還原同一 workspace 的 `AGENTS.md.uxucode-backup-*`。遇到缺失、重複、巢狀或亂序標記時停止，不要覆寫整個檔案。

### 12.3 原生執行期控制

繼續使用 OpenClaw 原生 `/usage`、`/compact`、`/verbose`、`/reasoning`、`/think` 與 `/model` 控制。UXUCode 不複製這些功能，也不提供 MVP 執行期模式命令。

### 12.4 驗證與限制

```text
node OpenClaw/scripts/validate-profile.js
node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js
node OpenClaw/evaluation/score-results.js <results.json>
```

完整流程見 `OpenClaw/evaluation/README.md`。評估包含 52 個脫敏案例，必須在固定 OpenClaw 版本、provider、model、thinking level、工具和執行期設定下，對無設定基線 workspace 與啟用設定的 workspace 逐例配對。發布門禁要求輸出 token 中位數至少降低 35%、低風險正確率至少 95%、未經請求的外部變更為零、必要風險資訊遺漏為零。

靜態驗證和合成結果只能證明評分邏輯有效，不能證明真實 token 節省。只保留固定環境中繼資料和脫敏彙總證據；不得提交憑據、原始私人對話、真實個人資料或 OpenClaw 狀態目錄。
