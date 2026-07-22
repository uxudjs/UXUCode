# UXUCode 使用指南

UXUCode v3.0.0

<!-- section:1 -->
## 1. UXUCode 是什麼

UXUCode 是面向 Claude Code 與 Codex 的統一軟體工程工作流系統。它整合需求釐清、規格、計畫、增量實作、測試、審查、最小正確實作、簡潔技術表達、上下文壓縮與發布門禁。兩端內部獨立，命令名稱、參數、行為和輸出語意一致。

<!-- section:2 -->
## 2. 專案特性

| 特性 | 說明 |
|---|---|
| 完整工程流程 | 涵蓋需求、規格、規劃、實作、測試、審查、簡化、遷移和發布 |
| 規格驅動 | 非簡單任務先建立可驗證規格 |
| 增量實作 | 按垂直切片完成，每個任務獨立驗證 |
| 最小正確實作 | 優先重用現有程式碼、標準函式庫和平台能力 |
| 驗證優先 | 完成必須提供測試、建置或執行證據 |
| 多維審查 | 檢查正確性、可讀性、架構、安全、效能和複雜度 |
| 簡潔表達 | 刪除重複內容，同時保留必要技術資訊 |
| 發布門禁 | 輸出 Blocker、Recommended、Acknowledged 和 GO／NO-GO |
| 上下文壓縮 | 精確保留程式碼、命令、路徑、連結與結構 |
| 雙 CLI 一致 | 兩端適配獨立，命令與工作流語意一致 |

<!-- section:3 -->
## 3. 安裝與更新

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

Claude Code 暫時載入：`claude --plugin-dir ./Claude`。持久安裝時在 Claude Code 中執行 `/plugin marketplace add ./Claude` 和 `/plugin install uxu-code@uxu-code-claude`。

Codex 執行 `codex plugin marketplace add ./Codex` 和 `codex plugin add uxu-code@uxu-code-codex`。更新時執行 `git pull` 並重新整理宿主外掛。兩端可獨立安裝，不使用符號連結或跨目錄執行階段引用。

<!-- section:4 -->
## 4. Claude Code 與 Codex 命令格式

| 宿主 | 正式格式 | 範例 |
|---|---|---|
| Claude Code | `/uxu-code:<command> [arguments]` | `/uxu-code:spec 增加登入限流` |
| Codex | `@<command> [arguments]` | `@spec 增加登入限流` |

兩端只在宿主前綴上不同。不要把一般提示文字當作正式命令入口。

<!-- section:5 -->
## 5. 建議開發流程

新功能：`spec → plan → build → review → simplify → ship`。穩定且已核准的計畫可使用 `build auto`。故障修復：`debug → review → ship`。

`build` 每次只執行一個任務；`build auto` 只有在規格穩定、驗收標準明確、自動化測試可靠且使用者明確授權時才連續執行。

<!-- section:6 -->
## 6. 核心命令詳解

| 命令 | 適合使用 | 不適合使用 | 結果 |
|---|---|---|---|
| `spec` | 新功能、跨模組變更、驗收標準不清 | 一行修復或已有已核准規格 | 產生並確認 SPEC.md |
| `plan` | 規格已核准且任務存在相依性 | 簡單單點修改 | 產生 tasks/plan.md 與 tasks/todo.md，不改業務程式碼 |
| `build` | 執行已核准計畫的下一項 | 沒有穩定規格或計畫 | 實作一個垂直切片並驗證後停止 |
| `build auto` | 穩定計畫、可靠測試、已授權連續執行 | 高風險遷移、需求變化或關鍵測試缺失 | 逐項執行計畫，遇到阻斷立即停止 |
| `debug` | 已有錯誤、日誌或異常行為 | 沒有證據的猜測性最佳化 | 輸出重現、根因、最小修復與回歸驗證 |
| `test` | 設計、補齊或執行測試 | 用未執行的檢查聲稱通過 | 輸出命令、通過、失敗、略過與未驗證項 |
| `review` | 實作完成、PR 前或重構後 | 取代實際測試 | 按 Critical／Important／Suggestion 輸出六維發現 |
| `simplify` | 行為已驗證且測試通過 | 行為未確認或測試失敗 | 在行為不變下逐步降低複雜度 |
| `ship` | 合併、打版本或發布前 | 開發剛開始、只想提交或仍有大量 TODO | 輸出 GO／NO-GO、發布步驟與回滾計畫 |

ship 用於功能完成後的發布或合併就緒檢查。它不是一般提交命令，也不會直接部署正式環境。它彙總程式碼品質、安全、測試和回滾準備情況，並輸出 GO 或 NO-GO。認證、支付、權限、資料遷移、正式環境設定、安全修復和公開 API 相容性不得跳過完整門禁。

<!-- section:7 -->
## 7. 輔助命令

| 命令 | 用途 |
|---|---|
| `help` | 顯示命令與目前語言指南路徑 |
| `mode <level>` | 同時設定實作與輸出策略 |
| `audit` | 唯讀掃描可刪除、重用或替換的複雜度 |
| `debt` | 彙總帶上限與升級條件的 uxucode-debt: 標記 |
| `commit` | 根據已驗證 Diff 產生提交訊息，不自動提交或推送 |
| `compress <file>` | 備份並安全壓縮說明性檔案；驗證失敗不覆蓋原檔 |
| `stats` | 顯示可重現、已驗證的指標 |
| `status` | 顯示模式、任務、測試和門禁狀態 |

<!-- section:8 -->
## 8. 模式設定

| 模式 | 實作策略 | 輸出策略 | 場景 |
|---|---|---|---|
| `standard` | 預設最小正確實作 | 完整句子，刪除明顯冗餘 | 日常任務，預設 |
| `lite` | 提示簡單方案，不改指定結構 | 保留更多解釋 | 新倉庫、教學、討論 |
| `full` | 強制重用、YAGNI、最小維護改動 | 結論優先、緊湊 | 熟悉專案後的開發 |
| `ultra` | 積極刪除無價值複雜度 | 極短輸出 | 明確的低風險小修復 |
| `off` | 關閉全域簡化策略 | 宿主一般輸出 | 排查模式影響 |

優先級固定為：正確性與安全 > 使用者明確要求 > 工作流和驗證證據 > 最小正確實作 > 輸出簡潔度。安全、不可逆刪除、遷移、認證、支付、權限、部署、架構和回滾會自動恢復完整表達。

<!-- section:9 -->
## 9. 常見任務範例

```text
# Claude Code：新功能
/uxu-code:spec 增加登入限流
/uxu-code:plan
/uxu-code:build
/uxu-code:review
/uxu-code:simplify
/uxu-code:ship

# Codex：Bug 修復
@debug 使用者登入後偶發跳回登入頁
@review
@ship
```

壓縮上下文檔案：Claude Code 使用 `/uxu-code:compress CLAUDE.md`；Codex 使用 `@compress AGENTS.md`。

<!-- section:10 -->
## 10. 設定與狀態

設定檔位於 Windows 的 `%APPDATA%\uxucode\config.json` 或 macOS/Linux 的 `~/.config/uxucode/config.json`。專案狀態儲存在 `.uxucode-state.json`；狀態列格式為 `[UXUCODE:STANDARD] task 3/8 · tests ✓`。

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

<!-- section:11 -->
## 11. 常見問題

**兩端能共用同一安裝目錄嗎？** 不需要。安裝對應宿主目錄即可，兩端套件完整且獨立。

**為什麼 `plan` 不直接編碼？** 它只把已核准規格拆成可驗證任務。

**什麼時候使用 `ship`？** 功能完成並準備合併、打版本或發布時；存在 Blocker 或關鍵證據缺失時必須 NO-GO。

**`ultra` 會省略安全風險嗎？** 不會，正確性、安全、證據和明確要求永遠高於簡潔度。
