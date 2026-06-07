# Phase 1: 项目分析与改造方案设计

> 本文档是 Career-Ops-CN 的 Phase 1 交付物，包含：Career-Ops 架构分析、GeekGeekRun 功能映射表、功能迁移计划、模块改造建议。

---

## 1. 当前 Career-Ops 架构分析

### 1.1 核心架构特征

Career-Ops 是一个 **提示词驱动、基于文件的自动化系统**，而非传统的服务端应用。其核心运行时是 AI Agent CLI（Claude Code、Codex、Gemini CLI 等），系统由以下层次组成：

| 层次 | 职责 | 文件类型 |
|------|------|----------|
| **Skill 定义层** | Agent 路由与命令分发 | `.agents/skills/career-ops/SKILL.md` |
| **Mode 指令层** | 17 个操作模式的详细流程 | `modes/*.md` |
| **Provider 插件层** | ATS 平台 API 适配器 | `providers/*.mjs` |
| **工具脚本层** | 确定性数据处理 | `*.mjs`（scan、pdf、merge 等） |
| **数据存储层** | 用户运行时状态 | `data/*.md`、`data/*.tsv`、`config/*.yml` |
| **可视化层** | TUI 仪表盘 | `dashboard/`（Go） |

### 1.2 数据流

```
用户输入 JD/URL
  → SKILL.md 路由到 auto-pipeline mode
  → Agent 读取 _shared.md + _profile.md + mode 指令
  → 执行 A-F + G 评估块
  → 生成 report.md + PDF + tracker 行
  → 写入 data/applications.md
```

### 1.3 Provider 插件机制

`scan.mjs` 实现了一个完整的 Provider 插件系统，每个 Provider 导出：

```javascript
export default {
  id: 'provider-name',        // 唯一标识
  detect(entry) { ... },      // 可选：URL 自动检测
  async fetch(entry, ctx) {   // 必需：返回 [{title, url, company, location}]
  }
}
```

当前已支持 7 个 Provider：Greenhouse、Ashby、Lever、Workable、SmartRecruiters、Recruitee、local-parser。

### 1.4 扩展机制

| 扩展类型 | 位置 | 方式 |
|----------|------|------|
| 新 ATS Provider | `providers/*.mjs` | 单文件，实现 `{id, detect, fetch}` 接口 |
| 新 Skill Mode | `modes/*.md` + SKILL.md 路由表 | Markdown 指令文件 |
| 新语言支持 | `modes/{lang}/` 目录 | 翻译 _shared.md + 各模式 |
| 新 Local Parser | `portals.yml` 中的 parser 块 | 外部脚本，JSON stdout |

---

## 2. GeekGeekRun 功能映射表

### 2.1 GeekGeekRun 核心功能清单

| # | 功能 | 类别 | 说明 |
|---|------|------|------|
| G1 | BOSS 直聘自动开聊 | RPA | 自动向匹配 Boss 发起对话 |
| G2 | 职位搜索与过滤 | 数据采集 | 多维过滤（城市、薪资、经验、描述正则等） |
| G3 | 已读不回自动复聊 | RPA | 检测未回复对话，发送跟进消息 |
| G4 | BOSS 登录助手 | 基础设施 | 简化 BOSS 直聘登录流程 |
| G5 | LLM 集成 | AI | OpenAI 兼容接口生成跟进消息 |
| G6 | 配置模板系统 | 基础设施 | 预设配置模板 |
| G7 | 候选人浏览与过滤（招聘方） | RPA | 自动浏览推荐候选人列表 |
| G8 | 自动打招呼（招聘方） | RPA | 向过滤后的候选人发送问候 |
| G9 | 简历提取（Canvas Hook） | 数据采集 | 绕过 WASM+Canvas 保护提取简历 |
| G10 | 简历评分（LLM） | AI | 基于 LLM 的简历评估与打分 |
| G11 | 风险检测 | 基础设施 | 检测自动化过程中的风险信号 |
| G12 | 钉钉通知 | 集成 | DingTalk 消息推送 |
| G13 | Webhook 集成 | 集成 | 外部系统 webhook 连接 |
| G14 | SQLite 持久化 | 基础设施 | TypeORM + SQLite 存储候选人、联系日志 |
| G15 | 进程管理 | 基础设施 | 守护进程 + 工作进程生命周期管理 |
| G16 | 反检测措施 | 基础设施 | puppeteer-extra stealth、ghost-cursor、随机延迟 |

### 2.2 迁移可行性矩阵

| GeekGeekRun 功能 | Career-Ops 对应 | 迁移路径 | 改动程度 | Phase |
|-------------------|-----------------|----------|----------|-------|
| **G2: 职位搜索与过滤** | `scan.mjs` Provider 系统 | **新增 Provider: `boss-zhipin.mjs`** | 低 | P2 |
| **G5: LLM 集成** | Agent 运行时原生支持 | 已具备，无需迁移 | 无 | - |
| **G10: 简历评分** | `modes/oferta.md` 评估系统 | 已具备，复用 A-F 评估 | 无 | - |
| **G12: 钉钉通知** | 无对应 | **新增 Provider/Integration** | 中 | P3 |
| **G13: Webhook** | `local-parser.mjs` 可扩展 | 通过 local-parser 或新 Provider | 中 | P3 |
| **G14: 持久化** | `data/applications.md` + `data/*.tsv` | 复用现有文件存储 | 无 | - |
| G1: 自动开聊 | 无对应（自动化 RPA） | **新增 Mode: `auto-contact.md`** | 高 | P3 |
| G3: 自动复聊 | `modes/followup.md` | **增强 followup.md** | 中 | P3 |
| G4: 登录助手 | 无对应 | **新增基础设施工具** | 中 | P3 |
| G6: 配置模板 | `config/profile.example.yml` | 扩展现有模板 | 低 | P2 |
| G7-G8: 招聘方 RPA | 无对应 | 暂不迁移（超出范围） | - | - |
| G9: 简历提取 | 无对应 | **新增工具脚本** | 高 | P3 |
| G11: 风险检测 | 无对应 | 新增监控机制 | 中 | P3 |
| G15: 进程管理 | Agent CLI 内建 | 已具备 | 无 | - |
| G16: 反检测 | 无对应 | **新增基础设施** | 高 | P3 |

### 2.3 复用评估总结

- **可直接复用（无需改动）**：G5（LLM）、G10（简历评分）、G14（持久化）、G15（进程管理）
- **需增量开发（P2）**：G2（职位采集）、G6（配置模板）
- **需新增模块（P3）**：G1、G3、G4、G9、G11、G12、G13、G16
- **暂不迁移**：G7、G8（招聘方功能，超出当前范围）

---

## 3. 功能迁移计划

### Phase 2: 最小可运行版本（MVP）

**目标**：从 BOSS 直聘获取职位数据 → 导入 Career-Ops 工作流 → 使用 Agent 进行评估 → 生成匹配结果 → 保存申请记录

#### 3.1 新增 Provider: `providers/boss-zhipin.mjs`

```
功能：通过 BOSS 直聘公开 API 获取职位列表
输入：搜索关键词、城市、薪资范围、经验要求
输出：符合 Career-Ops Job 接口的职位数据 [{title, url, company, location}]
接入方式：实现标准 Provider {id, detect, fetch} 接口
```

#### 3.2 新增配置: `config/boss-zhipin.example.yml`

```yaml
boss_zhipin:
  search:
    keyword: "前端工程师"
    city: "101010100"       # 北京
    experience: "105"       # 3-5年
    salary: "405"           # 20-50K
    page: 1
    pagesize: 30
  filters:
    company_blacklist: []   # 公司黑名单（正则）
    company_whitelist: []   # 公司白名单（正则）
    title_exclude: []       # 标题排除词
    title_include: []       # 标题包含词
    min_salary: 0           # 最低薪资（K/月）
    max_salary: 0           # 最高薪资（K/月）
```

#### 3.3 扩展 portals.yml 模板

在 `templates/portals.example.yml` 中新增中国平台示例配置块。

#### 3.4 新增 Mode: `modes/boss-scan.md`

专门针对 BOSS 直聘的扫描模式，复用 scan 的 4 级发现架构：
- Level 1: 通过 Provider API 获取
- Level 2: 通过 Playwright 浏览器获取（备用）
- Level 3: 通过 WebSearch site:boss.cn 搜索
- Level 4: 通过 Local Parser 获取

#### 3.5 扩展中文语言模式

创建 `modes/zh/` 目录，包含：
- `_shared.md` — 翻译后的共享上下文（评分体系、中国招聘市场特有维度）
- `pinggu.md` — 评估模式（oferta 对应）
- `pipeline.md` — 流水线模式
- `shenqing.md` — 申请助手模式
- `genjin.md` — 跟进模式

### Phase 3: 逐步增强

#### 优先级 1: BOSS 直聘完整支持
- 自动开聊（需要 Playwright + 反检测）
- 已读不回自动复聊（增强 followup.md）
- 登录助手工具
- 简历提取工具

#### 优先级 2: 更多招聘平台
- 智联招聘 Provider
- 前程无忧 Provider
- 猎聘 Provider

#### 优先级 3: 高级功能
- 中国特色简历模板
- 中国招聘市场知识库
- 钉钉/微信通知集成
- 自动投递

---

## 4. 模块改造建议

### 4.1 最小改动原则

**不改动的模块**：
- `scan.mjs` 核心扫描引擎 — 只新增 Provider 文件
- `providers/_types.js` 类型定义 — Job 接口已满足需求
- `modes/_shared.md` 评分系统 — 新增中国维度但不破坏现有评分
- `data/applications.md` 数据格式 — 完全复用
- `dashboard/` TUI — 兼容现有数据格式

**增量改动的模块**：
- `templates/portals.example.yml` — 新增中国平台示例
- `config/profile.example.yml` — 新增中国相关配置字段
- `templates/states.yml` — 可能需要新增中国特有的状态别名
- `.agents/skills/career-ops/SKILL.md` — 新增 mode 路由
- `AGENTS.md` — 新增中文模式说明

**新增的模块**：
- `providers/boss-zhipin.mjs` — BOSS 直聘 Provider
- `config/boss-zhipin.example.yml` — BOSS 直聘配置模板
- `modes/boss-scan.md` — BOSS 专用扫描模式
- `modes/zh/` — 中文语言模式目录
- `providers/zhaopin.mjs` — 智联招聘 Provider（Phase 3）
- `providers/liepin.mjs` — 猎聘 Provider（Phase 3）
- `providers/qiancheng.mjs` — 前程无忧 Provider（Phase 3）

### 4.2 架构兼容性保障

| 保障措施 | 说明 |
|----------|------|
| Provider 接口不变 | 新 Provider 严格实现 `{id, detect, fetch}` |
| Data Contract 遵守 | 新文件放入正确层级（System/User） |
| 上游同步友好 | 不修改已有文件的核心逻辑，仅追加 |
| 渐进式语言支持 | `modes/zh/` 独立目录，不影响 `modes/` 根目录 |
| 配置可选 | BOSS 直聘配置为可选模块，不启用时零影响 |

### 4.3 DATA_CONTRACT.md 影响评估

新增文件归属：

| 文件 | 层级 | 说明 |
|------|------|------|
| `providers/boss-zhipin.mjs` | System | 可由自动更新覆盖 |
| `config/boss-zhipin.example.yml` | System | 模板文件 |
| `modes/boss-scan.md` | System | 模式定义 |
| `modes/zh/` | System | 语言模式 |
| `config/boss-zhipin.yml` | User | 用户实际配置 |
| `data/boss-zhipin-history.tsv` | User | 扫描历史 |

---

## 5. 技术决策记录

### 决策 1：通过 Provider 系统接入，而非独立工具

**理由**：Career-Ops 的 Provider 系统已经是一个成熟的数据接入层。BOSS 直聘的职位搜索结果可以完美映射为 `Job[]` 接口。无需创建独立的抓取工具。

### 决策 2：不引入 Puppeteer/Playwright 作为核心依赖

**理由**：Phase 2 优先使用 BOSS 直聘的公开接口。Playwright 已是 Career-Ops 的依赖（用于 PDF 生成），但在 Phase 2 不用于浏览器自动化。RPA 功能推迟到 Phase 3。

### 决策 3：中文模式独立目录

**理由**：遵循 Career-Ops 已有的多语言模式架构（`modes/de/`、`modes/fr/` 等），`modes/zh/` 保持与现有语言模式的一致性。

### 决策 4：不引入 SQLite/TypeORM

**理由**：Career-Ops 的文件即数据库架构是其核心设计理念。引入关系数据库会破坏 DATA_CONTRACT 和自动更新机制。所有持久化通过 Markdown 表格和 TSV 文件完成。
