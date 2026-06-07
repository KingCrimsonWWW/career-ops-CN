# Career-Ops-CN

[English](README.md) | [简体中文](README.cn.md)

> **Career-Ops-CN** 是 [Career-Ops](https://github.com/santifer/career-ops) 的中国招聘市场增强版本。
> 在保持 Career-Ops 原有架构不变的前提下，逐步增加对中国招聘市场的支持。

<p align=”center”>
  <a href=”https://github.com/KingCrimsonWWW/career-ops-CN”><img src=”docs/hero-banner.jpg” alt=”Career-Ops-CN 中国求职系统” width=”800”></a>
</p>

<p align=”center”>
  <em>在 Career-Ops 的基础上，为中国求职者量身打造。</em><br>
  <strong>BOSS直聘数据接入 · 中文评估模式 · 中国招聘市场知识库</strong>
</p>

---

## 这是什么

Career-Ops-CN 在 Career-Ops 基础上增加了对中国招聘市场的支持：

- **BOSS直聘数据接入** — 通过标准 Provider 接口获取 BOSS 直聘职位数据
- **中文评估模式** — 针对中国市场的评分体系（薪资竞争力、公司类型、工作生活平衡）
- **中文语言模式** — 完整的 `modes/zh/` 中文模式目录
- **中国市场公司库** — 预配置字节跳动、阿里巴巴、腾讯等中国科技公司
- **中国招聘知识** — 大厂/独角兽/外企/国企分类、薪资结构、福利体系

> **核心原则**：保持 Career-Ops 架构不变，以增量方式添加中国特性。
> 任何不涉及中国市场功能的改动，都应向上游 Career-Ops 提交。

## 功能特性

### Career-Ops 核心功能

| 功能 | 说明 |
|------|------|
| **自动管道** | 粘贴一个 URL，即可获得完整评估 + PDF + 追踪记录 |
| **6 个评估模块** | 职位总结、简历匹配、职级策略、薪酬调研、个性化建议、面试准备（STAR+R） |
| **ATS PDF 生成** | 注入关键词的 ATS 优化简历 |
| **平台扫描器** | 支持 Greenhouse、Ashby、Lever、Workable 等国际平台 |
| **批量处理** | 使用子代理并行评估多个职位 |
| **Dashboard TUI** | 终端 UI 浏览、筛选和排序求职管道 |

### Career-Ops-CN 中国增强功能

| 功能 | 说明 | 状态 |
|------|------|------|
| **BOSS直聘 Provider** | 通过 API 获取 BOSS 直聘职位列表 | ✅ 已完成 |
| **中文评估模式** | `modes/zh/pinggu.md` — 中国市场评分体系 | ✅ 已完成 |
| **中文流水线模式** | `modes/zh/pipeline.md` — 中文职位处理流程 | ✅ 已完成 |
| **中文申请助手** | `modes/zh/shenqing.md` — 面试问答模板、BOSS 直聘技巧 | ✅ 已完成 |
| **中文跟进追踪** | `modes/zh/genjin.md` — 跟进规则、消息模板 | ✅ 已完成 |
| **中国市场公司库** | 预配置中国科技公司（字节、阿里、腾讯等） | ✅ 已完成 |
| **`boss-scan` 命令** | 专门扫描 BOSS 直聘的新斜杠命令 | ✅ 已完成 |
| **智联招聘 Provider** | 智联招聘职位数据接入 | 🔜 Phase 3 |
| **前程无忧 Provider** | 前程无忧职位数据接入 | 🔜 Phase 3 |
| **猎聘 Provider** | 猎聘职位数据接入 | 🔜 Phase 3 |
| **自动开聊** | 通过 Playwright 自动向 Boss 发起对话 | 🔜 Phase 3 |
| **自动复聊** | 已读不回自动跟进消息 | 🔜 Phase 3 |
| **中国特色简历模板** | 适配中国求职市场的简历模板 | 🔜 Phase 3 |

## 快速开始

```bash
# 1. 克隆并安装
git clone https://github.com/KingCrimsonWWW/career-ops-CN.git
cd career-ops-CN && npm install
npx playwright install chromium   # 生成 PDF 所需

# 2. 检查环境
npm run doctor                     # 验证所有前置条件

# 3. 配置
cp config/profile.example.yml config/profile.yml  # 填入你的信息
cp templates/portals.example.yml portals.yml       # 自定义目标公司

# 4. 添加你的简历
# 在项目根目录创建 cv.md，并用 Markdown 写入你的简历

# 5. 用 Claude 做个性化配置
claude   # 在当前目录打开 Claude Code

# 然后让 Claude 帮你把系统调成适合你的版本：
# “使用中文模式”
# “帮我设置 BOSS 直聘扫描，搜索北京的前端工程师”
# “把职业原型改成后端工程岗位”
# “用我贴过来的这份简历更新个人档案”
```

## 使用方式

### 基本命令

```
/career-ops                → 显示所有可用命令
/career-ops {粘贴职位描述}  → 完整自动管道（评估 + PDF + 追踪）
/career-ops scan           → 扫描国际平台上的新职位
/career-ops boss-scan      → 扫描 BOSS 直聘上的中国职位
/career-ops pdf            → 生成 ATS 优化简历
/career-ops batch          → 批量评估多个职位
/career-ops tracker        → 查看申请状态
/career-ops apply          → 用 AI 协助填写申请表
/career-ops pipeline       → 处理待办 URL
/career-ops deep           → 深度公司研究
/career-ops interview-prep → 生成面试准备材料
```

### 扫描 BOSS 直聘

在 `portals.yml` 中添加 BOSS 直聘条目：

```yaml
tracked_companies:
  - name: “BOSS直聘-前端工程师-北京”
    provider: boss-zhipin
    boss_zhipin:
      query: “前端工程师”
      city: “101010100”     # 北京
      experience: “105”     # 3-5年
      salary: “405”         # 20-50K
    enabled: true
```

然后运行：
```bash
node scan.mjs --company “BOSS直聘”
# 或
/career-ops boss-scan
```

### 使用中文评估模式

在 `config/profile.yml` 中设置：
```yaml
language:
  modes_dir: modes/zh
  locale: zh-CN
```

所有评估将自动使用中文模式，包含中国市场特有评分维度。

## 中国市场评分体系

中文评估模式使用以下评分维度：

| 评估块 | 权重 | 说明 |
|--------|------|------|
| A. 技术匹配 | 20% | 技术栈、架构经验、业务领域匹配度 |
| B. 职业发展 | 20% | 晋升空间、技术深度、管理机会 |
| C. 薪资福利 | 20% | 月薪、年包、股票期权、公积金、年终奖 |
| D. 公司质量 | 15% | 规模、稳定性、行业地位、技术影响力 |
| E. 工作生活 | 15% | 加班文化、弹性工作、带薪假期 |
| F. 地理位置 | 5% | 城市等级、通勤时间、远程办公 |
| G. 综合评估 | 5% | 职位真实性、整体直觉、风险评估 |

### 公司类型分类

| 类型 | 说明 | 典型特征 |
|------|------|----------|
| 🏢 大厂 | 字节跳动、阿里、腾讯、美团、京东、百度、网易、快手、小米 | 高薪、高强度、技术挑战 |
| 🦄 独角兽 | 小红书、滴滴、B站、拼多多、SHEIN | 高薪、快速增长、期权机会 |
| 🌐 外企 | Google、Microsoft、Apple、Amazon 中国区 | 工作生活平衡、国际视野 |
| 🏛️ 国企/央企 | 中国银行、中国移动、华为（部分） | 稳定、福利好、节奏较慢 |
| 🚀 创业公司 | 早期融资 | 高风险高回报、股权激励 |

## 预配置平台

### 国际平台（默认启用）
Anthropic、OpenAI、Mistral、ElevenLabs、Retool、Airtable、Vercel、n8n、Zapier 等 45+ 家公司。

### 中国平台（默认禁用，需手动启用）
BOSS 直聘（通过 `boss-zhipin` Provider）、字节跳动、阿里巴巴、腾讯、美团、京东。

### 搜索查询
支持 `site:zhipin.com`、`site:lagou.com`、`site:liepin.com` 等中国招聘平台搜索。

## 项目结构

```
career-ops-CN/
├── providers/                     # 数据源 Provider 插件
│   ├── boss-zhipin.mjs           # ✨ BOSS 直聘 Provider
│   ├── greenhouse.mjs            # Greenhouse (国际)
│   ├── ashby.mjs                 # Ashby (国际)
│   └── ...
├── modes/                         # 技能模式定义
│   ├── zh/                       # ✨ 中文语言模式
│   │   ├── _shared.md            # 中文共享上下文（评分体系）
│   │   ├── pinggu.md             # 职位评估
│   │   ├── pipeline.md           # 流水线处理
│   │   ├── shenqing.md           # 申请助手
│   │   └── genjin.md             # 跟进追踪
│   ├── boss-scan.md              # ✨ BOSS 扫描模式
│   ├── _shared.md                # 英文共享上下文
│   └── ...
├── config/
│   └── boss-zhipin.example.yml   # ✨ BOSS 直聘配置模板
├── templates/
│   └── portals.example.yml       # 已添加中国公司示例
├── docs/
│   └── PHASE-1-ANALYSIS.md       # ✨ 架构分析与迁移计划
├── dashboard/                     # Go TUI 管道查看器
├── data/                          # 追踪数据（gitignored）
├── reports/                       # 评估报告（gitignored）
└── output/                        # 生成的 PDF（gitignored）
```

## 技术栈

- **数据源**：BOSS 直聘 Web API、Greenhouse API、Ashby API、Lever API、Workable
- **代理**：Claude Code / Gemini CLI / Qwen / OpenCode / Codex
- **PDF**：Playwright + HTML 模板
- **扫描器**：Node.js + Provider 插件系统
- **Dashboard**：Go + Bubble Tea + Lipgloss
- **数据**：Markdown 表格 + YAML 配置 + TSV 文件

## 设计原则

```
Keep Career-Ops Structure.     — 保持 Career-Ops 架构不变
Add China Features.            — 以增量方式添加中国特性
Minimize Breaking Changes.     — 最小化破坏性改动
Prefer Extension Over Rewrite. — 优先扩展，而非重写
```

## 贡献

欢迎提交 Issue 和 Pull Request！

1. 中国市场相关的功能请提交到本仓库
2. Career-Ops 核心功能的改进请提交到上游 [santifer/career-ops](https://github.com/santifer/career-ops)

## 致谢

- [santifer](https://santifer.io) — Career-Ops 原作者
- [geekgeekrun](https://github.com/geekgeekrun/geekgeekrun) — BOSS 直聘 RPA 工具，中国功能参考

## 许可证

[MIT License](LICENSE) — 与上游 Career-Ops 保持一致。