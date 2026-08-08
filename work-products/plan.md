# 实施计划：`C:\Code` Python 虚拟环境修复与全局 pip 清理准备

日期：2026-08-08
执行入口：后续经批准使用 `@build` 逐任务执行；只有 `@build auto` 才可连续执行稳定阶段。
当前状态：任务 1-18 已执行；FakeShield 两套 WSL2 环境与 CUDA 扩展 smoke 已通过，两套全局 Python 的高置信 pip 清理已完成。

## 1. 规划依据

本计划以以下证据为基础，目标、范围、安全边界和可验证结果已经足够明确，不需要新增规格：

- 用户要求检查 `C:\Code` 下全部项目，修复应使用但缺失或损坏的项目虚拟环境，并记录项目所用 pip 库，为后续清理本机全局 pip 环境提供依据。
- `work-products/SPEC.md` 已批准项目本地环境优先、默认 `.venv/`、外部环境修改需单独授权、环境边界不清时停止等统一约束。
- 2026-08-08 只读审计覆盖 27 个顶层目录、12 个含 Python 的目录和 1,013 个非虚拟环境 `.py` 文件；发现 6 个健康环境、2 个损坏环境和 8 个明确缺失环境的工作区。
- 当前全局 Python 3.12 `pip check` 失败：`opencv-python-headless 4.13.0.92` 与 `tifffile 2026.5.15` 要求 NumPy 2.x，而现有 `numpy 1.26.4`；Python 3.14 全局环境 `pip check` 通过。

本计划只规划后续修改。本次 `@plan` 不创建或删除 `.venv/`，不安装、升级或卸载包，不执行项目业务入口，不修改全局 Python。

## 2. 目标与完成定义

完成后应满足：

1. 每个需要第三方 Python 包的可运行项目或独立子项目都有明确、项目本地且被忽略的环境路径；Windows 默认使用 `.venv\Scripts\python.exe`，POSIX 使用 `.venv/bin/python`。
2. 每个环境都有可审查的直接依赖事实源；禁止只依赖全局 `site-packages`、隐式传递依赖或文档中的裸 `pip install`。
3. 新建或修复环境通过解释器启动、`python -m pip check`、关键依赖导入及该项目适用的现有测试或无副作用 smoke 验证。
4. 损坏环境仅在确认目标为项目内真实目录且不是链接或重解析点后处理；先同目录备份，失败恢复，成功验证后才可删除备份。
5. GMSSL 云、边、端三侧均不在本机运行：cloud/edge 在明确审批前保持目标主机未执行，端侧为嵌入式固件且不使用 Python；本机 root/attack/model 环境只作工具、攻击验证与训练开发。Watermark 已按批准旧版路线验收，FakeShield 已按批准 WSL2 路线完成单 GPU CUDA 扩展 smoke。不以 Windows 静态检查替代 Linux、CUDA、NPU 或旧 Python 运行证据。
6. 全局 pip 清理前保存可回滚快照，完成 `C:\Code` 外使用者审计，并获得单独的卸载授权；虚拟环境修复本身不授权全局卸载。

## 3. 已确认环境矩阵

### 3.1 保留并验证

| 环境 | 当前状态 | 直接依赖来源 |
|---|---|---|
| `AShareQuantFusion/.venv` | Python 3.12.13，`pip check` 通过 | `requirements.txt`、`requirements-dev.txt` |
| `BestCfCdn/.venv` | Python 3.12.10，`pip check` 通过 | `requirements.txt` 与 setup 的 Brotli 合同 |
| `GMSSL/attack/.venv` | Python 3.12.10，`pip check` 通过 | `attack/requirements.txt` |
| `GMSSL/model_training/.venv` | Python 3.12.10，`pip check` 通过 | 当前仅能由静态导入和已安装包恢复，缺正式清单 |
| `MarkItDown/.venv` | Python 3.12.10，`pip check` 通过 | 各 package 的 `pyproject.toml` |
| `Study/Python/IA_1/venv` | Python 3.14.5，`pip check` 通过 | 当前为 `requests`、`beautifulsoup4`，缺正式清单 |

健康环境的 `pyvenv.cfg` 中部分 `command` 字段仍记录迁移前路径，但解释器可启动；不得只因该元数据陈旧而重建。

### 3.2 需要新建

- `BingSitemapSubmit/.venv`
- `ProxySever/.venv`
- `GetURLScheme/.venv`
- `Study/Python/IA_2/.venv`
- `Study/Python/IA_Plus_1/.venv`
- `Study/Python/IA_Plus_2/.venv`
- `EditBanana/.venv`
- `Competitions/MingZhen/FakeShield-main/DTE-FDM/.venv` 与 `MFLM/.venv`，已在批准的 Ubuntu 20.04 / CUDA 11.6.2 目标创建并验证

### 3.3 损坏或平台限定

- `Competitions/AIGC/watermark/.venv`：原环境指向已不存在的 Acer Python 3.14；现已按批准路线用项目内 NuGet CPython 3.7.9 离线重建，旧坏环境保留为同目录备份。
- `Study/OS/LessonTask1/.venv`：已损坏，但源码只使用标准库；不重建，后续仅在精确确认路径并获得删除授权后清理。
- `GMSSL/cloud_layer/.venv`、`GMSSL/edge_layer/.venv`：分别由云端 VPS 和边缘 Orange Pi 的 setup 在部署主机创建；Windows checkout 缺失不等于缺陷。`device_layer` 为端侧固件，不创建 Python 环境。

### 3.4 不需要环境

- `ACM`、`Shadowrocket` 当前只使用 Python 标准库。
- 其余 15 个顶层目录未发现 Python 文件。

## 4. 依赖图与执行顺序

```text
任务 1 全局与项目基线快照
  ├─> 任务 2 BingSitemapSubmit
  ├─> 任务 3 ProxySever
  ├─> 任务 4 GetURLScheme
  ├─> 任务 5 Study 各作业环境
  ├─> 任务 7 EditBanana 依赖合同 ─> 任务 8 EditBanana 环境
  ├─> 任务 9 GMSSL 清单 ─> 任务 10 GMSSL 平台验证
  ├─> 任务 11 健康环境清单漂移
  ├─> 任务 12 Watermark 兼容决策 ─审批─> 任务 13 Watermark 修复
  └─> 任务 14 FakeShield 兼容决策 ─审批─> 任务 15 FakeShield 环境

任务 2-5 ─> 检查点 A
任务 7-11 ─> 检查点 B
任务 12-15 ─> 检查点 C
检查点 A/B/C ─> 任务 16 跨项目复核
任务 16 ─> 任务 17 全局 pip 清理候选报告
任务 17 ─单独授权─> 任务 18 全局 pip 清理
```

任务 2、3、4 可在任务 1 后独立执行；Study、EditBanana、GMSSL 也可在各自事实源固定后独立验证。任何共享全局 Python 的修改必须串行并推迟到任务 18。

## 5. 任务明细

### 任务 1：持久化只读基线与回滚快照

**范围**

- 在 `work-products/reviews/` 记录 27 个目录的 Python 环境矩阵、项目直接依赖映射、`py -0p`、两个全局解释器的 `pip freeze --all`、`pip list --not-required` 和 `pip check` 输出。
- 记录所有现有 `pyvenv.cfg`、环境解释器版本、环境内顶层包及 `pip check` 结果。
- 快照不得包含凭据、环境变量值、私有索引 Token 或项目数据。

**验收标准**

- 基线能区分“健康、损坏、缺失、标准库无需环境、平台限定”五类。
- 两个全局解释器和六个健康环境都有精确版本及完整包快照。
- 当前 Python 3.12 冲突被原样记录，不在本任务修复。

**验证**

```powershell
py -0p
py -3.12 -m pip freeze --all
py -3.12 -m pip list --not-required
py -3.12 -m pip check
py -3.14 -m pip freeze --all
py -3.14 -m pip list --not-required
py -3.14 -m pip check
```

**回滚**：只新增本地审计记录；删除本任务新建的 `work-products/reviews/` 文件即可，不触碰环境。

### 任务 2：隔离 BingSitemapSubmit

**范围**

- 新增最小直接依赖清单，仅声明 `requests`。
- 确认 `.venv/` 被本项目忽略，再用 Python 3.12 创建根环境并通过项目解释器安装。
- 文档或运行说明若存在裸 `python`/`pip`，改为项目解释器路径和 `python -m pip`。

**验收标准**

- 不依赖全局 `requests` 即可导入。
- `pip check` 通过，依赖清单不包含无关包。
- 不执行真实 sitemap 提交或网络请求。

**验证**

```powershell
& .\.venv\Scripts\python.exe -m pip check
& .\.venv\Scripts\python.exe -I -c "import requests"
& .\.venv\Scripts\python.exe -m py_compile main.py
```

**回滚**：删除本任务新建且经路径确认的 `.venv/`，恢复本任务修改的清单与文档。

### 任务 3：隔离 ProxySever

**范围**

- 在项目根新增最小依赖清单：`requests`、`beautifulsoup4`。
- 创建根 `.venv`，统一供含第三方依赖的规则脚本使用；纯标准库脚本不复制环境。
- 不运行下载、规则更新或网络测试。

**验收标准**

- 项目环境可导入 `requests` 与 `bs4`。
- 标准库脚本继续不需要额外依赖。
- `.venv/` 被忽略且没有环境文件进入 Git 候选。

**验证**

```powershell
& .\.venv\Scripts\python.exe -m pip check
& .\.venv\Scripts\python.exe -I -c "import requests, bs4"
Get-ChildItem -Recurse -Filter *.py | ForEach-Object { & .\.venv\Scripts\python.exe -m py_compile $_.FullName }
```

**回滚**：仅移除精确项目根下新建环境并恢复清单；不删除脚本生成物或规则数据。

### 任务 4：隔离 GetURLScheme 的运行与构建依赖

**范围**

- 保留运行依赖 `customtkinter`、`Pillow`。
- 将 `PyInstaller` 记录为开发/构建依赖，不混入最小运行清单。
- 创建根 `.venv`；重建产物不属于本任务，旧 `build/` 证据不删除。

**验收标准**

- 运行环境可导入 `customtkinter` 和 `PIL`。
- 构建依赖有独立事实源，且能在项目环境中找到 PyInstaller。
- 不启动 GUI，不覆盖现有构建产物。

**验证**

```powershell
& .\.venv\Scripts\python.exe -m pip check
& .\.venv\Scripts\python.exe -I -c "import customtkinter, PIL"
& .\.venv\Scripts\python.exe -m PyInstaller --version
& .\.venv\Scripts\python.exe -m py_compile main.py
```

**回滚**：移除新建环境与新增构建清单；保留原 `build/`、`dist/` 和用户文件。

### 任务 5：隔离 Study 的独立作业

**范围**

- 为 `IA_1` 补充依赖清单但复用健康 `venv/`，不强制改名。
- 为 `IA_2` 创建 `.venv`，直接依赖为 `requests`、`beautifulsoup4`、`matplotlib`、`python-docx`。
- 为 `IA_Plus_1`、`IA_Plus_2` 分别创建 `.venv`，直接依赖为 `mindspore`、`numpy`、`matplotlib`、`python-docx`。
- `OS/LessonTask1` 不重建环境；只记录坏环境为待授权清理项。

**验收标准**

- 四个第三方依赖作业目录各自有清单和可用解释器，不共享父目录或全局包。
- MindSpore 作业使用已验证兼容的 Python 3.12 与明确版本，不从当前全局环境隐式继承。
- 不下载数据集、不训练模型、不生成或覆盖课程报告。

**验证**

```powershell
& .\Python\IA_1\venv\Scripts\python.exe -m pip check
& .\Python\IA_1\venv\Scripts\python.exe -I -c "import requests, bs4"
& .\Python\IA_2\.venv\Scripts\python.exe -I -c "import requests, bs4, matplotlib, docx"
& .\Python\IA_Plus_1\.venv\Scripts\python.exe -I -c "import mindspore, numpy, matplotlib, docx"
& .\Python\IA_Plus_2\.venv\Scripts\python.exe -I -c "import mindspore, numpy, matplotlib, docx"
```

**回滚**：按作业目录分别删除本任务新建环境和清单；绝不删除数据集、报告、图片或损坏的 `LessonTask1/.venv`，除非另获删除授权。

### 检查点 A：低风险 Windows 项目

- 任务 2-5 的环境均使用项目解释器通过 `pip check` 和无副作用导入验证。
- 全局 Python 包和版本未改变。
- 没有执行网络提交、下载、GUI、训练或报告生成。
- 经人工确认后再继续大型或平台敏感项目。

### 任务 6：复核低风险项目依赖闭包

**范围**

- 对任务 2-5 执行 `pip list --not-required`、静态导入与清单对照。
- 直接导入必须直接声明；传递依赖不得因“目前碰巧安装”而省略。
- 将结果追加到中央环境清单。

**验收标准**

- 每个直接第三方导入能映射到清单中的分发包。
- 未把标准库、项目内模块或无关全局包误写入清单。

**验证**：逐项目重复静态导入扫描、`pip check` 和关键导入 smoke。

**回滚**：仅回退错误的清单修订；不重建已验证环境。

### 任务 7：固定 EditBanana 的依赖配置

**范围**

- 明确一个根 `.venv` 供主程序、`sam3` 和 `sam3_service` 共用，符合现有 service 文档。
- 将依赖划分为：core、SAM3 runtime、service、OCR 可选、RMBG 可选、notebooks/dev/train。
- 固定 PyTorch/torchvision 与 CPU/CUDA 选择规则；禁止一次安装全部大型可选依赖。
- 把文档和脚本中的裸 `pip` 改为根环境解释器的 `python -m pip`。

**验收标准**

- 每个功能配置有唯一安装命令和清晰依赖来源。
- `sam3_service` 不创建第二套环境。
- PaddleOCR、Pix2Text、ONNX Runtime、ModelScope、训练依赖保持显式可选。

**验证**：静态对照 `requirements.txt`、`sam3/pyproject.toml`、service 清单及三个 README 安装段；本任务不安装包。

**回滚**：恢复依赖文件和文档；由于本任务不创建环境，无环境回滚。

### 任务 8：创建并验证 EditBanana 根环境

**依赖**：任务 7。

**范围**

- 先安装 core、PyTorch/torchvision、SAM3 editable 包和 service 依赖。
- 只安装用户明确选择的可选功能组。
- 不下载模型权重，不登录 Hugging Face/ModelScope，不启动 API 服务。

**验收标准**

- `pip check` 通过。
- core、SAM3、service 的关键模块均能导入。
- 环境安装清单与实际顶层包被记录。

**验证**

```powershell
& .\.venv\Scripts\python.exe -m pip check
& .\.venv\Scripts\python.exe -I -c "import cv2, fastapi, numpy, PIL, requests, torch, torchvision, yaml"
& .\.venv\Scripts\python.exe -I -c "import sam3"
```

如仓库已有无网络单元测试，再使用项目解释器运行；不得以模型下载失败替代环境验证。

**回滚**：失败时保留安装日志，删除精确根 `.venv` 后重建；不得修改模型缓存或全局 Torch。

### 任务 9：补齐 GMSSL 的环境事实源

**范围**

- 为 `model_training` 增加直接依赖清单：`torch`、`pandas`、`numpy`、`scikit-learn`、`joblib`，版本以当前健康环境和模型兼容性为依据。
- 为本地 `tools/` 建立独立 tooling 依赖清单：`paramiko`、`psycopg`、`werkzeug`；决定使用根 `.venv`，不复用 attack/model 环境。
- 把 cloud/edge setup 内嵌依赖同步为可审查清单或由合同测试确保二者一致，但不改变目标部署语义。

**验收标准**

- 四个边界 attack、model、cloud、edge 和本地 tooling 的依赖互不含混。
- 根 tooling 环境不包含训练或部署运行时的大型包。
- 不执行 SSH、部署、服务控制或目标主机操作。

**验证**：静态导入与清单对照；现有 `attack`、`model_training` 环境继续 `pip check` 通过。

**回滚**：恢复清单和合同测试；不碰现有健康环境。

### 任务 10：验证 GMSSL 本地与目标平台环境

**依赖**：任务 9。

**范围**

- 在 Windows 创建并验证根 tooling `.venv`，只运行无网络导入和现有本地测试。
- cloud/edge 环境只能在批准的 Linux/Orange Pi 目标或等价 VM 中由官方 setup 创建。
- Windows 静态检查只证明脚本合同，不证明 systemd、PostgreSQL、Mosquitto、GmSSL CLI、RKNN/NPU 或真实服务。

**验收标准**

- tooling 环境可导入 `paramiko`、`psycopg`、`werkzeug`。
- cloud/edge setup 明确使用各自项目内 `.venv`，无外部 pip 修改。
- 平台验证状态分别标注为通过、失败或未执行。

**验证**

```powershell
& .\.venv\Scripts\python.exe -m pip check
& .\.venv\Scripts\python.exe -I -c "import paramiko, psycopg, werkzeug"
```

POSIX 验证命令必须在对应目标环境中另行记录。

**回滚**：本地 tooling 环境可精确删除；目标平台 setup 需采用其项目自带回滚流程，禁止从 Windows 远程猜测性删除。

### 任务 11：修正健康环境的直接依赖漂移

**范围**

- AShareQuantFusion：复核直接导入的 `openpyxl` 等是否应直接声明。
- BestCfCdn：复核直接导入的 `urllib3` 与 setup 要求的 Brotli 实现是否应写入清单。
- MarkItDown：确认根环境对应 `markitdown[all]` 与实际开发用途。
- 只在事实源缺失时修订清单，不因 `pyvenv.cfg command` 的旧路径重建健康环境。

**验收标准**

- 直接导入与依赖清单一致。
- 六个既有健康环境仍可启动且 `pip check` 通过。
- 未运行 AShare 训练、BestCfCdn 网络测速或 MarkItDown 外部服务。

**验证**：各仓库项目解释器执行 `pip check`、关键导入及适用的现有本地测试；遵守各仓库 `AGENTS.md`。

**回滚**：只回退清单修订，不删除健康环境。

### 检查点 B：大型项目与健康环境

- EditBanana root 环境和 GMSSL tooling 环境通过。
- GMSSL cloud/edge 的静态、Linux、NPU 证据被清楚分层。
- 六个原健康环境未被无理由重建。
- 所有依赖事实源与直接导入一致。

### 任务 12：决定 Watermark 的兼容路线

**范围**

- 根据官方包元数据核对 `tensorflow==1.13.1`、现有 PyTorch 代码和 Windows/Linux 支持矩阵。
- 区分：复现旧环境、将 TensorFlow 与 PyTorch 脚本拆环境、或现代化依赖。现代化属于行为兼容变更，必须先更新规格并批准。
- 补齐当前清单遗漏的 Flask、Flask-Cors、Kornia、LPIPS、Matplotlib、MoviePy、SciPy、Torch、TorchVision、PyTorch-Wavelets、TorchGeometry 等实际直接依赖。

**验收标准**

- 形成唯一推荐解释器、平台和依赖组合。
- 明确哪些脚本属于 TensorFlow、PyTorch 或 Web 边界。
- 未获用户批准前不创建替代环境、不删除损坏环境。

**验证**：官方兼容元数据、静态导入和入口映射相互一致。

**回滚**：本任务仅产生决策记录和清单草案，可直接回退；旧坏环境保持原样。

### 任务 13：安全修复 Watermark 环境

**依赖**：任务 12 的路线获得明确批准。

**范围**

- 验证旧 `.venv` 是项目内真实目录且非重解析点。
- 将其改名为同目录唯一备份，再按批准的解释器和平台创建新 `.venv`。
- 安装经批准的依赖组合并执行分边界导入；成功后才申请删除备份。

**验收标准**

- 新环境解释器、pip、依赖导入和适用 smoke 测试通过。
- 创建失败时旧环境目录被恢复；不存在“半修复”状态。
- 不把当前 Python 3.14 当作默认兼容解释器。

**验证**：`pip check`、TensorFlow/PyTorch/Web 分组导入和无数据副作用的入口检查。

**回滚**：删除失败的新环境并原子恢复备份；删除旧备份需要另行确认。

### 任务 14：决定 FakeShield 的平台与锁定策略

**范围**

- 核对 PyTorch、CUDA、FlashAttention、DeepSpeed、MMCV/MMDetection、LLaVA/DTE-FDM 的兼容矩阵。
- 将约百项冻结清单区分为直接依赖、传递锁定、子项目 editable 安装和运行时脚本临时切换。
- 取消“脚本运行期间裸 `pip install` 切换 Transformers”的设计，改为预先建立的确定环境或明确拆分环境方案。

**验收标准**

- 形成唯一目标平台、Python、CUDA 与安装顺序。
- 明确是单环境还是按模型拆分；不得静默选择。
- Windows 不支持的 GPU 构建步骤标记为未执行而不是通过。

**验证**：官方兼容元数据、现有 `requirements.txt`、DTE-FDM `pyproject.toml` 与 shell 脚本一致性检查。

**回滚**：本任务仅修改计划/依赖合同草案时可直接回退，不创建环境。

### 任务 15：创建并验证 FakeShield 环境

**依赖**：任务 14 的方案获得明确批准，并提供相符平台。

**执行状态**：已完成。两套 Python 3.9.25 环境分别通过 `pip check`、lock 一致性、关键导入与 RTX 4060 CUDA 扩展 smoke；未下载模型/数据，未启动服务、推理或训练。

**范围**

- 在已批准的拆分路径 `DTE-FDM/.venv` 与 `MFLM/.venv` 创建环境。
- 严格按批准顺序安装 PyTorch/CUDA 基础、MMCV/MMDetection、DTE-FDM editable 包及训练可选项。
- 不下载模型、不启动 Gradio/API、不运行训练。

**验收标准**

- `pip check` 通过，关键模块可导入。
- shell 脚本不再运行时修改活动环境。
- GPU 能力和扩展加载在目标平台独立验证。

**验证**：环境信息、`pip check`、关键导入、CUDA/FlashAttention 只读能力检查及仓库已有无数据副作用测试。

**回滚**：删除精确新环境或恢复预先备份；模型、数据集和外部缓存不删除。

### 检查点 C：遗留 AI 环境

- Watermark 与 FakeShield 都有经批准的兼容矩阵。
- 损坏环境采用备份—创建—验证—清理顺序。
- 未把现代化升级伪装成环境修复。
- GPU/Linux/NPU 证据与 Windows 静态证据分开记录。

### 任务 16：跨项目环境复核

**范围**

- 重新扫描 27 个顶层目录的 Python 文件、依赖事实源、环境路径、`pyvenv.cfg` 和裸 `python`/`pip` 调用。
- 确认所有新增 `.venv/` 均被对应仓库忽略，且不存在链接、重解析点或项目外目标。
- 更新中央环境矩阵，标注每个项目通过、失败、未执行或无需环境。

**验收标准**

- 除明确豁免的标准库项目和平台未执行项外，没有第三方依赖项目继续依赖全局 pip。
- 无新增环境文件被 Git 跟踪。
- 每个项目的验证证据能由清单中的命令重放。

**验证**：重新执行只读清单脚本、各环境 `pip check`、关键导入及各 Git 仓库 `git diff --check`。

**回滚**：本任务只修订报告；发现缺陷返回对应任务，不做跨项目批量删除。

### 任务 17：生成全局 pip 清理候选报告

**依赖**：任务 16 全部适用项目完成。

**范围**

- 将任务 1 的两个全局 freeze 与修复后项目环境映射对照。
- 先审计 `C:\Code` 外脚本、IDE、Codex/Claude 工具、pipx 和用户自动化是否依赖全局包。
- 将候选分为：可卸载、仍被外部使用、依赖归属不明、基础工具保留。

**验收标准**

- 每个拟卸载顶层包都有“项目已迁移”和“`C:\Code` 外无使用者”两项证据。
- `pip`、`setuptools`、`wheel`、解释器和 Windows 系统集成包默认保留。
- Python 3.12 当前冲突被作为重建或清理输入，不在报告阶段修复。

**验证**：静态引用扫描、命令入口扫描、`pip show` 反向依赖和两个全局 `pip check`。

**回滚**：只生成报告，无系统变更。

### 任务 18：经单独授权清理全局 pip

**依赖**：任务 17 报告获用户逐项批准。

**执行状态**：已完成用户逐批批准的清理。Python 3.12 两轮共卸载 28 包，freeze 97→69；Python 3.14 卸载 15 包，freeze 107→92。条件式工具栈与共享缓存未修改，既有 NumPy 冲突未扩大也未修复。

**范围**

- 按解释器和小批次卸载已批准的顶层包；不自动递归删除所有传递依赖。
- 每批后运行 `pip check`、项目环境 smoke 和已知外部工具检查。
- 如果 Python 3.12 依赖图无法安全收敛，优先建议重建全局解释器，而不是反复原地升级 NumPy。

**验收标准**

- 只卸载批准清单中的包。
- 所有项目仍使用自己的解释器并通过既定验证。
- 全局环境最终 `pip check` 通过，或明确记录为保持未修改的 NO-GO。

**验证**：每批前后保存 `pip freeze --all`，运行 `pip check`、`pip list --not-required` 和任务 16 的跨项目 smoke 集。

**回滚**：使用任务 1 的精确 freeze 在对应全局解释器恢复已卸载包；恢复失败立即停止后续批次。解释器卸载、重装或系统 PATH 修改需要新的明确授权。

## 6. 测试与产物位置约束

- 若某个 Git 项目需要新增持久合同测试，放在该项目自己的 `work-products/tests/`，测试中的仓库引用必须相对最终位置。
- 不在 `C:\Code` 根目录创建通用脚本或隐藏兼容层。
- 环境清单和机器快照保存在 `C:\Code\UXUCode\work-products\reviews/`，作为本机过程证据；各项目的依赖文件才是长期事实源。
- 不提交 `.venv/`、全局 freeze 中的本机绝对路径、凭据或私有索引信息。

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| Watermark 的 TensorFlow 1.13.1 与当前解释器不兼容 | 高 | 已使用项目内 CPython 3.7.9 隔离复现并保留旧环境备份；不升级或复用全局解释器 |
| FakeShield 的 CUDA/FlashAttention/MMCV 组合不一致 | 高 | 已固定平台、Python、CUDA 与安装顺序，并以 bitsandbytes、FlashAttention、MMCV 三项真实 GPU smoke 验证 |
| 把 GMSSL Windows 静态结果当成 Linux/NPU 通过 | 高 | 平台证据分层，目标 setup 独立验收 |
| 删除损坏环境后无法恢复 | 高 | 项目内真实目录检查、同目录备份、失败原子恢复 |
| 全局清理破坏 `C:\Code` 外工具 | 高 | 先做全机使用者审计并逐项授权 |
| 传递依赖被误当成直接依赖或被遗漏 | 中 | 静态导入、清单与环境元数据三方对照 |
| 大型可选依赖使 EditBanana 环境膨胀 | 中 | core/service/SAM3/可选组分层，只安装选定组 |
| 迁移前路径仍存在于 `pyvenv.cfg command` | 低 | 以解释器实际启动和 `pip check` 为准，不无理由重建 |

## 8. 未决决策与人工批准门

1. Watermark 已批准并完成 Windows x64 / Python 3.7.9 / CPU / 单环境旧版复现；BCH 写回与 torchgeometry 几何等价另列业务风险。
2. FakeShield 本机 WSL 2 / Ubuntu 20.04 / CUDA 11.6.2 的单 GPU 环境与扩展 smoke 已执行通过；四 GPU 训练、模型/数据、服务和推理仍未授权/未执行。
3. GMSSL 是否另行授权连接云端 VPS、边缘 Orange Pi 做真实环境验收；未授权时两侧保持“未执行”。端侧 STM32 不属于 Python 环境审计。
4. EditBanana 需要启用哪些可选组：PaddleOCR、Pix2Text、RMBG、notebooks、train/dev。
5. 任务 18 的高置信全局 pip 清理已逐批获得授权并完成；继续清理条件式工具栈、共享缓存或修复 NumPy 冲突仍需新的明确授权。

## 9. 最终验证门

```powershell
# UXUCode 计划文件门禁
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check

# 每个实际修改的 Git 项目
git -c safe.directory=<project-path> diff --check

# 每个创建或修复的环境
& <project>\.venv\Scripts\python.exe -m pip check
& <project>\.venv\Scripts\python.exe -I -c "<关键依赖导入>"
```

适用项目环境已通过，平台未执行项已明确标注，跨项目扫描未发现全局依赖遗漏；本轮逐批批准的全局 pip 清理完成后仍须通过上述最终门禁，才可判定任务 1-18 完成。
