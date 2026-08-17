# UXUCode `plan fast` 安全并行规划待办与运行状态账本

状态：已批准（2026-08-16；用户明确批准 `@debug` 修订版依赖与状态镜像合同）

当前产品候选版本为 `5.0.23`。
批准实施目标候选版本为 `5.0.20`。

执行策略：serial
fast 请求：否
安全并发上限：1
状态账本 schema：1
结构事实源：`work-products/plan.md`
Plan SHA-256：`1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159`
唯一状态写入者：主 Agent

批准后 plan 字节保持不变，todo 是唯一运行状态账本。每个任务只允许 `pending → in_progress → completed | blocked`；主 Agent 必须先原子记录 attempt 与写集基线，验证收据通过后才能 completed。任务复选框是显式状态的派生镜像，必须与状态在同一次 todo 原子替换中更新：仅 `completed` 使用 `[x]`，`pending | in_progress | blocked` 使用 `[ ]`；任一不一致均属于账本结构错误并零 worker `BLOCKED`。任何遗留 in-progress、结构／状态不一致或改动归因不清均零 worker `BLOCKED`。

当前计划由 5.0.19 普通 `@plan` 生成，按 S0 → S8 串行自举。T3–T5 仅是未来 fast 候选组 C1；本轮不推断未实现的并行能力。当前 5.0.19 自举期间先校验显式状态与派生复选框，不得仅按未勾选任务选择。普通 `@build` 每次只执行下一项；`@build auto` 可连续串行，但必须停止在 T7 后的外部授权门。

## 阶段 0：恢复基线

- [x] T0（S0）：冻结全部实施写目标的 before-image 与 dirty ownership。
  - 状态：completed
  - attempt：`T0-20260816T235954+0800`
  - 依赖：无
  - 写集基线收据：`plan=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；todo-pre=a23b3f264dc1a2ec59e2e6188aaf1adcf00df89489df34b1b8bfb74f971641a0；既有重叠 dirty=SPEC／todo／workflow-contract；保留策略=byte-identical object before-image + 后续仅按任务边界修改`
  - 验证收据：`31 targets；manifest=53678a0a341ba78fedf891d9c9bba67957ac4107029a4c924fc9cc1d187e70e1；validator=da3d871704818dfcdb8196e7f18390a6e585e1610fee30c7668cab6a4640e2c8；prestate PASS；diff --check PASS；dirty 仅获批 planning 输入与 T0 evidence`
  - 写入：`work-products/tests/plan-fast-repository-prestate/`、repository prestate 校验器、todo 原子状态事务
  - 完成：全部计划写目标的存在性、字节、SHA-256、Git diff／未跟踪归属与路径边界可重算；重叠用户 dirty 未获明确保留策略时 BLOCKED。

## 阶段 1：事实源与合同冻结

- [x] T1（S1）：解除历史 evidence 与不可变 plan 的可变版本断言耦合。
  - 状态：completed
  - attempt：`T1-20260817T000900+0800`
  - 依赖：T0
  - 写集基线收据：`workflow-contract=749aea30c42ca281963909fa1621f5516fff42abf3cbf156d1ea03fad3709338；dirty owner=approved-debug-contract；允许写入仅该文件与 todo 状态事务`
  - 验证收据：`RED 0／2（plan 当前候选耦合、历史任务编号耦合各 1）；GREEN 2／2；workflow-contract=9ca1ba137bcb567233e18ca0e1805af5fffb140a31e8cbc04a88243a0742e022；prestate PASS；diff --check PASS`
  - 写入：`work-products/tests/workflow-contract.test.js`
  - 完成：历史任务 17／18 只由持久报告证明；release metadata 区分 plan 的 5.0.19 基线／5.0.20 目标与当前可变产品候选。

### 检查点 A0

- [x] host-lifecycle 不再读取当前 plan/todo 历史编号。
- [x] release metadata 已支持不可变 plan。
- [x] T0 repository prestate 收据保持可重算。

- [x] T2（S2）：建立 fast RED、路径／资源 mutation、状态崩溃矩阵、router 回归及五类 fixture。
  - 状态：completed
  - attempt：`T2-20260817T002000+0800`
  - 依赖：T1、检查点 A0
  - 写集基线收据：`workflow=9ca1ba137bcb567233e18ca0e1805af5fffb140a31e8cbc04a88243a0742e022；mode=178081be4dfc88b7a43b27ddd1cce81bdcebf876603de441a6019056dff3b911；docs=b65dda66fcb8d444055f716356a9512dd2c413fa7223d76b6f2b887a2c0aef5d；fixtures=absent；允许写入仅三合同测试、五 fixture 与 todo 状态事务`
  - 验证收据：`focused 2／6 GREEN：router + 五 fixture 自检；4／6 精确 RED：plan／build／help／docs；workflow=874a7b7565ef8bdcdfac9632d9fbd13a30686663c97bc20b050856e96fea5d6c；mode=3bdd576a78d1a6d0503f77958b0a72a5f8865d47978c8a19eb56a361dbfbe4aa；docs=415a12c40c2810b55b3f8a800d67ab2db05b2e7ff78b1d380b0d36c9e1e0651c；prestate／diff-check PASS`
  - 写入：三个中央合同测试与 `work-products/tests/fixtures/plan-fast/`
  - 完成：完整任务字段、路径别名／链接／共享资源、零 worker 降级／BLOCKED、todo 原子状态、部分重入和互斥 focused 读集均有可归因合同。
- [x] T2R（S2R）：分类并在必要时最小修复双宿主 Prompt router。
  - 状态：completed
  - attempt：`T2R-20260817T003000+0800`
  - 依赖：T2
  - 写集基线收据：`Claude=a745aa5916fac2eb511b30e3711efebb8d4373f9702ba0e7257a5c64c8a29023；Codex=5c43c779973438505e59dfea66ec203b2d236fd93890099c3bdd3f0d01613ada；router focused 基线 GREEN 时产品写集为空`
  - 验证收据：`focused 13／13 PASS；no-op；Claude SHA-256=a745aa5916fac2eb511b30e3711efebb8d4373f9702ba0e7257a5c64c8a29023；Codex SHA-256=5c43c779973438505e59dfea66ec203b2d236fd93890099c3bdd3f0d01613ada；产品写集为空`
  - 写入：router GREEN 时无产品写入；精确 RED 时仅写 `Claude/hooks/uxu-prompt-router.js`、`Codex/hooks/uxu-prompt-router.js`
  - 完成：原样传递合同与既有拒绝语义全绿；no-op 或条件修复均有 SHA-256 收据。

### 检查点 A

- [x] 当前 planning facts 可替换，不保留旧任务伪兼容。
- [x] fast、路径／资源、状态崩溃与重入 RED 精确；router 分支已闭环。

## 阶段 2：串行自举三个产品切片

- [x] T3（S3；未来候选组 C1）：实现双宿主 `plan fast` 与 canonical planning contract。
  - 状态：completed
  - attempt：`T3-20260817T004000+0800`
  - 依赖：T2R
  - 写集基线收据：`Claude plan=a5c4d04ebd9e24ec84a233c189f1d29365425ae178d99149e7ad81f1daaa88ed；Codex plan=a5c4d04ebd9e24ec84a233c189f1d29365425ae178d99149e7ad81f1daaa88ed；Claude planning=177601cb59d71d36aa155dfed84d7e6ae6812c0dfbc9944843921f75471c2cdb；Codex planning=041d1156ceea89fd302b13a714cd45beb502034a2dc1e0811cb3cb47cb1fa54d；允许写入仅四文件与 todo`
  - 验证收据：`plan-fast plan contract 1／1 PASS；双宿主 plan SKILL=8dee1dd91c5c3674a4eb7bc82e5164852448ff68960198839a046554fb463260；Claude planning=85fdfde9a1a1c1fa0a342f838ff4a865bdc0501bac50d2f031789dbbdf4e273f；Codex planning=964e424d882af19673d5e4aed307b1a7c45a874ca202922c045cdf34f0fe7804`
  - 写入：双宿主 plan Skill 与 planning reference
  - 完成：精确首参数、全部计划／任务／波次字段、不可变 plan、初始 todo 状态、冲突规则与 serial fallback 合同通过。
  - focused：只运行 `plan-fast plan contract:`；无法证明读集互斥时移到屏障。
- [x] T4（S4；未来候选组 C1）：实现双宿主 build 波次消费、todo 原子状态、部分重入、屏障和降级。
  - 状态：completed
  - attempt：`T4-20260817T005000+0800`
  - 依赖：T2R、T3
  - 写集基线收据：`双宿主 build=e4a2889ec5e4a08d44510f83e42a965ee880a94b4b92e77f4a1d76860880a616；Claude orchestration=4090b3a93d5776c35ad3f78bd7584249a53a73ffe3a48b381c286390abc6359a；Codex orchestration=d065af923d61a9b831ec90c488fa7cb6422fd87cb6d276131e8d836a94cf118f；允许写入仅四文件与 todo`
  - 验证收据：`plan-fast build contract 1／1 PASS；双宿主 build=07b875936e96a677740ed8d44a2bbcc2ff8768ba484a988f0f308304d2bfc55a；Claude orchestration=ebbe331895fb00cd74d2ac3b0368b2bdad57bc8dd88c3f31be39995ce9d709e5；Codex orchestration=69ad660e5cc982a07192f2986b0980034f21552db431b1678e6817b3b13c296f`
  - 写入：双宿主 build Skill 与 orchestration reference
  - 完成：下一波／跨波、before-hash attempt、崩溃零 worker BLOCKED、只重试未完成项、主 Agent 独占 todo 和失败停止合同通过。
  - focused：只运行 `plan-fast build contract:`；无法证明读集互斥时移到屏障。
- [x] T5（S5；未来候选组 C1）：同步双宿主 help、三语言指南与 guide validator。
  - 状态：completed
  - attempt：`T5-20260817T010000+0800`
  - 依赖：T2R、T4
  - 写集基线收据：`help=a3c7b4bf55f6a2e9c531c0ece62a518cb13da7d17d4c105f6117064fdc3174ce；zh-CN=26d6a3df46689bb7d919b723f1c080fe7d7b8ad11266a4aa384b439df6ca19a7；zh-TW=0715e3899bd538865ada8a8e84dea260170968bab3cb0f5f9324213195e35ddd；en=165ab3a9ab6870009dc3f455f23286ace921c6625c1c566b0a774c61985558f2；validator=9d63def2921d622a0260fca71d7d20192f0658a3d855e7c6b762125c4660113f；README=0e3669306966b37ac50593b53c80065922b8cabbff9d42b871cff33585f234c9（仅冲突时）`
  - 验证收据：`focused help／docs 2／2 PASS；检查点 B 合同 99／99、skill parity 20 skills／24 references、guide parity PASS、prestate／diff-check PASS；README 无冲突且 SHA-256 保持 0e3669306966b37ac50593b53c80065922b8cabbff9d42b871cff33585f234c9`
  - 写入：双宿主 help、三语言指南、guide validator；README 仅在现有承诺冲突时
  - 完成：三语言精确 `plan fast`、不强制并行、不可变 plan／todo 状态、部分重入与 build／auto 边界通过。
  - focused：只运行 `plan-fast help contract:`／`plan-fast docs contract:`；全局 parity 留在屏障。

说明：C1 只有在 T2 证明编辑写集和 focused 读集均不重叠时才是未来安全并行波次。全局 skill parity、完整 workflow contracts、guide parity 与 diff check 必须由主 Agent 在屏障串行运行；任一证明失败即缩为编辑并行或完全串行。

### 检查点 B

- [x] workflow、mode/router、documentation 目标合同全绿。
- [x] skill parity、guide parity、diff check 通过。
- [x] 默认 plan/build/auto 无回归。

## 阶段 3：版本与本地候选

- [x] T6（S6）：原子同步 `5.0.20` 产品版本事实与 todo 当前候选，不改不可变 plan。
  - 状态：completed
  - attempt：`T6-20260817T012000+0800`
  - 依赖：T3、T4、T5、检查点 B
  - 写集基线收据：`Claude manifest=41094b8c7f038171d152e3e06d564c67326dedb3f69180066734f110454afa95；marketplace=3e791df0bf7d3b4eb24d522c25d39c21176b1cf05f38f1d69e62daee60bcf440；Codex manifest=cf1ab66c538776db0d4ef185ba00e0bba157f2b1be8ff8c5d45127da6de872ef；Claude validator=5831c263a3066c7718e752509c717895c804e89195ed3a77eaf6e18e148d9002；Codex validator=7a8a739a6b2d9c2db4cbc8d8b31ab85483996cdbb0607a83621eeb7953b20f22；workflow=874a7b7565ef8bdcdfac9632d9fbd13a30686663c97bc20b050856e96fea5d6c；SPEC=0af52633a726458bd150bf22722f418b52d22602d550889d6a0e007e8f75c22a；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159`
  - 验证收据：`release metadata 1/1；Claude validator 20 skills；Codex validator 20 skills；repository prestate PASS；diff check PASS；plan SHA-256=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；candidate hashes=Claude manifest f7369526c2b49757e07140a87435b5442539a247f95120ad7429f376df848c85、marketplace 07f8870909b9bd849b10dc3453fe5c4cc94acf7da43c5b16d8c17dd6b7f9de24、Codex manifest 0b5eb1f4ead511c24e4cd268c5e95b9f3299de3e5b5184dd828f3b24faf8c20e`
  - 写入：三 manifest／marketplace、两 validator、workflow version contract、SPEC 与 todo 原子状态事务
  - 完成：六个发布表面、SPEC 与 todo 当前候选为 5.0.20；plan 字节不变并保留 5.0.19 基线／5.0.20 目标。
- [x] T7（S7）：运行统一门禁并准备真实 host pre-state、静态回滚制品与精确 preflight。
  - 状态：completed
  - attempt：`T7-20260817T001750+0800`
  - 依赖：T6
  - 写集基线收据：`plan-fast-host-smoke.md=absent；plan-fast-host-artifacts/=absent；verify-plan-fast-host-artifacts.js=absent；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159`
  - 验证收据：`host artifact validator PASS（2 hosts／142 static files）；Claude/Codex 5.0.19 包内 validator 各 20 skills；unified gate 12/12（workflow 154/154、OpenClaw 34/34）；repository prestate 31 targets PASS；PowerShell preflight 5 blocks syntax PASS；diff check PASS；plan SHA-256=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；validator=d9571a5f7799c9c899d67a49bcb8939867c77fb14dbadf33b761611cb7429d2c；report=345f06ccb68befafadcc76e3a93384a9e43629b6ecb8ec9903243318f794f55d；static manifest=66e745477b1486be7bebcfc0c1d778fde7ac9160a4c9c9ee9cee92ec776314d7；host prestate=ce713a8e82d4d9291a91c7b178dcdd10adf73d1a54f7288d0575cff280738ea2`
  - 写入：`work-products/tests/plan-fast-host-smoke.md`、`work-products/tests/plan-fast-host-artifacts/`、artifact 校验器与 todo 原子状态事务
  - 完成：本地候选全绿；两宿主登记／cache 的只读 pre-state 可核对；5.0.19 静态制品可重算；外部备份、安装、费用、验证和双宿主恢复命令完整列明。

### 检查点 C

- [x] 统一静态门禁 12／12，`git diff --check` 通过。
- [x] 仓库 source、repository prestate、静态 host 制品和真实 host pre-state 明确分层。
- [x] 未修改用户级登记、cache 或 fresh session。

### 外部授权门

- [x] 停止并取得 T8 的精确仓库外操作与费用授权。
  - 授权收据：`2026-08-17T00:42:01+08:00；用户明确回复“批准执行”；范围、USD 6.00 Claude 上限、Codex 10 次现有配额、backup-first 与双宿主恢复按 T7 preflight 不变`
- [x] 即使此前使用 `@build auto`，也不得自动越过此门。
- [x] 取得 attempt 02 的新仓库外操作与费用授权。
  - 授权收据：`2026-08-17T03:28:21+08:00；用户明确回复“批准 T8-20260817-host-smoke-02 的登记/cache 操作与模型费用”；沿用本任务已冻结的 Claude 最多 10 次、单次 USD 0.60、总计 USD 6.00，Codex 最多 10 次现有账户配额，以及 backup-first、失败即停与双宿主恢复边界。`
- [x] 批准 attempt 03 的无外部写入 Claude identity 合同修订。
  - 授权收据：`2026-08-17T12:19:33+08:00；用户明确回复“授权合同”；仅授权仓库内 SPEC／identity contract／preflight／validator／todo 修订与静态验证，不授权 attempt 03 完整 user-state backup／restore、registration／cache、模型调用或费用。`
- [x] 取得 attempt 03 的完整 user-state guard、registration／cache 与模型费用授权。
  - 授权收据：`2026-08-17T13:46:13+08:00；用户明确批准执行 T8-20260817-host-smoke-03；允许完整备份及必要时恢复 <USER>/.claude、<USER>/.claude.json，允许两宿主 registration/cache 操作；Claude 最多 10 次、单次 USD 0.60、总计 USD 6.00，Codex 最多 10 次现有账户调用；backup-first，任何非预期 delta 立即停止并恢复。`
- [x] 批准 attempt 04 的双轨证据规划。
  - 批准收据：`2026-08-17T14:14:55+08:00；用户明确回复“批准两个规划”；真实 config root 强身份轨道与隔离 CLAUDE_CONFIG_DIR 功能 smoke 轨道合并验收、不可互替；仅批准仓库内规格／合同／报告／validator／todo 修订，不授权宿主调用、registration／cache、模型费用或 attempt 04 执行。`
- [x] 取得 attempt 04 的完整 backup／restore、两宿主 registration／cache 与模型费用授权。
  - 授权收据：`2026-08-17T14:28:34+08:00；用户明确回复“确认授权操作与费用”；按已批准双轨规划执行 T8-20260817-host-smoke-04，允许完整备份及必要恢复 <USER>/.claude、<USER>/.claude.json、两宿主 registration／cache 操作；Claude 最多 10 次、单次 USD 0.60、总计 USD 6.00，Codex 最多 10 次现有账户调用；backup-first，任何非合同 delta 立即停止并恢复。`
- [x] 批准 T8 阻塞及后续仓库任务的合同修订。
  - 授权收据：`2026-08-17T15:01:55+08:00；用户明确回复“授权修订后续所有任务”；授权修订冻结 Codex smoke prompt／validator、历史 attempt 输入快照、报告、SPEC（仅必要时）与 todo，并运行仓库内 RED／GREEN／静态门禁；不授权新的宿主 registration／cache、模型调用或费用，不授权 commit、push、发布或部署。`
- [x] 取得 attempt 05 的完整 backup／restore、两宿主 registration／cache 与模型费用授权。
  - 授权收据：`2026-08-17T16:33:16+08:00；用户明确批准 T8-20260817-host-smoke-05；允许完整备份及必要恢复 <USER>/.claude、<USER>/.claude.json，允许两宿主 registration／cache 操作；Claude 最多 10 次、单次 USD 0.60、总计 USD 6.00，Codex 最多 10 次现有账户调用；backup-first，任何非合同 delta 立即停止并恢复。`
- [x] 批准 T8 无模型证据审计取代 fresh-model 验收。
  - 授权收据：`2026-08-17T17:01:21+08:00；用户明确要求“不做Claude和Codex模型校验，审计合理即视为通过”；本轮只允许仓库内合同、审计收据、报告、validator 与 todo 修订及静态验证，模型调用与模型费用均为 0，不新增宿主 registration／cache 写入。`

## 阶段 4：单独授权的真实宿主证据

- [x] T8（S8；验收覆盖后）：以无模型证据审计验收 5.0.20 候选。
  - 状态：completed
  - last attempted：`T8-20260817-no-model-audit-01`
  - prior attempts：`T8-20260817-host-smoke-01`、`T8-20260817-host-smoke-02`、`T8-20260817-host-smoke-03`、`T8-20260817-host-smoke-04`、`T8-20260817-host-smoke-05`（历史证据保留，不复用）
  - 依赖：T7、用户当前无模型审计验收要求、现有候选安装／cache／恢复证据、仓库静态门禁
  - 审计写集基线：`2026-08-17T17:01:21+08:00；todo before=c1370df43abe36ecb35cb61ea27c29ff78b0d571f471b2c216e30b3261e5fb1c；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；audit target=absent；model calls=0；host registration/cache writes=0。`
  - 审计收据：`work-products/tests/plan-fast-host-artifacts/audits/T8-20260817-no-model-audit-01/audit.json；Status PASS；attempt 04 两宿主历史候选包各 71 文件与当前源码逐字节一致、包内 validator PASS；attempt 05 恢复三项 delta=0；当前宿主安装／fresh runtime=NOT_REQUIRED_NOT_VERIFIED；Production NOT AUTHORIZED／NOT EXECUTED／UNVERIFIED。`
  - 审计最终校验收据：`contract-only no-model audit PASS（含两候选包 validator；no host CLI／model）；focused plan/build/help/fixture 4／4；workflow 154／154；OpenClaw 34／34；unified gate 12／12；repository prestate 31／31；diff --check PASS；SPEC=d32efe2e9e90f3f6eef2680d23858bce53b997d70ec4fe5a230e6e69d2a82c16；identity=863bf3242694054c1f38d5e599f2c5a359544bc89c6a8ca8a9608ac807fb0396；audit=4ed74b355d3b56630115c22a95e9cd242fe7896bae9bd035e669222ba8f68c53；report=389b845dc0f4a2e203ebef75c9f8fed45be83667152eab384ed345f80f8234d0；validator=4e16a2ae8e9c6c65538fd3d2b9ac3997cf72bf216d62e5a49ee77cb4e9b434ad；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - attempt 05 写集基线：`2026-08-17T16:33:16+08:00；todo before=1b83c301a2ae29f9170a2428b5ebca362ff7f5c150ca7e777e774bcc51ed6bcb；plan=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；prestate/runs/fixture targets=absent；Claude registration=0d3ad42a33c6ea7e664665a5477a2b264d033765ea7bbe6818d35723bfa31805／54eb36dc335407a27544a2d397fcfb016e7fca6a51a249c41858a7f3885d187c；Claude .json=e0a72f7d19f675b26deded3961e32ae296ee7791065309513317d0b27a8d8e56；Codex config=33b8c1508cb94ca979938deb3dc31b4dbec068863eef806e261b19cb79d78f16；Claude cache 768 files；Codex cache 71 files；identity schema v3=20c1e773408f09951a2a5ac97d50d7e256f225ac341771f1f61d238a5c9c686d；smoke=987ee6e4ba1b21773bada206c8c0ded0ea11ec56583967738f190487efc09e8f；fixture=bec9adc4f9475e84750724c367fa9c35ea21076be850d6d2ff3f7d1b2b6d8d45。`
  - attempt 05 执行收据：`首次 backup 在 host CLI 前因 271 字符校验路径缺 extended-path 前缀安全停止并保全；修正 attempt 专用脚本后 backup-first VERIFIED，manifest=78032246e49ab2109778300d0319982669d42798ec332c73fea3139ec3d5b79f，Claude 1602 entries（864 files／737 directories／1 symlink），Codex cache 71 files；第 1 次 Claude CLI 安装前 identity 返回 claude-code:unrecognized_model，configured model=qwen3.7-plus[1m]，无成功 result／token／费用收据；candidate install=0、fixture=0、functional smoke=0、Codex calls=0；两宿主立即恢复 attempt 05 prestate，Claude full state／Codex config/cache delta=0，Claude registration=5.0.19；summary=222b0d6b8a70f1c07062432d23f06235574dc671854dd95c94e61e08d95046e0；report=9604a72c026bdfe3f8521d859b5f58876b395793d720c1c23703217f799e8a5d；validator=e9861d5d1c58716ea437b6d5e4f95422d80ca9c32c6d74e58b8ccfc1832dad2；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - attempt 05 最终校验收据：`contract-only PASS（attempt 03/05 BLOCKED evidence + attempt 04 command repair，no host CLI）；unified gate 12／12；workflow 154／154；OpenClaw 34／34；repository prestate 31 targets PASS；PowerShell 7／7 syntax PASS；diff --check PASS；Production NOT AUTHORIZED／NOT EXECUTED／UNVERIFIED。`
  - attempt 04 写集基线：`2026-08-17T14:28:34+08:00；todo before=5c8bd7e08734dd72ddc788d845e33355707e0388e2b384b189889e2d2fe79a1a；plan=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；prestate/runs/fixture targets=absent；三份 registration SHA 与 T7 相同；Claude/Codex cache scopes present；identity schema v3=20c1e773408f09951a2a5ac97d50d7e256f225ac341771f1f61d238a5c9c686d；smoke=6aedc70665945e9c72adc7fe3024603c6f63f32dcea1d068be8507871d292c6d；fixture=bec9adc4f9475e84750724c367fa9c35ea21076be850d6d2ff3f7d1b2b6d8d45。`
  - 写集基线收据：`2026-08-17T03:28:21+08:00；attempt 02 prestate target=absent；runs target=absent；fixture root=absent；plan=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；smoke cases=6aedc70665945e9c72adc7fe3024603c6f63f32dcea1d068be8507871d292c6d；fixture specs=bec9adc4f9475e84750724c367fa9c35ea21076be850d6d2ff3f7d1b2b6d8d45；identity contract=3c037b14f0af08dd782a530f330fa5ca8d8274ceee816fd45e4c25ea9724ad68；三份登记仍为 T7 SHA；Claude cache scope 与 Codex 5.0.20 local-source cache scope 均存在。`
  - attempt 02 backup 收据：`backup-first VERIFIED；Claude registration 2／cache 768；Codex registration 1／cache 71；manifest SHA-256=28a48380afb3083404b14e08b5ccb15be60a71807655da7cbaf36f848fef96fb；备份后 host artifact validator PASS；两宿主 cache 相对 backup 均 0 delta；post-validator receipt=f3d5da43de5263aece8fb68e6328b87c8afe27d0dd12c81742f82a2174d8ca26；安全顺序修订后的 report=a0c0ea9319026f09b368be25a1dcc6528f596cc437e6494ee32304b84de0e317。`
  - attempt 02 失败收据：`Claude prewrite identity exit 0；USD 0.16057100000000002；input 18／output 887 tokens；freshLoadedRoot=<REPO>/Claude；loaded version=5.0.20；--permission-mode plan 新建未授权用户 plan 文件，SHA-256=1f1365cfc5e157341e9b8819bc2e595e6d2a3f568d1f1036c9a5744bfa3b3f6b；已保全至 runs evidence 且外部原路径恢复 absent；Codex calls=0；candidate install=0；fixture=0；functional smoke=0；summary=b702ab4a6181056242241515fa23308fd7fa8a05d0c00d24017c2eb7791b85fe。`
  - attempt 02 恢复收据：`registration delta Claude=0／Codex=0；cache delta Claude=0／Codex=0；无需覆盖复制；checkpoint=26ec00d9665b41229838e7ea02c1e895172409e770a8358fcf031c22b7c15e4e；fresh recovery identity 未执行，因为已证伪的 identity 命令本身会越过写集。`
  - attempt 02 最终校验收据：`workflow 154／154；OpenClaw 34／34；unified gate 12／12；repository prestate 31 targets PASS；PowerShell 6 blocks syntax PASS；diff --check PASS；report=9cfdbdd72383b06b94f67ca9c4220c7cdc404882a4259e6f2ed0e434e8cdacb7；debug=35aea805e87a11253e6fdf8808a4a38e256c4995288c1b02f22d5bcf0504bb04；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - attempt 03 identity 合同收据：`RED contract-only verifier：schema 1 !== 2；GREEN contract-only PASS 且 no host CLI；guard invariants PASS；PowerShell 7 blocks syntax PASS；unified gate 12／12；workflow 154／154；OpenClaw 34／34；repository prestate 31 targets PASS；diff --check PASS；schema v2=b61693b29eee27f03ee6ffb96fd3ba0c42b9bf02f5a41448c7c571892d6c1fad；SPEC=184a966701010ba38b2e8c07a5861dfdba2c494a4eb1bd92c4f0aa20dc3a9e1f；report=d4e6bff7a66e1f28678ba38c899861f91fd85f2bc9ac59161741c2c1af9158ca；validator=0207a72ae60bd580f8ebb8a47f770e8966ed58f47ac476b13cff2af062e8db37；debug=038164f2a0799ac7a96a2f4e6b25babb23fb1773b8fda39e0a58b6166bc687d8；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - attempt 03 写集基线：`2026-08-17T13:46:13+08:00；prestate/runs/fixture targets=absent；plan=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；fixture=bec9adc4f9475e84750724c367fa9c35ea21076be850d6d2ff3f7d1b2b6d8d45；smoke=6aedc70665945e9c72adc7fe3024603c6f63f32dcea1d068be8507871d292c6d；identity=b61693b29eee27f03ee6ffb96fd3ba0c42b9bf02f5a41448c7c571892d6c1fad；Claude user-state 864 files／17114898 bytes／1 symlink debug/latest；Claude registration SHA 0d3ad42a...／54eb36dc...；Claude .json e0a72f7d...；Codex config 33b8c150...；Claude cache versions exclude 5.0.20；Codex cache=5.0.20。`
  - attempt 03 backup 收据：`backup-first VERIFIED；Claude complete user state tar SHA-256=5b33e995aef074ed781c2258c16d323f7967ef271b2980f42250cd4705712524；live/extracted 1602 entries（864 files／737 directories／1 symlink）逐项一致；Codex cache 71 files／config 逐字节一致；manifest SHA-256=56ab1c653860b973fd6d61d87a8133bb46ead011efb0e9dcb6a322ff0b65b942。`
  - attempt 03 失败收据：`post-backup host artifact validator PASS 且 Claude/Codex guard 0 delta；Claude identity exit 0／USD 0.044805000000000005／input 6／output 159／loadedRoot=<REPO>/Claude；5 diff records=3 logical mutations（.claude.json 改写、rolling backup 替换、session-env 目录创建），均非允许 cache delta；Codex calls=0；candidate install=0；fixture=0；functional smoke=0；summary=b49534805318d3dc8d93201872d53978e534c06547fa2f20d61b8c349c58cc3d。`
  - attempt 03 恢复收据：`post-call Claude full state 已保全至 runs/restore-quarantine/Claude；tar restore 后 Claude full state delta=0；Codex config/cache delta=0；checkpoint=521fd9b04e012292983384305a464ac3bc82b75a72aab30c1755599ad2e1fc29；fresh recovery identity 未执行，因为真实 config root 启动本身会再次制造非 cache delta。`
  - attempt 03 最终校验收据：`contract shape + BLOCKED evidence PASS（no host CLI）；unified gate 12／12；workflow 154／154；OpenClaw 34／34；repository prestate 31 targets PASS；PowerShell 7 blocks syntax PASS；diff --check PASS；最终纯文件系统复核 Claude full state/Codex config/Codex cache delta=0；report=d1010942f4521b00ebf31f7dca4443e5c690457d9006dc3c21ebff2dfd9f72cd；validator=6b01b1369fb51bff07f0bc0dd1952c3b47fcf10c219aabd51508c27924680bc5；debug=58a9a26d8104241ad931a2fda94f950660d9f82ca5bb5e963b1e0d3d782fc5dd；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - attempt 04 双轨规划收据：`RED schema 2 !== 3；GREEN contract-only PASS 且 no host CLI；schema v3=20c1e773408f09951a2a5ac97d50d7e256f225ac341771f1f61d238a5c9c686d；SPEC=d07ab2e30e654d2824822f662e28fe53ac6c48508d16e86d25cb3f2ce48ccb64；report=fbeb6d69e18c69c46349499eb3f6371bc81369eaadd0537ffe57a9d48c1fdb5a；validator=8712abc61a0e415e5aaf5f12f2c5dc98818b87c7ed33744008b19477762183a9；debug=6bb4962fe5e0905b525e3bfd23602ae3839b633225801dfd21613731cfd48bb9；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；未创建 attempt 04 evidence 目标，未调用宿主或模型。`
  - attempt 04 规划校验收据：`contract-only PASS；unified gate 12／12；workflow 154／154；OpenClaw 34／34；repository prestate 31 targets PASS；PowerShell 7 blocks syntax PASS；diff --check PASS；仅仓库静态证据。`
  - attempt 04 执行收据：`backup-first VERIFIED，manifest=47490991592df74df738fc2f0ab54521ab09b5de52c17e1f1c0c1a8699101f75，Claude 1602 entries（864 files／737 directories／1 symlink），Codex cache 71 files；首次 bsdtar 缺失在 host CLI 前停止并保留空现场；安装前 Claude actual-root identity PASS、6/109 tokens、USD 0.04362375、固有 delta 后逐字节恢复；8 fixtures prepared；两宿主 5.0.20 registration/cache 71 files byte parity 与 validator PASS；候选 Claude actual-root identity PASS、6/79 tokens、USD 0.0428675、固有 delta 后逐字节恢复；功能调用前发现 8 个 Codex prompt 与 validator 错用 @uxu-code:plan|build，违反 @plan|@build 公共合同，functional calls=0、Codex calls=0；Claude calls=2、总 USD 0.08649125；双宿主恢复 attempt 04 prestate，Claude full state／Codex config/cache delta=0，Claude registration=5.0.19；summary=19e05160b4477b8a87ccf9030939f73cdf2543bab0f6c267e9df8d308ad29248；report=af0e6f2fe48efc40e3875f432d98eabb886e40967f52b2f996c42d065e55b528；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - attempt 04 最终校验收据：`公共命令诊断 RED：8／8 Codex prompt 错用 @uxu-code: 前缀；attempt04 evidence integrity 7 hashes PASS；contract shape + attempt03 BLOCKED evidence PASS（no host CLI，不解除 prompt RED）；unified gate 12／12；workflow 154／154；OpenClaw 34／34；repository prestate 31 targets PASS；PowerShell 7 blocks syntax PASS；恢复 Claude full state／Codex config／Codex cache delta=0；summary=19e05160b4477b8a87ccf9030939f73cdf2543bab0f6c267e9df8d308ad29248；report=af0e6f2fe48efc40e3875f432d98eabb886e40967f52b2f996c42d065e55b528；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - 后续合同修订基线：`T8-contract-repair-20260817T150155+0800；todo before=8931311517f037ff0d413774e8c171b08e035464fcd415cc6c0a67429f43606f；smoke=6aedc70665945e9c72adc7fe3024603c6f63f32dcea1d068be8507871d292c6d；validator=8712abc61a0e415e5aaf5f12f2c5dc98818b87c7ed33744008b19477762183a9；report=af0e6f2fe48efc40e3875f432d98eabb886e40967f52b2f996c42d065e55b528；attempt04 summary=19e05160b4477b8a87ccf9030939f73cdf2543bab0f6c267e9df8d308ad29248；historical frozen-input target=absent；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159；T8 保持 blocked，修订完成后仍等待新 attempt 外部授权。`
  - 后续公开命令合同修订收据：`两层 RED：精确 @plan|@build 断言先拒绝 8／8 旧 Codex prompts；修正 prompts 后因缺 attempt04 冻结输入 sidecar 再 RED。GREEN：8／8 当前 prompts 使用精确 @plan|@build，identity prompt 使用 @help，validator 明确拒绝 @uxu-code:；当前 smoke=987ee6e4ba1b21773bada206c8c0ded0ea11ec56583967738f190487efc09e8f；validator=30d734c886215df7ac6222cc4012e28cb81b7bef6a5db72d68819c5c4ff095b2；report=eb5f93ecac4527eb71f1ccace5acc38f5f74a4d3c93479b65bb3c992ff71716a；sidecar=026247d7fc6e1b9899cae597b8cd931890fb216fb8c4e0015e3f3e6667fee9f4；旧输入 frozen=6aedc70665945e9c72adc7fe3024603c6f63f32dcea1d068be8507871d292c6d；attempt04 summary 仍为 19e05160b4477b8a87ccf9030939f73cdf2543bab0f6c267e9df8d308ad29248；host operations=0；model calls=0；plan immutable=1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159。`
  - 后续公开命令合同最终校验收据：`contract-only PASS（含 attempt04 command repair，no host CLI）；PowerShell 7／7；unified gate 12／12；workflow 154／154；OpenClaw 34／34；repository prestate 31 targets PASS；diff --check PASS；T8 仍为 blocked，仅等待新 attempt 外部授权。`
  - 验证收据：`backup-first VERIFIED（Claude registration 2／cache 768；Codex registration 1／cache 71；manifest c0c64abe1f4b6aff0f94e8394163b7c69a3c81d871b43887e0e8bd1c001765f0）；两宿主 5.0.20 登记／cache／validator 曾 PASS；fixture preparation FAILED（expected e50e76b...，actual 27ae4c8a...，bytes 50310a），functional smoke calls=0；两宿主登记／cache 已逐文件恢复 T7 pre-state，host artifact validator PASS；Claude fresh identity FAILED：实际加载 <REPO>/Claude source；Codex fresh identity INCONCLUSIVE：3 次 nested exec 均 0 tokens；Claude cost USD 0.19862825；summary ff4f00261039c1e95855b1b6a95dc68c61bcd364e2e92d1c0f2dfc5a5e6156fb；report 7085efd0713cbb5a6747f7a35f0ae1225d23a4260e0c1ef1693ae19167039339；validator ca32130b7eeed358e71e20a385b25be522eae9f449017c4e7daee6e4cd8488bd`
  - 合同修订收据：`RED fixture schema 1 != 2；第二 RED 缺 local-marketplace identity contract；GREEN host artifact validator PASS；fixture schema v2／SHA bec9adc4f9475e84750724c367fa9c35ea21076be850d6d2ff3f7d1b2b6d8d45；identity contract SHA 3c037b14f0af08dd782a530f330fa5ca8d8274ceee816fd45e4c25ea9724ad68；SPEC efa934405b776fe0a24e1644a184c6638137aa15822c670d8da88cee1bb6cd6d；report 92d4b8a6e15259ebe035dede484d7af14db720228efe9123199eb9259d5e04a0；validator 273e492a702bb142b6f6bcfe07f6779e009606638052d1a2b6ff1fb5dca36e60；plan immutable 1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159`
  - 最终校验收据：`PowerShell preflight 6 blocks syntax PASS；workflow 154／154；OpenClaw 34／34；unified gate 12／12；repository prestate 31 targets PASS；host artifact validator PASS；diff --check PASS。`
  - 当前身份：`三份登记文件仍与 T7 字节一致；Claude cache=restored-prestate；Codex cache=materialized-local-source 5.0.20。后者由本轮 CLI 身份诊断于 2026-08-17T01:01:51+08:00 物化，已纳入派生 cache 合同但未改写历史 T7 收据。`
  - 历史阻塞：`attempt 05 在安装前被 Claude 当前配置的不可识别模型 qwen3.7-plus[1m] 阻塞并已完整恢复；该事实保留，但按用户当前要求不再是 T8 的完成条件。`
  - 外部写入：`本轮无；历史已授权写入均已恢复并由收据证明 delta=0。`
  - 完成：`无模型审计证据包与仓库静态门禁全绿；不要求当前宿主安装或 fresh runtime，也不产生相应声明。`

### 检查点 D

- [x] source、历史真实 pre-state／候选 cache、未验证的当前宿主／fresh runtime、runs evidence 和费用分别报告。
- [x] 历史失败的双宿主恢复收据通过；当前 T8 依据无模型候选证据审计通过。
- [x] 候选包、行为合同、恢复与审计收据完整可复算；历史失败现场继续保留。
- [x] `Production: NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED`，审计 PASS 不替代当前宿主、fresh runtime 或生产证据。
- [x] 没有产品提交、推送、发布或部署；仅 2 个失败现场内 disposable fixture baseline commit。

## 完成门

- [x] 已批准 SPEC 的全部可衡量验收标准映射到任务或检查点。
- [x] 全部任务字段、依赖、attempt／基线／验证收据、失败保留和主 Agent todo 责任可复核。
- [x] 放弃功能时仍使用 T0 恢复计划引入的产品／测试改动（含 T1）；T8 历史宿主写入均已恢复真实 pre-state。
- [x] 后续 `@review`／`@ship` 仍需显式调用；计划完成不自动产生提交、安装、发布或部署授权。
