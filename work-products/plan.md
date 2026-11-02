# GPUBackfill 实施计划

依据：SPEC 第 15 节及当前会话逐项确认。用户最初要求确认后制作，2026-11-02 已确认最后两项；本计划记录已授权实施，不扩大外部权限。

执行策略：serial
fast 请求：否
安全并发上限：1（任务级）
串行退化原因：按阶段集成；T1 内只委派冻结接口下互不重叠的组件写集，全部返回后统一验收。
计划生成基线版本：5.0.26
批准实施目标候选版本：5.1.0

## T1：实现并集成 GPUBackfill

- 依赖：无；波次 W1；启动条件：需求确认、原始字节基线保存。
- 读取：SPEC、当前插件合同/文档、FedLoRA 调度器（仅只读参考）、下述冻结接口。
- 写入：`Codex/mcp/GPUBackfill/`、`Claude/mcp/GPUBackfill/`；两宿主 `.mcp.json`、plugin manifest、marketplace、validator；`README.md`、三语言 `docs/USAGE.*.md`、`.gitignore`、`scripts/validate-all.js`；`work-products/tests/gpu-backfill-*`；`work-products/debug/gpu-backfill/`；项目内 `.venv/`。
- 委派边界：Linux 组件只写 Codex 核心 worker.py/checkpoint.py 与 Linux 测试；插件组件只写双宿主 manifests/marketplaces/validators、.mcp.json、README/三语言指南及打包测试；主 Agent 写 MCP/传输/bootstrap、协议与部署测试、统一入口、环境忽略规则，并在屏障后同步 Claude 核心。
- 共享可变资源：版本、核心副本、统一入口与 todo 在屏障后由主 Agent 核对；各组件不读写另一组件的未完成输出，不写 plan/todo/基线。
- 验收：工具实际可调用；不限 4090 或卡数；后端强制选择集合；默认外部共卡；无断点独占；多卡仅切分适配且原子准入；持久任务、版本部署和受限取消符合 SPEC。
- 验证：目标 Node 测试、项目 `.venv/` 下 Linux 隔离测试、统一门禁；不连接实际服务器、不运行 GPU 训练。
- 回滚：仅撤销本任务归属修改，保留基线及失败证据，不覆盖用户改动。
- 基线根：`work-products/debug/gpu-backfill/execution-baseline/`，create-new/no-replace；展开完整路径集合，保存原始字节及 present/missing 状态；首次写前逐字节核验，漂移即停止。
- 主 Agent 独占集成、todo 原子更新与最终验证。

## T2：独立审查与验收

- 依赖 T1；波次 W2；启动条件：所有组件返回、目标测试通过。
- 读取：完整 diff、测试、SPEC。
- 写入：`work-products/debug/gpu-backfill/review.md`；修复仅限 T1 写集且先保存修复前原始字节。
- 共享资源：主 Agent 独占 todo/最终门禁；审查者只读。
- 验收：发现得到修复或明确报告限制；统一门禁与 diff 检查通过，隔离与真实 GPU/宿主证据分开报告。
- 验证：`node scripts/validate-all.js`、`git -c safe.directory=C:/Code/UXUCode diff --check`，不能与写入并行。
- 回滚：保留现场；不自动提交、安装或发布。
- 基线根：`work-products/debug/gpu-backfill/review-baseline/`，create-new/no-replace，规则同 T1。

## 冻结接口

- 服务 GPUBackfill；本地 server.js、transport.js、bootstrap.py；Linux worker.py、checkpoint.py。均只用标准库。
- 工具：gpu_probe、gpu_prepare、gpu_create_queue、gpu_submit、gpu_status、gpu_cancel、gpu_queue_control。
- 每工具含 target: {host?: string, root: string, python: string}。服务取出 target，远端请求为 {action, root, ...其余参数}。
- worker.dispatch(request, release_dir=None) 返回 JSON 对象；action 为 probe/create_queue/submit/status/cancel/queue_control。prepare 归 bootstrap；CLI 为 run ROOT JOB_ID（ROOT 为项目根），从固定安装版本启动。
- probe 返回 {gpus: [{index, uuid, name, memory_total_mib, memory_free_mib, utilization, processes}], inventory_id}。清单身份仅绑定 UUID/型号/总显存，不绑定序号或瞬时占用。
- create_queue 输入 queue_id、gpu_uuids、inventory_id、selection_confirmed；allow_external 默认 true。硬件身份变化拒绝，选择集合不可变，暂停状态单独保存。
- submit 输入 queue_id、job: {job_id, command: string[], cwd, memory_mib, max_runtime_seconds, resume?: {enabled, grace_seconds?, max_restarts?}, multi_gpu?: {sharding_supported, gpu_count, memory_mib_per_gpu: number[], compatible_models?: string[]}, host_memory_mib?, disk_free_mib?}；max_runtime_seconds 为正数或显式 null。
- status 可选 queue_id/job_id；cancel 必须 job_id；queue_control 必须 queue_id/paused。
- checkpoint helper 保存/验证 opaque bytes，绑定不可变请求和 attempt；任务环境和退出码协议由 worker 及测试固定。
- bootstrap 从 stdin 接收 {request, files, release_id}；files 仅 worker.py/checkpoint.py 的 UTF-8 内容，release_id 为固定清单内容完整性身份。probe/status 零写入；prepare/create_queue/submit 可准备匹配版本。版本在 ROOT/.gpubackfill/releases/，state/locks/jobs/queues 稳定保留。
- 全部协作队列使用同一服务器协调根；新版本不接管/重启旧 worker，主机重启或硬杀后需核验，不自动重投。
