# CodeSkillHook

> 为 Claude Code 与 Codex CLI 分别构建的工程工作流技能与 Ponytail
> 极简主义 Hook。

### 🌐 选择语言 \| 選擇語言 \| Choose Language

-   [🇨🇳 简体中文](#-简体中文)
-   [🇹🇼 繁體中文](#-繁體中文)
-   [🇺🇸 English](#-english)

------------------------------------------------------------------------

## 🇨🇳 简体中文

CodeSkillHook 将软件工程全生命周期技能与 Ponytail
的"资深工程师极简模式"组合在一起。

自 `v2.0.0` 起，Claude Code 与 Codex CLI
完全分目录维护：两套清单、指令文件、技能、Hook
和运行时互不依赖，可以针对各自 CLI 独立演进。

### 主要功能

  🧠 完整工程工作流技能   🪶 Ponytail 极简工程模式     🔒 完全隔离架构
  ----------------------- ---------------------------- --------------------------------
  需求分析                避免过度设计                 Claude 与 Codex 不共享运行目录
  技术规格                优先解决真实需求             不使用符号链接
  项目规划                保持代码简单、可靠、可维护   可独立升级维护
  代码实现                                             
  测试验证                                             
  Code Review                                          
  性能优化                                             
  安全检查                                             
  发布与迁移                                           

### 目录结构

``` text
CodeSkillHook/
├── README.md
├── Claude/
│   ├── .claude-plugin/
│   ├── CLAUDE.md
│   ├── hooks/
│   ├── references/
│   ├── scripts/
│   └── skills/
└── Codex/
    ├── .codex-plugin/
    ├── AGENTS.md
    ├── hooks/
    ├── references/
    ├── scripts/
    └── skills/
```

### 安装

#### Claude Code

``` bash
claude --plugin-dir ./Claude
```

永久安装：

``` text
/plugin marketplace add ./Claude
/plugin install code-skill-hook@code-skill-hook-claude
```

技能调用：

``` text
/code-skill-hook:<skill-name>
```

#### Codex CLI

``` text
/plugin marketplace add ./Codex
/plugin install code-skill-hook@code-skill-hook-codex
```

技能调用：

``` text
@<skill-name>
```

查看 Hook：

``` text
/hooks
```

### 校验

``` bash
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

### 鸣谢

-   [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
-   [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
-   [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

------------------------------------------------------------------------

## 🇹🇼 繁體中文

CodeSkillHook 結合軟體工程全生命週期技能與 Ponytail 資深工程師極簡模式。

自 `v2.0.0` 起，Claude Code 與 Codex CLI
完全分開維護，並與簡體中文版內容保持一致。

### 主要功能

  🧠 完整工程工作流技能   🪶 Ponytail 極簡工程模式       🔒 完全隔離架構
  ----------------------- ------------------------------ --------------------------------
  需求分析                避免過度設計                   Claude 與 Codex 不共享執行目錄
  技術規格                優先解決真實需求               不使用符號連結
  專案規劃                保持程式碼簡單、可靠、可維護   可獨立升級維護
  程式實作                                               
  測試驗證                                               
  Code Review                                            
  效能優化                                               
  安全檢查                                               
  發布與遷移                                             

------------------------------------------------------------------------

## 🇺🇸 English

CodeSkillHook combines full software engineering lifecycle skills with
Ponytail's senior-engineer minimalism.

Since `v2.0.0`, Claude Code and Codex CLI are maintained independently
with separate runtime environments.

### Features

  -----------------------------------------------------------------------
  🧠 Full Engineering     🪶 Ponytail Minimal     🔒 Complete Isolation
  Workflow Skills         Engineering Mode        Architecture
  ----------------------- ----------------------- -----------------------
  Requirement Analysis    Avoid over-engineering  Claude and Codex do not
                                                  share runtime
                                                  directories

  Technical Specification Solve real requirements No symbolic links
                          first                   

  Project Planning        Keep code simple,       Independent upgrades
                          reliable, maintainable  and maintenance

  Implementation                                  

  Testing & Validation                            

  Code Review                                     

  Performance                                     
  Optimization                                    

  Security Review                                 

  Release & Migration                             
  -----------------------------------------------------------------------

### Acknowledgements

Thanks to:

-   DietrichGebert/ponytail
-   addyosmani/agent-skills
-   multica-ai/andrej-karpathy-skills

------------------------------------------------------------------------

## Star History

[![Star History
Chart](https://api.star-history.com/svg?repos=uxudjs/CodeSkillHook&type=Date)](https://star-history.com/#uxudjs/CodeSkillHook&Date)
