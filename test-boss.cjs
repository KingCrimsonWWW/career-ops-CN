const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AnonymizeUaPlugin = require('puppeteer-extra-plugin-anonymize-ua');
const LaodengPlugin = require('@geekgeekrun/puppeteer-extra-plugin-laodeng');
const fs = require('fs');

puppeteer.use(StealthPlugin());
puppeteer.use(LaodengPlugin());
puppeteer.use(AnonymizeUaPlugin({ makeWindows: false }));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    defaultViewport: null,
    args: ['--window-size=1440,900'],
  });

  const page = (await browser.pages())[0];

  // 1. 先访问桌面页设置 localStorage
  await page.goto('https://www.zhipin.com/desktop/', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  if (fs.existsSync('data/.boss-local-storage.json')) {
    const ls = fs.readFileSync('data/.boss-local-storage.json', 'utf-8');
    await page.evaluate((d) => {
      const p = JSON.parse(d);
      for (const [k, v] of Object.entries(p)) localStorage.setItem(k, v);
    }, ls);
    console.log('Loaded localStorage');
  }

  // 2. 设置 Cookie
  const cookies = JSON.parse(fs.readFileSync('data/.boss-cookies.json', 'utf-8'));
  for (const c of cookies) {
    if (c.sameSite) c.sameSite = 'unspecified';
    await page.setCookie(c);
  }
  console.log(`Set ${cookies.length} cookies`);

  // 3. 访问搜索页
  await page.goto(
    'https://www.zhipin.com/web/geek/jobs?query=AI+Agent&city=101010100',
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );

  await new Promise((r) => setTimeout(r, 6000));

  const url = page.url();
  console.log('URL:', url);

  if (url.includes('verify')) {
    console.log('BLOCKED: security verification');
    // 尝试处理验证
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    console.log('Page text:', bodyText.substring(0, 300));
  } else {
    // 检查 Vue 数据
    const result = await page.evaluate(() => {
      const el = document.querySelector('.page-jobs-main');
      if (el?.__vue__?.jobList) {
        return {
          count: el.__vue__.jobList.length,
          sample: el.__vue__.jobList.slice(0, 3).map((j) => ({
            title: j.jobName,
            company: j.brandName,
            city: j.cityName,
          })),
        };
      }
      return { count: 0, sample: [] };
    });
    console.log('Vue jobs:', result.count);
    if (result.sample.length) {
      console.log('Samples:', JSON.stringify(result.sample, null, 2));
    }
  }

  await browser.close();
})();
