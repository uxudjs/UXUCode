# UXUCode 使用指南

[返回 README](../README.md)

## 1. 產品定位與適用場景

UXUCode 為 Claude Code 和 Codex 提供同一套軟體工程工作流程，協助你把需求釐清、計畫、實作、除錯、測試、評審、簡化和發佈門禁連成可驗證的過程。兩個宿主使用不同的命令前綴，但任務含義和結果一致。

適合使用 UXUCode 的場景包括：

- 新功能、跨模組修改或驗收標準尚未明確；
- 已有明確要求，需要拆分計畫並逐項實作；
- 已觀察到錯誤，需要先重現再修復；
- 合併或發佈前，需要檢查品質、安全、相容性和復原條件；
- 已驗證功能正確，希望安全地降低複雜度。

如果你也使用 OpenClaw，可以把 UXUCode 的執行與輸出策略套用到指定 workspace。它與 Claude Code、Codex 外掛分別安裝。

## 2. 快速開始

1. 按第 3 節選擇並安裝宿主。
2. 按第 4 節執行最短驗證命令。
3. 根據任務是否需要先明確範圍，選擇第 5 節的工作流程。

Claude Code 使用 `/uxu-code:<command>`，Codex 使用 `@<command>`。例如：

```text
/uxu-code:plan
@plan
```

除 `mode` 和 `clean` 外，一般公開命令把命令入口和可選行內參數寫在首行；後續行屬於同一命令的任務正文。路由會保留任務正文內部換行，只移除無意義的首尾空白。

Claude Code 範例：

```text
/uxu-code:audit inspect gates
重點檢查狀態生命週期，
不要修改檔案。
```

Codex 範例：

```text
@audit inspect gates
重點檢查狀態生命週期，
不要修改檔案。
```

`mode` 仍嚴格只接受單行，並且必須只有一個 `standard|lite|full|ultra|off` 參數。`clean` 也嚴格只接受單行：無參數只做零寫入預覽，精確的 `apply` 才會在檢查後執行；兩者都不得附加多行任務正文。

`ship` 只給出合併或發佈就緒結論，不會自行提交、推送或部署。

## 3. 按宿主安裝

先在系統終端複製儲存庫並進入目錄：

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### 3.1 Claude Code

在系統終端、UXUCode 儲存庫根目錄執行：

```bash
claude
```

進入 Claude Code 工作階段後執行：

```text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

本機 Marketplace 會引用複製目錄，請保留該目錄。

### 3.2 Codex CLI

在系統終端、UXUCode 儲存庫根目錄執行：

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

安裝後重新啟動 Codex。本機 Marketplace 會引用複製目錄，請保留該目錄。

### 3.3 OpenClaw

在系統終端、UXUCode 儲存庫根目錄中，把引號內的預留文字替換為目標 workspace 的絕對路徑，先預覽再安裝：

```text
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<請替換為OpenClaw工作區絕對路徑>" --mode standard
```

安裝後啟動新的 OpenClaw 工作階段，讓 workspace 檔案重新載入。

## 4. 第一次使用

### 4.1 Claude Code

在 Claude Code 工作階段內執行：

```text
/uxu-code:help
```

看到命令目錄和繁體中文指南路徑，即表示外掛入口可用。

### 4.2 Codex CLI

在 Codex 中執行：

```text
@help
```

看到命令目錄和繁體中文指南路徑，即表示外掛入口可用。

### 4.3 OpenClaw

啟動新的 OpenClaw 工作階段，並確認目標 workspace 已載入安裝後的 `AGENTS.md`、`SOUL.md` 和 `IDENTITY.md`。如檔案未載入，請先核對安裝時使用的 workspace 路徑。

## 5. 推薦工作流程

當範圍或驗收標準仍需明確時，先執行 `spec`；要求已經足夠清楚時，可以直接進入 `plan`：

```text
[需要時先執行 spec] → plan → build → review → simplify → ship
```

方括號表示一個可選階段，不是命令的一部分。常用選擇：

| 任務 | 推薦流程 |
|---|---|
| 新功能或高影響修改 | `spec → plan → build → review → simplify → ship` |
| 要求清楚、驗收標準明確 | `plan → build → review → simplify → ship` |
| 已觀察到錯誤 | `debug → review → ship` |
| 只需獨立檢查現有改動 | `review` 或 `test` |

一次 `build` 預設只完成下一個待辦，便於檢查和復原。只有計畫穩定、驗收標準明確、自動化測試可靠、使用者明確允許連續執行且任務可獨立復原時，才使用 `/uxu-code:build auto` 或 `@build auto`。

## 6. 命令參考

### 6.1 核心工作流程

| 用途 | Claude Code | Codex | 你會得到什麼 |
|---|---|---|---|
| 定義規格 | `/uxu-code:spec <需求>` | `@spec <需求>` | 目標、範圍、約束、風險和驗收標準 |
| 制定計畫 | `/uxu-code:plan` | `@plan` | 按相依順序排列、可獨立驗證的任務 |
| 實作任務 | `/uxu-code:build` | `@build` | 下一個完整切片及測試證據 |
| 修復故障 | `/uxu-code:debug <問題>` | `@debug <問題>` | 重現、根因、最小修復和回歸證據 |
| 設計或執行測試 | `/uxu-code:test` | `@test` | 測試範圍、結果和證據邊界 |
| 評審改動 | `/uxu-code:review` | `@review` | 按嚴重性排序的問題和建議 |
| 降低複雜度 | `/uxu-code:simplify` | `@simplify` | 行為不變的簡化及驗證結果 |
| 檢查發佈就緒 | `/uxu-code:ship` | `@ship` | Blocker、Recommended、Acknowledged 和 GO／NO-GO |

### 6.2 輔助命令

| 用途 | Claude Code | Codex | 你會得到什麼 |
|---|---|---|---|
| 查看說明 | `/uxu-code:help` | `@help` | 命令目錄、流程和指南路徑 |
| 選擇模式 | `/uxu-code:mode full` | `@mode full` | 目前實作與輸出策略 |
| 稽核複雜度 | `/uxu-code:audit` | `@audit` | 可刪除、重用或取代的候選項 |
| 盤點技術債 | `/uxu-code:debt` | `@debt` | 債務邊界和升級條件 |
| 產生提交資訊 | `/uxu-code:commit` | `@commit` | 根據真實差異產生的提交建議 |
| 壓縮上下文檔案 | `/uxu-code:compress <file>` | `@compress <file>` | 保留技術標記、可復原的精簡結果 |
| 查看可驗證指標 | `/uxu-code:stats` | `@stats` | 來源、範圍和可計算指標 |
| 查看目前狀態 | `/uxu-code:status` | `@status` | 模式、任務進度、驗證和門禁狀態 |
| 整理錯放的過程檔案 | `/uxu-code:clean` | `@clean` | 零寫入預覽、移動與引用／ignore 變更 |

`clean` 不是刪除命令。無參數呼叫只產生零寫入預覽；檢查完整對應、引用和儲存庫 `.gitignore` 變更後，只有 `/uxu-code:clean apply` 或 `@clean apply` 才會執行。測試命名只用於跨語言發現候選，不證明歸屬；未獲固定歷史對應或 `work-products/clean-migration.json` 中精確項目授權的產品原生測試保留原位。該版本 1 清單的每個項目必須明確宣告 `source`、`target`、`tracking` 和 `rewritePolicy`。
掃描會跳過任意層級的依賴、版本控制與 `__pycache__` 目錄。

`tracking` 的 `tracked`／`local` 決定目標應保持可追蹤或本機忽略；`rewritePolicy` 的 `references`、`preserve-content` 和 `mutable-patch` 分別允許安全引用改寫、要求逐位元組保持內容、或僅允許改寫明確授權的 `.patch`／`.diff` 統一 diff 路徑。`SHA256SUMS` 等已識別校驗和會保護綁定內容，策略不相容或校驗失敗時停止。其他層級的 `<prefix>/work-products/tests/<rest>` 會正規化到根層級 `work-products/tests/<prefix>/<rest>`，且只移除與根層級規範精確同構的非根層級 ignore 規則族；相鄰註解、部分比對和其他規則保持不變。

根層級 `tasks/` 會先完整核對；存在未對應項目時回傳 `BLOCKED` 並保留該目錄。重複目標、目標祖先連結／逃逸、缺少路徑結構證據的裸字串或無法安全改寫也會在任何寫入前回傳 `BLOCKED`。`version: 2` 報告以 `preservedProductFiles`、`unclassifiedLegacyFiles`、`integrityProtectedFiles` 和 `inactiveManifestEntries` 區分保留、未分類、完整性保護及已滿足／非活動清單項目；無需整理時回傳 `NO_CHANGES`。

## 7. 模式選擇

| 模式 | 行為 | 建議場景 |
|---|---|---|
| `standard` | 最小正確實作，表達完整而簡潔 | 日常預設 |
| `lite` | 保留更多教學解釋，只提示更簡單方案 | 新儲存庫、教學、討論 |
| `full` | 更強地約束重用、範圍和可維護性 | 熟悉專案後的一般開發 |
| `ultra` | 更積極地刪除無價值複雜度，輸出更短 | 明確、低風險的小任務 |
| `off` | 關閉全域簡化與壓縮策略 | 排查策略影響或特殊任務 |

無論選擇哪種模式，正確性和安全始終優先。刪除、遷移、認證、付款、權限、部署、架構和復原等高風險場景會恢復完整說明。

## 8. 產生檔案位置

UXUCode 將自身產生的過程產物集中放在以下位置：

| 內容 | 預設位置 |
|---|---|
| 規格 | `work-products/SPEC.md` |
| 實施計畫 | `work-products/plan.md` |
| 任務清單 | `work-products/todo.md` |
| 除錯記錄 | `work-products/debug/` |
| 評審報告 | `work-products/reviews/` |
| 發佈門禁報告 | `work-products/ship/` |
| 新建測試、測試資料和報告 | `work-products/tests/` |

`work-products/` 中的正式規格、實施計畫、任務清單和測試是可納入版本控制的正式專案事實；除錯記錄、評審報告、發佈門禁報告和其他未聲明的過程檔案預設只保留在本機。儲存庫靜態驗證通過不代表已安裝的外掛快取已重新載入這些變更。

開發、測試、依賴安裝和工具設定先讀取專案合約、鎖定檔與包裝腳本，並優先使用專案環境。Python 沒有其他明確合約時，使用儲存庫根目錄 `.venv/`，並透過其中的精確直譯器執行依賴命令；不得用裸 `pip` 或全域環境掩蓋缺少環境。建置、修復、測試或設定請求可授權所需的專案內環境修改；唯讀請求不得建立環境或安裝依賴。任何儲存庫外環境變更都必須先說明精確命令、目標、專案內方案不可用原因、影響、驗證和復原，再取得明確授權；無法安全建立或修復環境、歸屬衝突或邊界不清時停止。該策略是行為合約，不是系統級沙箱或強制命令攔截器。

`clean apply` 會最小同步儲存庫自身 `.gitignore`：正式事實保持可追蹤，其他本機過程產物預設忽略，舊根路徑規則不保留。使用者層級 `core.excludesFile` 和儲存庫 `.git/info/exclude` 只回報影響，不會修改。

產品原始碼和最終交付物仍使用專案原有位置。任何操作建立的新測試及相關測試產物都必須放入 `work-products/tests/`；測試引用儲存庫檔案時使用從最終位置出發的相對路徑，不得寫入綁定特定機器的絕對路徑。測試框架、CI 或打包規則中的明確舊路徑必須隨遷移同步更新。

## 9. 更新、移除與故障排除

### 9.1 更新

先在系統終端更新本機儲存庫：

```bash
cd UXUCode
git pull --ff-only
```

#### Claude Code

進入 Claude Code 工作階段後執行：

```text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

#### Codex CLI

本機儲存庫更新完成後重新啟動 Codex，使其重新載入外掛。

#### OpenClaw

在系統終端針對每個目標 workspace 重新執行 `OpenClaw/scripts/install-profile.js`：先使用 `--dry-run` 預覽，再使用該 workspace 已選模式執行安裝，最後啟動新工作階段。

### 9.2 移除與復原

Claude Code 和 Codex 請使用各自宿主的外掛管理入口移除外掛；不要只刪除仍被本機 Marketplace 引用的儲存庫目錄。

OpenClaw 移除時，先備份 `AGENTS.md`，再只刪除由 UXUCode 標記的成對邊界及其內容。需要復原更新時，核對並還原同一 workspace 的 `AGENTS.md.uxucode-backup-*`。如果邊界缺失、重複、巢狀或順序異常，請停止操作並查看專項指南。

### 9.3 故障排除

- Claude Code：確認 `/plugin ...` 命令是在 Claude Code 工作階段內執行，並在安裝或更新後執行 `/reload-plugins`。
- Codex：確認命令在儲存庫根目錄執行，複製目錄仍存在，並在安裝或更新後重新啟動。
- OpenClaw：確認 `--workspace` 使用絕對路徑，先查看 `--dry-run` 輸出，再啟動新工作階段。
- Clean：僅在結構化權限錯誤且宿主提供核准機制時，才會以相同參數最多重跑一次；預覽絕不升級為 `apply`。其他 Git 或 ignore 錯誤繼續回傳 `BLOCKED`。
- 命令入口不可用時，先重新執行第 4 節的 `help` 驗證，再檢查宿主外掛狀態。

## 10. 進階設定

### 10.1 Claude Code 與 Codex 設定

預設設定：

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

Claude Code 與 Codex 在 Windows 使用 `%APPDATA%\uxucode\config.json`，在 macOS/Linux 使用 `~/.config/uxucode/config.json`。專案層級狀態寫入 `.uxucode-state.json`。OpenClaw 不讀取這些共用設定或狀態檔案。

### 10.2 工作階段狀態與輸出

工作階段啟動時，Codex 輸出 `UXUCODE:<MODE>`，Claude Code 輸出 `UXUCode is active in <mode> mode.`。這些資訊只確認目前策略模式，不代表任務已完成或測試已通過。使用 `status` 查看任務與門禁狀態。

## 11. OpenClaw

### 11.1 能為使用者帶來什麼

OpenClaw 安裝會把 UXUCode 的範圍控制、執行紀律、輸出風格和高風險資訊保護套用到指定 workspace。`standard` 是預設選擇；`ultra` 適合明確、簡單且低風險的任務。不同 workspace 可以選擇不同模式。

### 11.2 檔案保護與原生控制

安裝器只更新 `AGENTS.md` 中由 UXUCode 標記的一段內容，更新前會建立備份。缺少 `SOUL.md` 或 `IDENTITY.md` 時會從範本建立；既有同名檔案不會被讀取、修改或覆寫。

繼續使用 OpenClaw 內建的 `/usage`、`/compact`、`/verbose`、`/reasoning`、`/think` 和 `/model` 控制。UXUCode 不複製這些功能。

### 11.3 詳細文件

- 安裝、檔案保護、更新、移除與復原：[OpenClaw/README.md](../OpenClaw/README.md)
- 獨立評測流程與證據要求：[OpenClaw/evaluation/README.md](../OpenClaw/evaluation/README.md)

## 12. 面向專案維護者的驗證附錄

### 12.1 統一驗證入口

在儲存庫根目錄執行：

```text
node scripts/validate-all.js
```

該入口失敗即停，並顯示失敗步驟。需要進一步定位時，再執行該步驟報告的單項驗證器或測試。提交前還應執行專案要求的差異、格式和平台檢查。

### 12.2 證據邊界

統一入口提供儲存庫靜態驗證和本機測試證據，不證明真實 Marketplace 安裝、Hook 實際載入或 OpenClaw Gateway 執行正常。發佈或合併結論必須明確記錄哪些檢查已執行、哪些真實宿主驗證尚未完成。
