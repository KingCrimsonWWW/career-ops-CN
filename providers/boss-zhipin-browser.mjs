// @ts-check
/**
 * boss-zhipin-browser.mjs — Playwright 浏览器抓取模块
 *
 * 使用真浏览器访问 BOSS 直聘搜索页面，解析 DOM 提取职位列表。
 * 绕过 BOSS 直聘的 API 反爬机制。
 *
 * 前置条件：需要先运行 `node boss-zhipin-login.mjs` 完成登录。
 *
 * 反检测措施：
 *   - viewport 随机化
 *   - User-Agent 随机化
 *   - 操作间随机延迟
 *   - 隐藏 webdriver 标志
 *   - 串行页面访问（不并行）
 */

import { existsSync } from 'fs';
import path from 'path';

const STATE_PATH = path.resolve('data/.boss-zhipin-state.json');
const BOSS_HOST = 'www.zhipin.com';

// ── 反检测工具 ──────────────────────────────────────────────────

/** 随机延迟（模拟人类操作） */
function randomDelay(minMs = 1000, maxMs = 3000) {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 随机 viewport 尺寸 */
function randomViewport() {
  const widths = [1280, 1366, 1440, 1536, 1600, 1680, 1920];
  const heights = [720, 768, 800, 864, 900, 960, 1080];
  return {
    width: widths[Math.floor(Math.random() * widths.length)],
    height: heights[Math.floor(Math.random() * heights.length)],
  };
}

/** 随机 Chrome User-Agent */
function randomUA() {
  const versions = ['124', '125', '126', '127', '128', '129', '130'];
  const version = versions[Math.floor(Math.random() * versions.length)];
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
}

// ── 反检测注入脚本 ──────────────────────────────────────────────

const STEALTH_SCRIPT = () => {
  // 隐藏 webdriver 标志
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 隐藏 Playwright 特征
  delete window.__playwright;
  delete window.__pw_manual;

  // 修改 navigator.plugins（空列表是自动化特征）
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
  });

  // 修改 navigator.languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
  });

  // 隐藏 Chrome 自动化特征
  if (window.chrome) {
    window.chrome.runtime = {};
  }
};

// ── 构建搜索 URL ────────────────────────────────────────────────

/**
 * 从 entry 配置构建 BOSS 直聘搜索页面 URL
 * @param {object} entry - portals.yml 中的条目
 * @returns {string} 搜索页面 URL
 */
function buildSearchUrl(entry) {
  const params = entry.boss_zhipin || {};
  const query = params.query || entry.name || '';
  const city = params.city || '101010100';
  const experience = params.experience || '';
  const salary = params.salary || '';

  const url = new URL(`https://${BOSS_HOST}/web/geek/job`);
  url.searchParams.set('query', query);
  url.searchParams.set('city', city);
  if (experience) url.searchParams.set('experience', experience);
  if (salary) url.searchParams.set('salary', salary);

  return url.toString();
}

// ── DOM 解析 ────────────────────────────────────────────────────

/**
 * 从 BOSS 直聘搜索结果页解析职位列表
 * 使用 page.evaluate() 在浏览器上下文中执行
 */
const EXTRACT_JOBS_SCRIPT = () => {
  const jobs = [];

  // BOSS 直聘搜索结果的职位卡片
  const cards = document.querySelectorAll('.job-card-wrapper, .job-list li, [class*="job-card"]');

  for (const card of cards) {
    try {
      // 职位名称
      const titleEl = card.querySelector('.job-name, [class*="job-name"], [class*="job-title"]');
      const title = titleEl?.textContent?.trim() || '';

      // 公司名称
      const companyEl = card.querySelector('.company-name a, .company-name, [class*="company-name"]');
      const company = companyEl?.textContent?.trim() || '';

      // 地区
      const areaEl = card.querySelector('.job-area, .job-area-wrapper, [class*="job-area"]');
      const location = areaEl?.textContent?.trim() || '';

      // 薪资
      const salaryEl = card.querySelector('.salary, [class*="salary"]');
      const salary = salaryEl?.textContent?.trim() || '';

      // 职位链接
      const linkEl = card.querySelector('a[href*="/job_detail/"], a[ka*="job"]');
      let url = '';
      if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        if (href.startsWith('http')) {
          url = href;
        } else if (href.startsWith('/')) {
          url = `https://www.zhipin.com${href}`;
        }
      }

      // 技能标签
      const tagEls = card.querySelectorAll('.tag-list span, [class*="tag-list"] span, .job-tags span');
      const skills = Array.from(tagEls).map(el => el.textContent?.trim()).filter(Boolean);

      // Boss 信息
      const bossEl = card.querySelector('.info-public, [class*="boss-info"]');
      const bossTitle = bossEl?.textContent?.trim() || '';

      if (title && url) {
        jobs.push({ title, company, location, salary, url, skills, bossTitle });
      }
    } catch {
      // skip malformed card
    }
  }

  return jobs;
};

// ── 主抓取函数 ──────────────────────────────────────────────────

/**
 * 使用 Playwright 浏览器抓取 BOSS 直聘职位列表
 *
 * @param {object} entry - portals.yml 中的条目
 * @returns {Promise<Array<{title: string, url: string, company: string, location: string}>>}
 */
export async function scrapeJobs(entry) {
  // 检查登录状态
  if (!existsSync(STATE_PATH)) {
    throw new Error(
      'boss-zhipin: 未找到登录状态。请先运行: node boss-zhipin-login.mjs'
    );
  }

  const { chromium } = await import('playwright');

  const searchUrl = buildSearchUrl(entry);
  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      storageState: STATE_PATH,
      viewport: randomViewport(),
      userAgent: randomUA(),
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
    });

    // 注入反检测脚本
    await context.addInitScript(STEALTH_SCRIPT);

    const page = await context.newPage();

    // 访问搜索页面
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });

    // 等待页面加载（职位列表出现）
    try {
      await page.waitForSelector('.job-card-wrapper, .job-list li, [class*="job-card"]', {
        timeout: 10_000,
      });
    } catch {
      // 选择器没找到，可能页面结构变了，或者被反爬了
      // 尝试等待更通用的选择器
      await page.waitForTimeout(5000);
    }

    // 随机延迟（模拟人类浏览）
    await randomDelay(1500, 3500);

    // 滚动页面以触发懒加载
    await page.evaluate(() => window.scrollBy(0, 500));
    await randomDelay(500, 1500);

    // 检查是否被重定向到登录页
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
      throw new Error(
        'boss-zhipin: 登录状态已过期。请重新运行: node boss-zhipin-login.mjs'
      );
    }

    // 提取职位数据
    const rawJobs = await page.evaluate(EXTRACT_JOBS_SCRIPT);

    if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
      // 尝试备用方案：拦截 XHR 响应
      console.warn('boss-zhipin: DOM 解析未获取到职位，可能需要更新选择器');
      return [];
    }

    // 规范化为 Career-Ops Job 格式
    return rawJobs
      .map(j => ({
        title: j.title,
        url: j.url,
        company: j.company || entry.name || '',
        location: j.location || '',
        _meta: {
          salary: j.salary || '',
          skills: (j.skills || []).join(', '),
          bossTitle: j.bossTitle || '',
        },
      }))
      .filter(j => j.title && j.url);

  } finally {
    if (browser) await browser.close();
  }
}
