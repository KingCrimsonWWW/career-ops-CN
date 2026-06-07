#!/usr/bin/env node

/**
 * boss-zhipin-login.mjs — BOSS直聘登录助手
 *
 * 使用系统 Chrome 打开 BOSS 直聘，等待用户手动登录后按 Enter 保存状态。
 *
 * Usage:
 *   node boss-zhipin-login.mjs          # 打开浏览器登录
 *   node boss-zhipin-login.mjs --check  # 检查登录状态是否有效
 */

import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const STATE_PATH = path.resolve('data/.boss-zhipin-state.json');
const CHROME_PROFILE = path.resolve('data/.boss-chrome-profile');
const BOSS_URL = 'https://www.zhipin.com/';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

async function checkLogin() {
  if (!existsSync(STATE_PATH)) {
    console.log('❌ 未找到登录状态文件，请先运行: node boss-zhipin-login.mjs');
    process.exit(1);
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: STATE_PATH });
    const page = await context.newPage();
    await page.goto(BOSS_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(3000);
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const loggedIn = bodyText.includes('我的简历') || bodyText.includes('退出');
    if (loggedIn) {
      console.log('✅ 登录状态有效');
    } else {
      console.log('⚠️  登录状态可能已过期，请重新登录: node boss-zhipin-login.mjs');
    }
  } finally {
    await browser.close();
  }
}

async function doLogin() {
  console.log('🚀 BOSS直聘登录助手');
  console.log('');

  mkdirSync('data', { recursive: true });

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('❌ 未找到 Chrome，请安装 Google Chrome');
    process.exit(1);
  }
  console.log(`   Chrome: ${chromePath}`);
  console.log('');

  const { chromium } = await import('playwright');
  const readline = await import('readline');

  // launchPersistentContext: Playwright 要求持久化 profile 用这个 API
  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    headless: false,
    executablePath: chromePath,
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
    ],
  });

  try {
    const page = context.pages()[0] || await context.newPage();

    // 注入反检测
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('📍 正在打开 BOSS 直聘...');
    await page.goto(BOSS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    console.log('');
    console.log('✅ 浏览器已打开，请登录 BOSS 直聘');
    console.log('   登录完成后回到这里按 Enter');
    console.log('');

    // 等用户按 Enter
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => {
      rl.question('   按 Enter 保存登录状态 → ', () => { rl.close(); resolve(); });
    });

    // 保存
    await context.storageState({ path: STATE_PATH });
    console.log('');
    console.log('✅ 已保存！现在可以运行:');
    console.log('   node scan.mjs --company "BOSS直聘"');

  } finally {
    await context.close();
  }
}

const args = process.argv.slice(2);
if (args.includes('--check')) {
  checkLogin().catch(err => { console.error('Error:', err.message); process.exit(1); });
} else {
  doLogin().catch(err => { console.error('Error:', err.message); process.exit(1); });
}
