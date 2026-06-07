// @ts-check
/**
 * _boss-zhipin-browser.mjs — Puppeteer + stealth 浏览器抓取模块
 *
 * 完全复制 GeekGeekRun 的方式：
 *   1. puppeteer-extra + stealth + anonymize-ua 插件
 *   2. 加载保存的 Cookie（不需要每次登录）
 *   3. 直接读取 Vue 内部状态（__vue__.jobList），不解析 DOM
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';

const COOKIES_PATH = path.resolve('data/.boss-cookies.json');
const LOCAL_STORAGE_PATH = path.resolve('data/.boss-local-storage.json');
const BOSS_HOST = 'www.zhipin.com';

/** 随机延迟 */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sleepWithRandomDelay(baseMs = 1000) {
  return sleep(baseMs + Math.floor(Math.random() * 2000));
}

/**
 * 从 entry 配置构建 BOSS 直聘搜索页面 URL
 */
function buildSearchUrl(entry) {
  const params = entry.boss_zhipin || {};
  const query = params.query || entry.name || '';
  const city = params.city || '101010100';
  const experience = params.experience || '';
  const salary = params.salary || '';

  const url = new URL(`https://${BOSS_HOST}/web/geek/jobs`);
  url.searchParams.set('query', query);
  if (city) url.searchParams.set('city', city);
  if (experience) url.searchParams.set('experience', experience);
  if (salary) url.searchParams.set('salary', salary);

  return url.toString();
}

/**
 * 使用 puppeteer-extra + stealth 抓取 BOSS 直聘职位列表
 *
 * @param {object} entry - portals.yml 中的条目
 * @returns {Promise<Array<{title: string, url: string, company: string, location: string}>>}
 */
export async function scrapeJobs(entry) {
  if (!existsSync(COOKIES_PATH)) {
    throw new Error('boss-zhipin: 未找到 Cookie。请先运行: npm run boss:login');
  }

  // 初始化 puppeteer-extra（与 GeekGeekRun 完全相同）
  const puppeteer = (await import('puppeteer-extra')).default;
  const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
  const AnonymizeUaPlugin = (await import('puppeteer-extra-plugin-anonymize-ua')).default;
  const LaodengPlugin = (await import('@geekgeekrun/puppeteer-extra-plugin-laodeng')).default;

  puppeteer.use(StealthPlugin());
  puppeteer.use(LaodengPlugin());
  puppeteer.use(AnonymizeUaPlugin({ makeWindows: false }));

  const browser = await puppeteer.launch({
    headless: false,  // 必须有头模式
    pipe: true,       // GeekGeekRun 使用 pipe
    defaultViewport: null,
    args: ['--window-size=1440,900'],
  });

  try {
    const page = (await browser.pages())[0];

    // 加载保存的 Cookie
    const cookies = JSON.parse(readFileSync(COOKIES_PATH, 'utf-8'));
    for (const c of cookies) {
      if (Object.hasOwn(c, 'sameSite')) c.sameSite = 'unspecified';
      await page.setCookie(c);
    }

    // 加载 localStorage
    if (existsSync(LOCAL_STORAGE_PATH)) {
      const lsData = readFileSync(LOCAL_STORAGE_PATH, 'utf-8');
      await page.goto(`https://${BOSS_HOST}/desktop/`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await page.evaluate((data) => {
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          window.localStorage.setItem(key, value);
        }
      }, lsData);
    }

    // 访问搜索页面
    const searchUrl = buildSearchUrl(entry);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // 等待页面完全加载
    await sleep(3000);
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });

    // 检查是否被重定向到登录页
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
      throw new Error('boss-zhipin: 登录态已过期，请重新运行: npm run boss:login');
    }

    // 检查是否遇到验证码（极验 GeeTest）
    if (currentUrl.includes('verify') || currentUrl.includes('security-check')) {
      console.log('');
      console.log('⚠️  BOSS 直聘要求验证，请在浏览器中完成验证');
      console.log('   验证完成后页面会自动跳转，脚本将继续运行');
      console.log('');

      // 等待验证完成（URL 不再包含 verify）
      const verifyStart = Date.now();
      const VERIFY_TIMEOUT = 120_000; // 2 分钟
      while (Date.now() - verifyStart < VERIFY_TIMEOUT) {
        await sleep(2000);
        const newUrl = page.url();
        if (!newUrl.includes('verify') && !newUrl.includes('security-check')) {
          console.log('✅ 验证完成');
          break;
        }
      }

      // 验证超时
      if (page.url().includes('verify')) {
        throw new Error('boss-zhipin: 验证超时，请重试');
      }

      // 验证后可能需要重新导航到搜索页
      await sleep(2000);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);
    }

    // 等待职位列表加载
    try {
      await page.waitForSelector('.job-list-container, .rec-job-list, .job-recommend-result', {
        timeout: 10000,
      });
    } catch {
      // 可能页面结构变了，继续尝试读取 Vue 数据
    }

    await sleepWithRandomDelay(2000);

    // ── 核心：直接读取 Vue 内部状态（与 GeekGeekRun 相同）──
    const jobListData = await page.evaluate(() => {
      // 方式 1：从 .page-jobs-main 的 Vue 实例读取
      const mainEl = document.querySelector('.page-jobs-main');
      if (mainEl?.__vue__?.jobList) {
        return mainEl.__vue__.jobList;
      }

      // 方式 2：从 .search-job-result 的 Vue 实例读取
      const searchEl = document.querySelector('.search-job-result');
      if (searchEl?.__vue__?.jobList) {
        return searchEl.__vue__.jobList;
      }

      // 方式 3：遍历所有元素找 Vue 实例
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        if (el.__vue__?.jobList?.length > 0) {
          return el.__vue__.jobList;
        }
      }

      return null;
    });

    if (jobListData && jobListData.length > 0) {
      // 直接从 Vue 数据构建 Job 列表（最可靠的方式）
      return jobListData
        .filter(j => j.jobName && j.encryptJobId)
        .map(j => {
          const city = j.cityName || '';
          const area = j.areaDistrict || '';
          return {
            title: j.jobName,
            url: `https://${BOSS_HOST}/job_detail/${j.encryptJobId}.html`,
            company: j.brandName || entry.name || '',
            location: [city, area].filter(Boolean).join(' '),
            _meta: {
              salary: j.salaryDesc || '',
              experience: j.jobExperience || '',
              degree: j.jobDegree || '',
              skills: (j.skills || []).join(', '),
              bossTitle: j.bossTitle || '',
              bossOnline: j.bossOnline || false,
            },
          };
        });
    }

    // ── 备用：从 DOM 解析 ──
    console.warn('boss-zhipin: Vue 数据不可用，尝试 DOM 解析...');
    const domJobs = await page.evaluate(() => {
      const jobs = [];
      const cards = document.querySelectorAll(
        '.job-card-wrapper, .rec-job-list li, [class*="job-card"]'
      );

      for (const card of cards) {
        try {
          const titleEl = card.querySelector('.job-name, [class*="job-name"]');
          const companyEl = card.querySelector('.company-name a, .company-name');
          const areaEl = card.querySelector('.job-area, [class*="job-area"]');
          const salaryEl = card.querySelector('.salary, [class*="salary"]');
          const linkEl = card.querySelector('a[href*="/job_detail/"]');

          const title = titleEl?.textContent?.trim() || '';
          const company = companyEl?.textContent?.trim() || '';
          const location = areaEl?.textContent?.trim() || '';
          const salary = salaryEl?.textContent?.trim() || '';
          let url = '';
          if (linkEl) {
            const href = linkEl.getAttribute('href') || '';
            url = href.startsWith('http') ? href : `https://www.zhipin.com${href}`;
          }

          if (title && url) jobs.push({ title, company, location, salary, url });
        } catch { /* skip */ }
      }
      return jobs;
    });

    return domJobs || [];
  } finally {
    await browser.close();
  }
}
