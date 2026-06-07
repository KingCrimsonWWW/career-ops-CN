# 职位评估 (Job Offer Evaluation)
#
# Chinese-language evaluation mode for job offers in the Chinese recruitment market.
# Corresponds to the English `oferta.md` mode with China-specific dimensions.
#
# Usage: Read this after modes/_shared.md (or modes/zh/_shared.md when available)

## 评估流程 (Evaluation Flow)

### 输入 (Input)
- Job listing URL or text content
- Company name
- Platform source (BOSS直聘, 智联招聘, 前程无忧, 猎聘, etc.)

### Step 1: 基本信息提取 (Basic Info Extraction)

从职位描述中提取以下信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| 公司名称 | Company name | 字节跳动 |
| 职位名称 | Job title | 高级前端工程师 |
| 工作地点 | Location | 北京·海淀区 |
| 薪资范围 | Salary range | 25-50K·16薪 |
| 经验要求 | Experience | 3-5年 |
| 学历要求 | Education | 本科及以上 |
| 技术栈 | Tech stack | React, Vue, TypeScript |
| 发布日期 | Posted date | 2025-01-15 |

### Step 2: 公司分析 (Company Analysis)

对公司进行分类和评估：

**公司类型分类**：
- 🏢 大厂 (Big Tech): 字节跳动、阿里巴巴、腾讯、美团、京东、百度、网易、快手、小米
- 🦄 独角兽 (Unicorn): 小红书、滴滴、B站、拼多多、SHEIN
- 🌐 外企 (Foreign): Google、Microsoft、Apple、Amazon、Meta 中国区
- 🏛️ 国企/央企 (State-owned): 中国银行、中国移动、华为（部分）
- 🚀 创业公司 (Startup): 早期融资阶段公司
- 🏗️ 中型公司 (Mid-size): 稳定盈利的中型科技公司

**评估维度**：
1. 公司规模与融资阶段
2. 行业地位与竞争力
3. 技术团队规模与技术影响力
4. 近期新闻（裁员、融资、上市等）

### Step 3: 薪资评估 (Compensation Analysis)

**中国市场薪资结构**：
- 月薪 = 税前月薪 × 月数（通常12-16个月）
- 年包 = 月薪 × 月数 + 年终奖 + 签字费 + 股票
- 公积金比例：5%-12%（公司差异大）

**薪资竞争力评估**：
| 等级 | 年包范围（3-5年经验） | 说明 |
|------|----------------------|------|
| S | 80万+ | 大厂核心岗位 |
| A | 50-80万 | 大厂/独角兽 |
| B | 30-50万 | 中型公司/外企 |
| C | 20-30万 | 一般互联网公司 |
| D | 20万以下 | 传统行业/小公司 |

### Step 4: 技术匹配 (Tech Stack Match)

评估维度：
1. 主力语言匹配度（如 Java/Go/Python/JavaScript/TypeScript）
2. 框架熟悉度（如 Spring Boot/React/Vue/PyTorch）
3. 架构经验匹配（微服务/分布式/大数据/云原生）
4. 业务领域匹配（电商/金融/社交/AI/游戏）

### Step 5: 工作生活平衡 (Work-Life Balance)

**红旗指标**：
- ❌ 明确提到 996 或大小周
- ❌ "能接受高强度工作"
- ❌ "创业心态"（通常意味着无偿加班）
- ❌ 招聘帖频繁更新（可能是高离职率）

**绿旗指标**：
- ✅ 明确提到"弹性工作时间"
- ✅ "不鼓励加班"
- ✅ 带薪年假天数明确
- ✅ 有远程办公选项

### Step 6: 综合评分 (Overall Scoring)

使用 A-F + G 评估体系（与英文版一致），但增加中国特有维度：

| 评估块 | 权重 | 说明 |
|--------|------|------|
| A. 技术匹配 | 20% | 技术栈、架构经验 |
| B. 职业发展 | 20% | 晋升空间、技术深度 |
| C. 薪资福利 | 20% | 年包、股票、公积金 |
| D. 公司质量 | 15% | 规模、稳定性、声誉 |
| E. 工作生活 | 15% | 加班文化、弹性、假期 |
| F. 地理位置 | 5% | 城市、通勤、远程 |
| G. 综合直觉 | 5% | 整体感觉 |

### Step 7: 输出报告 (Generate Report)

输出格式（Markdown）：

```markdown
# 职位评估报告

## 基本信息
| 项目 | 内容 |
|------|------|
| 公司 | {company} |
| 职位 | {title} |
| 地点 | {location} |
| 薪资 | {salary} |
| 来源 | {platform} |
| 评估日期 | {date} |

## 综合评分: {score}/5

### 评分详情
| 维度 | 分数 | 说明 |
|------|------|------|
| A. 技术匹配 | X/5 | ... |
| B. 职业发展 | X/5 | ... |
| C. 薪资福利 | X/5 | ... |
| D. 公司质量 | X/5 | ... |
| E. 工作生活 | X/5 | ... |
| F. 地理位置 | X/5 | ... |

## 公司分析
{company_analysis}

## 薪资分析
{compensation_analysis}

## 技术栈评估
{tech_stack_assessment}

## 工作生活平衡
{work_life_balance}

## 建议
{recommendation}

## 面试准备要点
{interview_tips}
```

### Step 8: 写入 Tracker

将评估结果写入 `data/applications.md`，格式与现有条目兼容。
