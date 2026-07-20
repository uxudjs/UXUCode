# Addy Agent Skills — 24 工程技能

Addy Osmani 的生產級 AI 編程智能體技能集，覆蓋從需求到上線的完整軟件開發生產週期。

## 技能列表 (24個)

| 技能 | 說明 |
|------|------|
| api-and-interface-design | API 和接口設計 |
| browser-testing-with-devtools | 瀏覽器 DevTools 測試 |
| ci-cd-and-automation | CI/CD 和自動化 |
| code-review-and-quality | 代碼審查和品質 |
| code-simplification | 代碼簡化 |
| context-engineering | 上下文工程 |
| debugging-and-error-recovery | 調試和錯誤恢復 |
| deprecation-and-migration | 廢棄和遷移 |
| documentation-and-adrs | 文檔和 ADR |
| doubt-driven-development | 懷疑驅動的開發 |
| frontend-ui-engineering | 前端 UI 工程 |
| git-workflow-and-versioning | Git 工作流和版本管理 |
| idea-refine | 創意精煉 |
| incremental-implementation | 增量實現 |
| interview-me | 面試模擬 |
| observability-and-instrumentation | 可觀測性和儀器化 |
| performance-optimization | 性能優化 |
| planning-and-task-breakdown | 計劃和任務分解 |
| security-and-hardening | 安全加固 |
| shipping-and-launch | 發布和上線 |
| source-driven-development | 源碼驅動的開發 |
| spec-driven-development | 規格驅動的開發 |
| test-driven-development | 測試驅動的開發 |
| using-agent-skills | 技能發現元技能（Hook 自動注入） |

## Hook 系統

### SessionStart (hooks/hooks.json → session-start.sh)
每次會話啟動時自動注入 `using-agent-skills` 元技能，幫助 AI 發現合適的技能。

### SDD 緩存 (sdd-cache-pre.sh / sdd-cache-post.sh)
為 `source-driven-development` 技能提供跨會話 HTTP 緩存。通過 ETag/Last-Modified 驗證，304 時返回緩存。詳見 SDD-CACHE.md。

### 代碼簡化保護 (simplify-ignore.sh)
為 `/code-simplify` 命令提供塊級保護。標記代碼塊不被簡化。詳見 SIMPLIFY-IGNORE.md。

## 配置 Hook

將 hooks/hooks.json 中的配置合併到 `.claude/settings.json` 或 Codex 的 hook 配置中。

### Windows 注意

shell 腳本 (session-start.sh, sdd-cache-\*.sh, simplify-ignore.sh) 需要 Git Bash 或 WSL 環境。依賴 jq 和 curl。
