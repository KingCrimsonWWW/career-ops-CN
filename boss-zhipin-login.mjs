#!/usr/bin/env node

/**
 * boss-zhipin-login.mjs — BOSS直聘登录助手
 *
 * 打开非隐身浏览器，导航到 BOSS 直聘首页，等待用户扫码登录，
 * 登录成功后保存 storageState 供后续浏览器抓取复用。
 *
 * Usage:
 *   node boss-zhipin-login.mjs          # 打开浏览器登录
 *   node boss-zhipin-login.mjs --check  # 检查登录状态是否有效
 */

import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const STATE_PATH = path.resolve('data/.boss-zhipin-state.json');
const BOSS_URL = 'https://www.zhipin.com/';

// 登录成功的标志：页面中出现用户头像或"我的简历"等已登录元素
const LOGIN_SUCCESS_SELECTORS = [
  '.user-nav .nav-figure img',    // 用户头像
  '.user-nav .nav-figure',        // 用户头像容器
  '[class*="header-login"]',      // 已登录状态
  'a[href*="/web/geek/chat"]',    // 聊天链接（需登录）
];

// 超时时间：给用户足够时间扫码
const LOGIN_TIMEOUT_MS = 120_000; // 2 分钟

async function checkLogin() {
  if (!existsSync(STATE_PATH)) {
    console.log('❌ 未找到登录状态文件');
    console.log(`   路径: ${STATE_PATH}`);
    console.log('   请先运行: node boss-zhipin-login.mjs');
    process.exit(1);
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ storageState: STATE_PATH });
    const page = await context.newPage();

    await page.goto(BOSS_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(3000);

    // 检查是否已登录
    let loggedIn = false;
    for (const selector of LOGIN_SUCCESS_SELECTORS) {
      try {
        const el = await page.$(selector);
        if (el) {
          loggedIn = true;
          break;
        }
      } catch {
        // selector not found, continue
      }
    }

    // 也检查页面文本
    if (!loggedIn) {
      const bodyText = await page.evaluate(() => document.body?.innerText || '');
      loggedIn = bodyText.includes('我的简历') || bodyText.includes('在线') || bodyText.includes('退出');
    }

    if (loggedIn) {
      console.log('✅ 登录状态有效');
      // 刷新 storageState
      await context.storageState({ path: STATE_PATH });
      console.log('   已刷新登录状态');
    } else {
      console.log('⚠️  登录状态可能已过期，建议重新登录');
      console.log('   运行: node boss-zhipin-login.mjs');
    }
  } finally {
    await browser.close();
  }
}

async function doLogin() {
  console.log('🚀 BOSS直聘登录助手');
  console.log('');
  console.log('即将打开浏览器，请完成以下步骤：');
  console.log('  1. 在浏览器中登录 BOSS 直聘（扫码或手机号）');
  console.log('  2. 确认页面显示你的头像或"我的简历"');
  console.log('  3. 回到终端，按 Enter 保存登录状态');
  console.log('');

  // 确保 data 目录存在
  mkdirSync('data', { recursive: true });

  const { chromium } = await import('playwright');
  const readline = await import('readline');
  const { existsSync } = await import('fs');

  // 使用系统 Chrome 而非 Playwright 自带 Chromium
  // BOSS 直聘会检测 Playwright Chromium 特征
  const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ];

  let executablePath;
  for (const p of CHROME_PATHS) {
    if (existsSync(p)) { executablePath = p; break; }
  }

  if (!executablePath) {
    console.error('❌ 未找到 Chrome，请安装 Google Chrome 后重试');
    process.exit(1);
  }

  console.log(`   使用 Chrome: ${executablePath}`);

  // 用临时用户数据目录，不污染用户本身的 Chrome 配置
  const tmpDir = path.resolve('data/.boss-chrome-profile');

  const browser = await chromium.launch({
    headless: false,
    executablePath,
    channel: undefined,  // 不用 Playwright 内置的
    args: [
      `--user-data-dir=${tmpDir}`,
      '--disable-blink-features=AutomationControlled',
      '--disable-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // 注入反检测脚本
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete window.__playwright;
      delete window.__pw_manual;
    });

    console.log('📍 正在打开 BOSS 直聘...');
    await page.goto(BOSS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    console.log('');
    console.log('✅ 浏览器已打开，请登录 BOSS 直聘');
    console.log('');

    // 等待用户在终端按 Enter
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => {
      rl.question('   登录完成后，回到这里按 Enter → ', () => {
        rl.close();
        resolve();
      });
    });

    // 保存登录状态
    await context.storageState({ path: STATE_PATH });
    console.log('');
    console.log('✅ 登录状态已保存到:');
    console.log(`   ${STATE_PATH}`);
    console.log('');
    console.log('现在可以运行扫描:');
    console.log('   node scan.mjs --company "BOSS直聘"');

  } finally {
    await browser.close();
  }
}

// Main
const args = process.argv.slice(2);
if (args.includes('--check')) {
  checkLogin().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
} else {
  doLogin().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
