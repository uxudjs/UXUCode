# `C:\Code` Python 虚拟环境修复待办

日期：2026-08-08
执行规则：`@build` 每次只执行下一项；仅 `@build auto` 可连续执行已稳定且无人工批准门的任务。

## 阶段 1：基线与低风险项目

- [x] 任务 1：在 `work-products/reviews/` 保存全局解释器、项目环境、直接依赖与 `pip check` 回滚基线；不修复当前冲突。两份 freeze 与当前解释器逐行一致。
- [x] 任务 2：为 `BingSitemapSubmit` 建立最小 `requests` 清单和根 `.venv`；`requests 2.34.2`、`pip check` 与源码编译验证通过，未执行网络提交。
- [x] 任务 3：为 `ProxySever` 建立 `requests`、`beautifulsoup4` 清单和根 `.venv`；`pip check`、依赖导入及 6 个源码文件编译通过，未运行规则下载。
- [x] 任务 4：为 `GetURLScheme` 分离运行与 PyInstaller 构建依赖并创建根 `.venv`，不启动 GUI、不重建产物；确认首次失败是安装完成前校验造成的中间态误判，完整等待安装进程后验收通过，见 `work-products/debug/geturlscheme-install-2026-08-08.md`。
- [x] 任务 5：补齐 `Study/Python/IA_1` 清单，为 IA_2、IA_Plus_1、IA_Plus_2 分别创建环境；MindSpore 固定 2.9.0，四个作业均通过 `pip check`、关键导入和源码编译，未重建或删除 `LessonTask1` 坏环境。
- [x] 检查点 A：任务 2-5 的七个项目解释器、`pip check`、关键导入和忽略规则均通过；Python 3.12/3.14 全局 freeze 未改变。
- [x] 任务 6：复核低风险项目直接导入与依赖清单闭包并更新中央环境矩阵；运行、构建及 MindSpore 版本边界均有事实源。

## 阶段 2：大型项目与健康环境

- [x] 任务 7：固定 EditBanana 的 core、PyTorch CPU/CUDA、SAM3、service、PaddleOCR、公式、RMBG、ModelScope 与 SAM3 notebooks/dev/train 依赖边界；根文档和启动脚本只使用项目解释器，静态合同与脚本语法验证通过，本任务未创建环境。
- [x] 任务 8：已创建 EditBanana 单一根 `.venv`，安装 core、PyTorch CPU、SAM3 与 service；未安装可选大依赖、下载模型或启动服务，SAM3 CPU 回退与现有 8 项单元测试通过。
- [x] 任务 9：已补齐 GMSSL model、tooling、cloud、edge 的依赖事实源；根合同测试锁定 cloud/edge setup 内嵌依赖，未修改或同步部署目录。
- [x] 任务 10：已创建并验证 GMSSL 本机 checkout 的 tooling `.venv`；补充复核修复 3 个 setup 脚本的当前工作树 CRLF，5 项合同测试与 WSL `bash -n` 通过。以上不代表运行侧：云端 VPS、边缘 Orange Pi 与端侧 STM32 均未做实机验收。
- [x] 任务 11：已复核六个原健康环境；AShare 补充 Excel 引擎直接依赖，BestCfCdn 补充 urllib3 并保留 Brotli 二选一 setup 合同，MarkItDown 确认为 `markitdown[all]` 用途；未重建环境。
- [x] 检查点 B：EditBanana 与 GMSSL tooling 环境通过，六个原健康环境保持健康，Windows 静态证据与 Linux/Orange Pi/NPU 未执行状态已分层。

## 阶段 3：遗留 AI 环境

- [x] 任务 12：已确定 Watermark 首选为 Windows x64 / Python 3.7.9 / CPU / 单环境旧版复现，并记录完整候选依赖与缺失 LPIPS 子模块；未改动坏环境。
- [x] 人工批准门：已批准 Watermark 项目内 NuGet Python 3.7.9 旧环境复现。
- [x] 任务 13：已备份旧坏环境并离线重建 Watermark 根 `.venv`；解释器、`pip check`、59 项 lock、TF1/PyTorch/DWT/BCH/LPIPS/源码 smoke 通过。
- [x] 任务 14：已纠正 FakeShield 平台矩阵，首选为 CUDA 11.6.2 官方支持的 Ubuntu 20.04 / Python 3.9 / Torch 1.13.0+cu116，并按 DTE-FDM 与 MFLM 拆分两环境；记录 Transformers 冲突、扩展构建顺序及脚本迁移方案。
- [x] 人工批准门：已确认 FakeShield 目标平台和安装方案。
- [x] 系统改造执行门：2026-08-08 已明确批准执行本机 WSL 系统改造单，见 `work-products/reviews/fakeshield-wsl-system-change-plan.md`。
- [x] 来源修订门：已批准并使用微软 `aka.ms/wslubuntu2004` 官方 AppxBundle 安装同一 Ubuntu 20.04 发行版。
- [x] 名称修订门：已接受 Canonical 旧包的 WSL 显示名称 `Ubuntu`，以实机 `VERSION_ID=20.04` 为版本事实源；不为标签执行导出/导入和注销。
- [x] 任务 15：已在 WSL2 Ubuntu 20.04 创建 DTE-FDM/MFLM 两套 Python 3.9.25 环境；112/130 项 lock、两次 `pip check`、关键导入及 bitsandbytes/FlashAttention/MMCV 真实 GPU smoke 通过，未下载模型/数据、训练或运行时切换依赖。
- [x] 检查点 C：Watermark 与 FakeShield 均有批准兼容矩阵和实机验证；旧版复现、现代化、单 GPU smoke 与完整训练边界清晰。

## 阶段 4：复核与全局清理准备

- [x] 任务 16：完成态复核覆盖 27 个顶层目录、1,054 个非环境 `.py`、48 个依赖事实源与 19 个环境元数据；17 个活动环境均项目隔离，FakeShield 两套 WSL2 环境及 GMSSL shell 回归均通过。
- [x] 任务 17：已审计用户内容、Codex/Claude/QClaw、IDE、PATH、Launcher、pipx、定时任务、Startup 与当前进程，生成分解释器逐包候选报告；未执行卸载。
- [x] 人工批准门：用户先批准 Python 3.12 主环境 6 个精确候选，再批准 Python 3.12/3.14 两套环境的高置信孤立清理；条件式工具栈与共享缓存未授权。
- [x] 任务 18：Python 3.12 两轮共卸载 28 包（freeze 97→69），Python 3.14 卸载 15 包（107→92）；3.12 未新增 `pip check` 问题，3.14 `pip check` 通过，项目与保留模块 smoke 通过。

## 完成门

- [x] 所有需要第三方依赖的项目都有项目本地环境或明确的平台未执行状态。
- [x] 所有直接第三方导入都有依赖事实源，不依赖全局 `site-packages` 或隐式传递依赖。
- [x] 新建/修复环境均通过解释器启动、`pip check`、关键导入及适用测试。
- [x] 损坏环境修复保留可恢复路径，未删除未授权目录、数据、模型或缓存。
- [x] 全局 pip 在任务 18 前未修改；任务 18 只卸载用户逐批批准的 Python 3.12/3.14 高置信包，条件式工具栈与共享缓存保持不变。
- [x] `node scripts/validate-all.js` 在第二轮可信清理记录更新后通过（2026-08-08，12 阶段；96 + 30 项测试通过）。
- [x] UXUCode `git diff --check` 在第二轮可信清理记录更新后通过；此前 GMSSL `diff --check`、5 项环境合同测试和 WSL setup `bash -n` 也已通过（2026-08-08）。

## 当前未授权边界

- 不删除 Watermark 旧环境备份，不修改其已记录的 BCH 或 torchgeometry 业务行为。
- FakeShield WSL/Ubuntu/CUDA/Python/两套环境已完成；不改发行版名称、代理、Windows 驱动、Linux 驱动或系统 Python，不注销发行版。
- Python 3.12/3.14 已完成本次批准的高置信清理；不继续删除条件式 OCR/PDF/CLI 工具、归属不明/仍被使用的包或共享 pip 缓存，也不修复既有 NumPy 冲突。
- 不运行业务网络提交、模型/数据下载、模型训练、GUI、API 服务、SSH、部署或 systemd 操作。
- GMSSL 本机 root/attack/model 环境只作开发工具验证；未经另行授权，不连接、同步或改造云端 VPS、边缘 Orange Pi 和端侧设备。
- 不暂存、提交、推送、发布或部署。
