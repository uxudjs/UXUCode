# GPUBackfill 执行账本

当前候选版本：`5.1.1`。
实施授权：用户 2026-11-02 完成原始请求中“确认后制作”的设计确认；不授权提交、推送、缓存安装、实际服务器部署或训练。

| 任务 | 波次 | 依赖 | 状态 | 派生完成标记 |
|---|---|---|---|---|
| T1 | W1 | 无 | completed | [x] |
| T2 | W2 | T1 | completed | [x] |

主 Agent 使用同目录临时文件和原子替换共同更新状态与标记；plan 是结构事实源，委派者不写此账本。

## T1 attempt

- attempt：T1-01；owner：/root；no_replace：true。
- snapshot root：`work-products/debug/gpu-backfill/execution-baseline`；规范路径集合与各路径 present/missing 状态见其 `paths.json`，现存文件已保存精确原始字节并逐字节复核。
- 委派 owner：/root/gpu_mechanism（Linux）、/root/uxucode_integration（插件），边界以 plan 为准；其他文件仅主 Agent 写入。
- 执行基线不记录或比较任务级摘要字段。

### T1 必需门禁修正

统一门禁实际失败于旧扫描器读取 `.codegraph/codegraph.lock`；同一扫描器也会把本次按环境合同创建的 `.venv/` 当源码。仅将这两个生成目录排除出 legacy-source 扫描，保留源码拒绝测试；额外写集为 `scripts/validate-no-legacy-commands.js`，原始字节基线在 `work-products/debug/gpu-backfill/validator-environment-baseline/`。这是当前 MCP 实施及项目内测试环境所需的门禁修正，不修改命令语义。

- T1 版本/门禁事实同步包含 `work-products/tests/workflow-contract.test.js`：更新当前版本断言与 GPUBackfill 门禁清单，原始字节已保存在 `work-products/debug/gpu-backfill/workflow-version-baseline/`。首次全量回归准确报出这两处旧断言。

## T1 终态收据

- task：T1；attempt：T1-01；owner：/root；状态：completed。
- 实际修改路径（全部 present-file）以 `work-products/debug/gpu-backfill/changed-paths.json` 的规范路径集合记录；未修改 FedLoRA、安装缓存、宿主配置或实际服务器。
- 验证：GPUBackfill Node 21/21；Linux 20/20；统一门禁 14 步退出 0（其中旧工作流168/168、OpenClaw34/34）；证据 `work-products/debug/gpu-backfill/validate-all.log`。
- 范围例外：仅前述生成目录扫描与版本/门禁事实测试同步，原始字节均单独保存。

## T2 attempt

- task：T2；attempt：T2-01；owner：/root；no_replace：true。
- snapshot root：`work-products/debug/gpu-backfill/review-baseline/`；review.md 首次创建前仍为 missing。
- 独立只读审查 /root/uxucode_integration 最终复核无剩余阻断；审查发现及修复记录在 review.md。

## T2 终态收据

- task：T2；attempt：T2-01；owner：/root；状态：completed。
- 实际修改：`work-products/debug/gpu-backfill/review.md`（present-file）及本账本终态；独立复核通过，无剩余阻断。
- `verification.json` 保存验证层级；实际 GPU、服务器部署和真实宿主加载未执行/未验证。

## 审查修复（当前活动增量）

- 用户明确要求修复四项审查意见；状态：completed（2026-11-03）。
- owner：/root；attempt：review-fixes-01；原始字节基线：`work-products/debug/gpu-backfill-review-fixes/baseline/`，no_replace：true。
- 旧 T1/T2 为 5.1.0 的历史收据，不代表此次四项缺陷已关闭；本增量结果另记。

### 审查修复终态收据

- owner：/root；attempt：review-fixes-01；状态：completed；候选：5.1.1。
- 四项问题及部署标记/单卡型号边界均已建立RED→GREEN证据；Linux修复回归28/28、原回归20/20、Node GPUBackfill26/26及统一14步骤通过。
- 两宿主源码逐字节一致；结果与证据：`work-products/debug/gpu-backfill-review-fixes/result.md`、`verification.json`、`validate-all.log`。
- 实际变更限MCP worker/bootstrap/schema、两宿主分发、版本/合同/文档、回归及本增量证据；无提交、推送、缓存刷新、远端部署或训练。
