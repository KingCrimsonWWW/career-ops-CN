# 流水线处理 (Pipeline Processing)
#
# Chinese-language pipeline mode for processing pending job URLs.
# Corresponds to the English `pipeline.md` mode.
#
# Usage: /career-ops pipeline (when language.modes_dir is set to modes/zh)

## 流水线流程

### 1. 读取待处理列表
从 `data/pipeline.md` 中读取所有待评估的 URL：
```
- [ ] https://www.zhipin.com/job_detail/xxx.html | 字节跳动 | 高级前端工程师
- [ ] https://www.zhipin.com/job_detail/yyy.html | 阿里巴巴 | 算法工程师
```

### 2. 逐个评估
对每个 URL：
1. 使用 WebFetch 获取职位详情页面
2. 提取职位描述、公司信息、薪资等
3. 使用 `modes/zh/pinggu.md` 中的评估流程进行评分
4. 生成评估报告（保存到 `reports/` 目录）

### 3. 更新状态
评估完成后：
- 将 URL 从 `[ ]` 标记为 `[x]`（已处理）
- 将评估结果追加到 `data/applications.md` 的 Markdown 表格
- 可选：生成 ATS 优化简历（使用 `modes/pdf.md` 流程）

### 4. 批量处理
如果待处理列表超过 3 个 URL，使用 sub-agent 并行处理：
```
Agent(
  subagent_type="general-purpose",
  prompt="[shared.md]\n\n[pinggu.md]\n\n[URL列表]",
  description="career-ops pipeline-batch"
)
```

### 5. 输出摘要
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
流水线处理完成 — 2025-01-15
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
已处理:     5 个职位
平均评分:   3.8/5
推荐申请:   3 个
暂不考虑:   2 个

推荐申请:
  + 字节跳动 | 高级前端工程师 | 4.2/5
  + 阿里巴巴 | 算法工程师 | 4.0/5
  + 腾讯 | 后端开发工程师 | 3.8/5
```

## 中国市场特殊处理

### BOSS直聘链接解析
BOSS直聘的职位页面通常包含：
- `zpData.jobInfo` — 职位详情
- `zpData.brandInfo` — 公司信息
- `zpData.bossInfo` — 招聘者信息

如果 WebFetch 无法直接获取（需要登录），提示用户：
1. 使用 BOSS 直聘 App 复制职位描述
2. 粘贴到 `data/pipeline.md` 中
3. 或使用本地解析器脚本

### 智联招聘/前程无忧链接
这些平台通常有反爬机制，建议：
1. 优先使用平台 API（如果可用）
2. 备用：使用 WebSearch 搜索职位信息
3. 最后：提示用户手动输入
