#!/usr/bin/env node

/**
 * boss-zhipin-login.mjs — BOSS直聘登录助手
 *
 * 使用 puppeteer-extra + stealth 插件打开浏览器，
 * 完全复制 GeekGeekRun 的登录流程。
 *
 * Usage:
 *   node boss-zhipin-login.mjs          # 打开浏览器登录
 *   node boss-zhipin-login.mjs --check  # 检查登录状态是否有效
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const COOKIES_PATH = path.resolve('data/.boss-cookies.json');
const LOCAL_STORAGE_PATH = path.resolve('data/.boss-local-storage.json');
const BOSS_URL = 'https://www.zhipin.com/web/user/';

async function initPuppeteer() {
  const puppeteer = (await import('puppeteer-extra')).default;
  const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
  const AnonymizeUaPlugin = (await import('puppeteer-extra-plugin-anonymize-ua')).default;

  puppeteer.use(StealthPlugin());
  puppeteer.use(AnonymizeUaPlugin({ makeWindows: false }));

  return puppeteer;
}

async function checkLogin() {
  if (!existsSync(COOKIES_PATH)) {
    console.log('❌ 未找到 Cookie 文件，请先运行: node boss-zhipin-login.mjs');
    process.exit(1);
  }

  const puppeteer = await initPuppeteer();
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = (await browser.pages())[0];
    const cookies = JSON.parse(readFileSync(COOKIES_PATH, 'utf-8'));
    for (const c of cookies) {
      if (Object.hasOwn(c, 'sameSite')) c.sameSite = 'unspecified';
      await page.setCookie(c);
    }

    await page.goto('https://www.zhipin.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    // 通过 API 验证登录态
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('https://www.zhipin.com/wapi/zpuser/wap/getUserInfo.json');
        return await res.json();
      } catch { return { code: -1 }; }
    });

    if (response?.code === 0) {
      console.log('✅ 登录状态有效');
    } else {
      console.log('⚠️  登录状态已过期，请重新登录: node boss-zhipin-login.mjs');
    }
  } finally {
    await browser.close();
  }
}

async function doLogin() {
  console.log('🚀 BOSS直聘登录助手');
  console.log('');
  console.log('  1. 浏览器打开后，登录 BOSS 直聘（扫码或手机号）');
  console.log('  2. 登录成功后，回到终端按 Enter 保存');
  console.log('');

  mkdirSync('data', { recursive: true });

  const puppeteer = await initPuppeteer();
  const readline = await import('readline');

  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    defaultViewport: null,
    args: ['--window-size=1440,900'],
  });

  try {
    const [page] = await browser.pages();

    // 监听登录成功的 API 响应（与 GeekGeekRun 相同的检测方式）
    let loginDetected = false;
    page.on('response', async (response) => {
      const url = response.url();
      if (
        url.startsWith('https://www.zhipin.com/wapi/zppassport/qrcode/loginConfirm') ||
        url.startsWith('https://www.zhipin.com/wapi/zppassport/qrcode/dispatcher') ||
        url.startsWith('https://www.zhipin.com/wapi/zppassport/login/phoneV2')
      ) {
        loginDetected = true;
        console.log('   🔔 检测到登录请求，请稍候...');
      }
    });

    await page.goto(BOSS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('✅ 浏览器已打开，请登录');
    console.log('');

    // 等用户按 Enter
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => {
      rl.question('   登录完成后按 Enter → ', () => { rl.close(); resolve(); });
    });

    // 保存 Cookie
    const cookies = await page.cookies();
    writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));

    // 保存 localStorage
    const localStorage = await page.evaluate(() => {
      try { return JSON.stringify(window.localStorage); } catch { return '{}'; }
    });
    writeFileSync(LOCAL_STORAGE_PATH, localStorage);

    console.log('');
    console.log(`✅ 已保存 ${cookies.length} 个 Cookie`);
    console.log('   现在可以运行: node scan.mjs --company "BOSS直聘"');

  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);
if (args.includes('--check')) {
  checkLogin().catch(err => { console.error('Error:', err.message); process.exit(1); });
} else {
  doLogin().catch(err => { console.error('Error:', err.message); process.exit(1); });
}
