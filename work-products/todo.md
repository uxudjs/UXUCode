# 动态磁盘预算执行账本

当前候选版本：`5.2.0`。

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
