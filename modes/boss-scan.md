# BOSS直聘 Scan Mode (BOSS 扫描模式)
#
# Scans BOSS直聘 (Boss Zhipin) for job listings using the Provider system.
# Integrates with Career-Ops pipeline: scan → evaluate → report → track.
#
# Usage: /career-ops boss-scan [--city BEIJING] [--query "关键词"] [--pages 3]

## BOSS直聘 Scan — Overview

This mode scans BOSS直聘 for job listings and feeds them into the Career-Ops
pipeline. It leverages the existing `boss-zhipin` Provider in `providers/boss-zhipin.mjs`
and the standard scan infrastructure in `scan.mjs`.

**China Market Context**: BOSS直聘 is one of China's largest recruitment platforms,
connecting job seekers directly with hiring managers ("Bosses"). Unlike Western ATS
platforms, communication happens through the app's built-in chat system.

## Scan Levels

### Level 1: Provider API (Primary — Zero Token)
Run `node scan.mjs` with BOSS直聘 entries in `portals.yml`.
The `boss-zhipin` Provider fetches listings via the public API.

```bash
node scan.mjs --company "BOSS直聘"
```

### Level 2: WebSearch Discovery (Supplementary)
Use WebSearch with `site:zhipin.com` queries for broader discovery.

Example queries:
- `site:zhipin.com "AI工程师" OR "机器学习" 北京`
- `site:zhipin.com "前端工程师" React Vue 上海`
- `site:zhipin.com "后端工程师" Java Go 深圳`

### Level 3: Local Parser (Custom)
For advanced users who need specific filtering logic.
Write a local parser script that outputs `{jobs:[]}` JSON.

## Scan Flow

1. **Read Configuration**
   - Load `portals.yml` for BOSS直聘 entries (entries with `provider: boss-zhipin`)
   - Load `config/boss-zhipin.yml` for search parameters (optional)
   - Apply title/location filters from portals.yml

2. **Execute Scan**
   - For each enabled BOSS直聘 entry:
     - Call `boss-zhipin` Provider's `fetch()` method
     - Normalize results to `{title, url, company, location}` format
     - Apply dedup against `data/scan-history.tsv` and `data/applications.md`

3. **Feed to Pipeline**
   - New results → append to `data/pipeline.md`
   - Record in `data/scan-history.tsv`
   - Print summary

4. **Evaluate (Optional)**
   - Run `/career-ops pipeline` to evaluate new BOSS listings
   - Agent reads JD details from each URL
   - Generates evaluation report using `modes/oferta.md` scoring system

## portals.yml Configuration for BOSS直聘

Add entries to `portals.yml` under `tracked_companies`:

```yaml
tracked_companies:
  # BOSS直聘 — Generic keyword search
  - name: "BOSS直聘-前端工程师"
    provider: boss-zhipin
    boss_zhipin:
      query: "前端工程师"
      city: "101010100"     # Beijing
      experience: "105"     # 3-5 years
      salary: "405"         # 20-50K
    enabled: true

  # BOSS直聘 — Multiple cities
  - name: "BOSS直聘-AI工程师-北京"
    provider: boss-zhipin
    boss_zhipin:
      query: "AI工程师"
      city: "101010100"
      salary: "405"
    enabled: true

  - name: "BOSS直聘-AI工程师-上海"
    provider: boss-zhipin
    boss_zhipin:
      query: "AI工程师"
      city: "101020100"     # Shanghai
      salary: "405"
    enabled: true

  - name: "BOSS直聘-AI工程师-深圳"
    provider: boss-zhipin
    boss_zhipin:
      query: "AI工程师"
      city: "101280600"     # Shenzhen
      salary: "405"
    enabled: true

  # BOSS直聘 — Backend/Full-stack
  - name: "BOSS直聘-后端工程师"
    provider: boss-zhipin
    boss_zhipin:
      query: "后端工程师"
      city: "101010100"
      experience: "105"
      salary: "405"
    enabled: true
```

## China Market Evaluation Notes

When evaluating Chinese job listings, the agent should consider additional
factors not typically relevant for Western markets:

### Compensation
- Salaries in China are typically quoted as monthly pre-tax (税前月薪)
- Common range: 15-16 months (includes year-end bonus / 年终奖)
- Some companies offer stock options (股票期权) separately
- Housing fund (公积金) contribution rates vary significantly

### Company Types
- 大厂 (Big Tech): ByteDance, Alibaba, Tencent, Meituan, JD, etc.
- 独角兽 (Unicorns): Didi, Xiaohongshu, etc.
- 外企 (Foreign companies): Google China, Microsoft China, etc.
- 创业公司 (Startups): Often offer more equity, less cash
- 国企 (State-owned): Lower salary but better work-life balance

### Work Culture Indicators
- 996: Work 9am-9pm, 6 days a week (increasingly frowned upon)
- 大小周: Alternating 5-day and 6-day work weeks
- Look for mentions of 加班 (overtime), 弹性工作 (flexible hours)

### Red Flags
- 外包 (outsourcing) — typically lower quality, less stability
- 劳务派遣 (labor dispatch) — not direct employment
- 薪资面议 (salary negotiable) — often means below market rate

## Integration with Career-Ops Modes

After scanning, use the standard Career-Ops modes:

1. `/career-ops pipeline` — Evaluate new BOSS listings
2. `/career-ops oferta` — Deep evaluation of specific offer
3. `/career-ops deep` — Research the company
4. `/career-ops interview-prep` — Prepare for interview

The Chinese language modes (`modes/zh/`) provide localized evaluation
with China-specific scoring dimensions when available.
