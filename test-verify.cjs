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
    headless: false, pipe: true, defaultViewport: null,
    args: ['--window-size=1440,900'],
  });
  const page = (await browser.pages())[0];

  await page.goto('https://www.zhipin.com/desktop/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  if (fs.existsSync('data/.boss-local-storage.json')) {
    const ls = fs.readFileSync('data/.boss-local-storage.json', 'utf-8');
    await page.evaluate((d) => {
      const p = JSON.parse(d);
      for (const [k, v] of Object.entries(p)) localStorage.setItem(k, v);
    }, ls);
  }
  const cookies = JSON.parse(fs.readFileSync('data/.boss-cookies.json', 'utf-8'));
  for (const c of cookies) { if (c.sameSite) c.sameSite = 'unspecified'; await page.setCookie(c); }

  await page.goto('https://www.zhipin.com/web/geek/jobs?query=AI+Agent&city=101010100', {
    waitUntil: 'domcontentloaded', timeout: 20000,
  });
  await new Promise(r => setTimeout(r, 3000));

  const url = page.url();
  console.log('URL:', url);

  if (url.includes('verify')) {
    console.log('Verify page detected. Taking screenshot...');
    await page.screenshot({ path: 'data/verify-page.png' });
    const elements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, [role=button], div[class*=btn]')).map(el => ({
        tag: el.tagName, text: (el.innerText||'').trim().substring(0,50), cls: el.className.substring(0,80)
      }));
    });
    console.log('Elements:', JSON.stringify(elements, null, 2));
  } else {
    const result = await page.evaluate(() => {
      const el = document.querySelector('.page-jobs-main');
      return el?.__vue__?.jobList?.length || 0;
    });
    console.log('Jobs found:', result);
  }

  await browser.close();
})();
