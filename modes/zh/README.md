# Chinese Language Modes (中文模式)
#
# This directory contains Chinese-language mode definitions for evaluating
# job offers in the Chinese recruitment market.
#
# Usage: Set `language.modes_dir: modes/zh` in config/profile.yml

## Available Modes

- `pinggu.md` — 职位评估 (Job Offer Evaluation) — corresponds to `oferta.md`
- `pipeline.md` — 流水线处理 (Pipeline Processing)
- `shenqing.md` — 申请助手 (Application Assistant) — corresponds to `apply.md`
- `genjin.md` — 跟进追踪 (Follow-up Tracking) — corresponds to `followup.md`

## China-Specific Scoring Dimensions

When evaluating Chinese job offers, the following additional dimensions are considered:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| 薪资竞争力 | 20% | Monthly salary × months vs. market rate |
| 技术栈匹配 | 20% | Tech stack alignment with candidate profile |
| 公司规模与稳定性 | 15% | 大厂/独角兽/外企/国企/创业公司 classification |
| 工作生活平衡 | 15% | 996, 大小周, 加班文化 indicators |
| 职业发展空间 | 15% | 晋升路径, 技术深度, 管理机会 |
| 地理位置 | 10% | City tier, 通勤时间, remote work availability |
| 福利待遇 | 5% | 公积金, 商业保险, 股票期权, 年终奖 |

## Configuration

To use Chinese modes, add to `config/profile.yml`:

```yaml
language:
  modes_dir: modes/zh
  locale: zh-CN
```
