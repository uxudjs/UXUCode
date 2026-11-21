# 动态磁盘预算执行账本

当前候选版本：`5.3.0`。D1/M1 属于已完成的 5.2.0。

批准：用户2026-11-14明确授权完整实施与验证；已批准计划快照work-products/debug/gpu-backfill-disk-demand/approved-plan.md。
任务状态与勾选为同次原子写入的派生镜像。

|任务|状态|标记|attempt|owner|
|---|---|---|---|---|
|D1|completed|[x]|D1-01|/root|
|M1|completed|[x]|M1-01|/root|

基线：work-products/debug/gpu-backfill-disk-demand/baseline/paths.json；no_replace=true。历史plan/todo原字节已保存在该基线。
RED：新MCP磁盘合同测试3项中2项失败：无声明仍放行、新合同不接受。

追加授权：用户明确指定复用FedLoRA的4090连接，仅在/home/huzhuping/jhd/uxucode内做临时CPU测试，完成无误后删除该目录。测试使用目录内.venv与通过官方完整性清单校验的隔离Node，不修改实验或其环境。

终态收据：D1-01，owner=/root，完成于2026-11-14；版本5.2.0。Linux CPU72/72、Linux MCP与启动链26/26、统一14项门禁通过，双宿主runtime同字节。服务器临时目录已删除并经独立连接核验；结果和证据位于work-products/debug/gpu-backfill-disk-demand/result.md。

必要门禁修复：补回原仓库缺失的精确历史对象，保留原HEAD及冻结证据；归一文档/测试夹具的Windows换行。额外写集仅OpenClaw的validate-profile测试夹具一行，原字节已单独保留于当前debug目录。原有未跟踪sampling文件未修改；未提交、推送、安装缓存或升级现有实验。

M1完成：本机原生安装及独立新宿主探针（5.2.0、7工具、disk必填、配置保字节）；FedLoRA项目集成13项Linux CPU测试与原生MCP状态链通过。真实交接继承Mixed attempt8及审计a02 attempt5的完整CP/累计时间，两个新worker均已写出新完整CP，Mixed推进到round44/step35218；现场最终读点分别attempt10/7、已结算21646.389065524563/2973.9155506994575秒，含后续原生压力让路/续接，不清零。94份旧native预留文件可恢复归档，旧共享历史/锁和科学字节不变。临时uxucode目录再次清理并经独立SSH确认不存在。下游持久测试已移入FedLoRA/work-products/tests；下游报告为FedLoRA/work-products/debug/GPUBackfill-5.2-handover-20261114/result.md。

## E1 任务成本与调试效率

|任务|状态|标记|attempt|owner|
|---|---|---|---|---|
|E1|in_progress|[ ]|cost-01|main-agent|

按用户 2026-11-21 的完整交付指令执行。计划快照与新增写集的原始字节收据位于 work-products/debug/task-cost-5.3.0/。

仓库验收通过。5.2.0 对照与 5.3.0 均通过 14 项门禁。新版工作流 181/181、OpenClaw 34/34、GPUBackfill 20 项通过，11 项 Linux 专用测试在 Windows 上按原合同跳过。双宿主 standard 同编码器回放中，评审 Hook 为 253 → 212 token，含技能正文的 debug 为 495 → 484，普通 stats 为 344 → 340。记录量为插件输入，供应商账单未计量。

交付提交 `73d72e0` 已推送 GitHub main，从远端重新克隆后再次通过 14 项门禁。Codex 原生市场安装 5.3.0，80 个文件与发布源码逐一匹配，新进程载入 20 个技能和 7 个 GPUBackfill 工具。安装后宿主将三个既有 Hook 标为 modified，实际回环请求验证它们在等待用户信任时被跳过。三语指南已补充原生复核入口。
