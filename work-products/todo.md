# 普通批准与 SHA 完整性身份解耦：待办与状态账本

计划批准状态：已批准（2026-08-19）
候选展示日期：2026-08-19
计划批准收据：`2026-08-19T22:41:53+08:00；用户直接调用精确 @build auto，明确批准当前唯一且未漂移的计划并授权按计划连续串行执行；系统已从当前工作树原始 plan 字节重算并核对内部身份；用户未被要求提供或复述 SHA；不授权提交、推送、安装、联网、发布或部署。`

当前产品候选版本为 `5.0.24`。
批准实施目标候选版本为 `5.0.24`。

执行策略：serial
fast 请求：否
安全并发上限：1
状态账本 schema：2
结构事实源：`work-products/plan.md`
Plan SHA-256：`107ddcc8662a0a705650df27badeb7a58b0e387b2fc935a77082d807d73a7b3a`
计划身份来源：系统读取当前工作树 plan 原始字节并自行计算
唯一状态写入者：主 Agent

用户以整句自然语言明确批准当前唯一计划即可，无需查看、复制或复述 SHA。批准时系统必须重新读取 plan 原始字节并重算；只有当前值与本账本候选身份一致时，才可把批准状态、内部 plan SHA 和批准收据作为一次原子更新。`.uxucode-state.json` 的 planId 只做 session freshness／漂移检测，不是批准事实源。

计划批准本身不隐式执行 `@build`，也不授权 `@build auto`、提交、推送、联网、付费、训练、外部写入、发布、部署、插件重装或缓存修改。批准后仍须用户明确调用 `@build` 或 `@build auto`。

任务复选框是显式状态的派生镜像，必须与状态在同一次 todo 原子替换中更新：仅 `completed` 使用 `[x]`，`pending | in_progress | blocked` 使用 `[ ]`。每项开始前，主 Agent 原子记录 attempt、允许写入路径的 before-hash／缺失状态和改动归属；验证收据通过后才可 completed。遗留 `in_progress`、plan/todo 身份不一致、before-hash 漂移、收据缺失或归因不清均零 worker `BLOCKED`。

## W1：测试事实源与 RED

- [x] T1（W1）：解除活动 plan/todo 测试耦合并建立普通批准 RED。
  - 状态：completed
  - attempt：`T1-20260819T224259+0800`
  - 依赖：无
  - 允许写入：`work-products/tests/workflow-contract.test.js`、`work-products/tests/documentation-validator-contract.test.js`、本账本原子事务
  - before-hash／归属收据：`2026-08-19T22:42:59+08:00；plan=107ddcc8662a0a705650df27badeb7a58b0e387b2fc935a77082d807d73a7b3a；workflow-contract=4ede75d36695651711d8fc2b6486d691390b030387e0c0d3af7560f0bbedc4e8；documentation-validator-contract=db95c8a9644a8ff0d8c5e910b430f1b609fc07c0a5889cd29c69e73bfdace403；两个测试文件的既有 dirty 属于已完成 plan-fast debug 共享基线，本任务只追加第14节合同并删除活动 plan/todo 耦合。`
  - focused validation 收据：`2026-08-19T22:48:51+08:00；旧 live-artifact 筛选 RED=2 failed／1 passed，移除 release/version、历史依赖及 checkbox 直读后=1／1 PASS；新 ordinary approval 合同=3 个精确 RED（Skill、reference、docs）+ mutation PASS；既有 plan-fast 聚焦=13／13 PASS；workflow-contract=e89b6a51dd8f30d41ce82d1dc10d785a8077bcab992a4383de2127239154c55f；documentation-validator-contract=0d81ead934f27a7022878f3862a589f151c30696551fac2622b799c2c5698873；活动 plan/todo 读取与旧 helper 零命中；diff --check PASS。`
  - 完成条件：旧 live-artifact 耦合消失，只有新批准合同按预期 RED

### 检查点 A

- [x] 产品测试不再读取活动 plan/todo 的历史版本、任务号或状态。
- [x] 普通批准新合同 RED 可归因，现有 plan-fast／Hook 合同未退化。
- [x] 未新增 fixture、运行时 parser 或第二批准事实源。

## W2：公共 Skill

- [x] T2（W2）：实现 Claude/Codex 八个公共 Skill 的批准合同。
  - 状态：completed
  - attempt：`T2-20260819T224929+0800`
  - 依赖：T1、检查点 A
  - 允许写入：两宿主 `skills/{spec,plan,build,help}/SKILL.md`、本账本原子事务
  - before-hash／归属收据：`2026-08-19T22:49:29+08:00；Claude/Codex pairs byte-identical；spec=861dfffd0c31e6d25b254135b551001ff4c33d1fbb698f6b540cff8cfbcd9837；plan=e9192cc777c8e80f8def373522e15b52c84296916cf1abc5fba7ceef35a27e5a；build=26185ce2c2ee278b8a442764624b701c88cde790e25c679b2c1274ec740fd8e6；help=8536dfa36a442946fff9694c827f7580838bb6ddf4f75f08b324f9041881300e；plan/build 既有 dirty 属 plan-fast debug 基线，必须保留。`
  - focused validation 收据：`2026-08-19T22:52:44+08:00；ordinary approval skill contract=1／1 PASS；skill parity=20 aligned skills + 24 aligned internal workflow references PASS；plan-fast Skill 聚焦=3／3 PASS；plan-fast execution=5／5 PASS；diff --check PASS；Claude/Codex pairs byte-identical；spec=31225d9f98d146343929c61a504a20fc2d8626c0d79c5b13e57fd69b7492c98b；plan=7d2e55c47fbe384aa131534920e82cf941ebcb1c42a384c8322f3df73f91eae1；build=b50261a4e3deb4dd0391bc72170dcb5b6ec6351cb91265e0c394ad241dbf11bd；help=171d2e6e0c926b68b545dfbe55694a0c1accb2d57c1a885e07c1132c900f7cd7。`
  - 完成条件：Skill focused contract 与 skill parity GREEN，plan-fast 当前合同无回退

## W3：workflow/reference

- [x] T3（W3）：实现六个 workflow/reference 的职责分离。
  - 状态：completed
  - attempt：`T3-20260819T225244+0800`
  - 依赖：T2
  - 允许写入：两宿主 `spec-driven-development`、`planning-and-task-breakdown`、`orchestration-patterns` 六文件、本账本原子事务
  - before-hash／归属收据：`2026-08-19T22:52:44+08:00；Claude spec-driven=4c97c6a1cc40360110de142dbd89d9f84d4417a3cdbf25d56c8382acaf935ce4；Claude planning=741782345287c221b0c87bbd696497fcd46b168087658cb33a8b42aa2d26e1ef；Claude orchestration=fd42725da87085a2341175ed2fbd01292de9d233bc5cffdc9a9eedfc84eadb7a；Codex spec-driven=ae9306fd26c23cf459d1bbff7e13f4e4229ef570e8b79331de554952025725e8；Codex planning=f9cfe81e37b190802d3148edea20f7e0b50c6966f27b0b0fcb4172b961623453；Codex orchestration=4a051c09e551b1036d043dc92f115ab46829da1f2afdf047544f5420de1b7188；planning／orchestration 既有 dirty 属 plan-fast debug 基线，保留宿主语法与 worker 生命周期差异。`
  - focused validation 收据：`2026-08-19T22:54:04+08:00；ordinary approval reference contract=1／1 PASS；skill/reference parity=20 aligned skills + 24 aligned internal workflow references PASS；plan-fast reference 聚焦=3／3 PASS；plan-fast execution=5／5 PASS；diff --check PASS；Claude spec-driven=c9392be5f7c2b63fea3fd8bee3a10b17f1fbf1c78aa9d286a208f98f56936a7e；Claude planning=8360e8ae5039f77cff6aef479b33658203626cce7db66ca0616e0dee70af7a9c；Claude orchestration=f3a415b3ffeeff7e6d013c1b9123c1b6dc9708de79ef17e7afb8ae47e2b09738；Codex spec-driven=3692bcd62d1e6c3bf8b66e1b9d822d2c96b509d3fddca423482c8cbfa9cbc4f9；Codex planning=39ebfa741288369f088ec40fcbfb646e59588b6c9ba624ab447d363e5a4020a3；Codex orchestration=89b593d516a15599d8c39708c4ec3b2aa7c3d2fdefae9a161156d5b9dc7e6892；宿主语法／worker 差异保留。`
  - 完成条件：reference focused contract 与 parity GREEN，宿主语法／worker 差异保留

### 检查点 B

- [x] 8 个 Skill 与 6 个 reference 对普通批准、系统 SHA、fresh-session、漂移恢复和高风险例外语义一致。
- [x] Hook state 仍非批准账本；普通批准不扩权；合法 action-scoped 授权保持独立。

## W4：三语言文档

- [x] T4（W4）：同步三语言用户指南与文档校验器。
  - 状态：completed
  - attempt：`T4-20260819T225404+0800`
  - 依赖：T3、检查点 B
  - 允许写入：`docs/USAGE.zh-CN.md`、`docs/USAGE.zh-TW.md`、`docs/USAGE.en.md`、`scripts/validate-guide-parity.js`、本账本原子事务
  - before-hash／归属收据：`2026-08-19T22:54:04+08:00；zh-CN=6f083bab4e8b8a07c66d932b66dd07d0618c363f8f7d7eff5195034e61393635；zh-TW=0b7e8c3c6bf11d0e4e08a96a866f1923230bcf5d5e8cf57cd419d3e9942d3edc；en=346be7daba5d81e097af8737880ab421a621c39f3cb2baabd2689d9b258c7a05；validate-guide-parity=92bad96a7548bf4d6db2f1194e27fc5f9fbc35fdca4129fbbf5a9f0422f2bb7c；四文件既有 dirty 属 plan-fast debug 基线，本任务仅追加独立普通批准合同。`
  - focused validation 收据：`2026-08-19T22:55:23+08:00；ordinary approval documentation contract=1／1 PASS（逐 token mutation 证明 validator fail-closed）；plan-fast docs contract=1／1 PASS；guide parity PASS；diff --check PASS；zh-CN=12a021cafb1ca95f2b90d1f17bd21b65a8950bc38eeb69b546080507bf52ed53；zh-TW=3b6e7a359571f7b2ffffeda99faa89a8b0d24644a889bf7abd86eb38c0bed9bb；en=1e1abce1b8bd67b2cc05bf08dd63fe46784f8485bed13425fe88a21763101f04；validate-guide-parity=c870c83b4e91311f6f80f5cdf28074b43c17d511c4ec33111b53235dc61931f6；README 未修改。`
  - 完成条件：三语言 ordinary approval 合同与 guide parity GREEN，README 不变

## W5：版本与完整门禁

- [x] T5（W5）：原子同步 5.0.24 并执行完整静态门禁。
  - 状态：completed
  - attempt：`T5-20260819T225523+0800`
  - 依赖：T4
  - 允许写入：Claude manifest／marketplace／validator、Codex manifest／validator、`work-products/tests/workflow-contract.test.js` 版本断言、`work-products/SPEC.md` 当前候选元数据、本账本原子事务
  - before-hash／归属收据：`2026-08-19T22:55:23+08:00；Claude plugin=197f7bcadb64465b175eab7d0768ca81e9653ac9c60f1e8ff7bc11471ae54e93；Claude marketplace=697b9cb7d618f271505ced1a19450432c7fdddfbbc5948af234151e803364526；Codex plugin=bde1d97d43da66ae8108b4e853633625217b2599034f31a38ce341a5f2c5b617；Claude validator=c0c1ee6946eb5ba2ccc9df3935f4058b6eda3f1d8dd08441051ab6c3853457d8；Codex validator=74438195e06eb63eb53962ec7de7e0a60d9a016d19bab858be1a56ba2f15600c；workflow-contract=e89b6a51dd8f30d41ce82d1dc10d785a8077bcab992a4383de2127239154c55f（本任务 T1 dirty）；SPEC=242d1e548cff640bb2f4b17a47985f740c5ae3c604ac31393abafc48656363d3；todo=fbd9d9cf6153ac9d87fbfdf2a62e07e0cfcd3a4db879b09fe5a4207e0b2aa3cc。`
  - focused validation 收据：`2026-08-19T22:58:44+08:00；release metadata=1／1 PASS；mode-policy Hook 回归=36／36 PASS；Claude/Codex plugin validator 均 PASS；统一门禁在最终 SPEC 元数据后复跑并通过 13 阶段（workflow contracts=165／165，OpenClaw tests=34／34，plan-fast tracked contract PASS，内含 diff --check PASS）；六版本面精确为 5.0.24；Claude plugin=095e4b4b1317b8a143146c53dd3d31b3ea2b964c22fe1bf69235a6afbd2f0547；Claude marketplace=d7168585a6fef8441e48e2643a645e964468ab401b2a5fd9c829b873aa484031；Codex plugin=bcb0c74dcbeb475c77152456e381e41d93ea70672623fbcab815f3ce41c7320c；Claude validator=484d47e3d079e96dc8e2d1370c6b76ca9e287df2ff54d55fd8d7e55a683e535a；Codex validator=6461a49f731abd7cc593341d08b34dd0d46b872f4eee2751624391844504fcd2；workflow-contract=9ba4264a3ee2b6d8278a986b5c76352cb1f048ded6dd084b9e436ea28a1b4219；SPEC=ba6deaee51cdda0d3b7a5411f70d774d10896760e26887ea30645d920aa77ce7；plan 仍为批准身份 107ddcc8662a0a705650df27badeb7a58b0e387b2fc935a77082d807d73a7b3a。`
  - 完成条件：六版本事实面精确为 5.0.24，Hook 回归、两插件校验、统一门禁与 diff check 全绿

## 完成门

- [x] T1–T5 全部 completed，任务复选框与显式状态一致。
- [x] 普通批准不要求用户 SHA；系统重算、漂移 fail-closed 与 fresh-session 收据复用均有合同。
- [x] 普通批准不扩权，高风险 action-scoped 授权保持窄边界。
- [x] Claude/Codex、六个 reference、三语言和六版本事实面一致，plan-fast 当前合同无回退。
- [x] 统一门禁与 `diff --check` 全绿；cache／fresh host／真实宿主／生产仍按证据层级报告。
- [x] 未提交、推送、安装、登记、联网、付费、发布或部署。
