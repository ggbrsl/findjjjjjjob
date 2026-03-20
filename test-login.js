#!/usr/bin/env node

import { createCdpClient } from '../../src/shared/cdp-client.js';
import { checkCdpConnection, checkLoginStatus } from './index.js';

const port = 9222;

async function testLogin() {
  console.log('🔍 测试登录状态检查...\n');

  // 1. 检查 CDP 连接
  console.log('1️⃣ 检查 CDP 连接...');
  const connected = await checkCdpConnection(port);
  console.log(connected ? '✅ CDP 已连接' : '❌ CDP 未连接');

  if (!connected) {
    console.error('❌ Chrome 未运行,无法测试登录状态');
    console.log('请先启动 Chrome:');
    console.log('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=$HOME/boss-chrome-profile');
    process.exit(1);
  }

  // 2. 获取 CDP 列表
  console.log('\n2️⃣ 获取 Chrome 页面列表...');
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await response.json();

  const zhipinPage = targets.find((item) => item.type === 'page' && item.url.includes('zhipin.com'));

  if (!zhipinPage) {
    console.warn('⚠️  未找到 Boss 直聘页面,无法检查登录状态');
    console.log('提示: 请先在 Chrome 中打开 https://www.zhipin.com');
    process.exit(0);
  }

  console.log(`✅ 找到页面: ${zhipinPage.url}`);

  // 3. 连接 CDP 客户端
  console.log('\n3️⃣ 连接 CDP 客户端...');
  const client = createCdpClient(zhipinPage.webSocketDebuggerUrl);
  console.log('✅ 已连接');

  // 4. 启用必要的域
  console.log('\n4️⃣ 启用 Page 域...');
  await client.send('Page.enable');
  console.log('✅ Page 域已启用');

  // 5. 检查登录状态
  console.log('\n5️⃣ 检查登录状态...');
  const isLoggedIn = await checkLoginStatus(client);

  if (isLoggedIn === null) {
    console.warn('⚠️  页面未完全加载,无法检查登录状态');
  } else if (isLoggedIn) {
    console.log('✅ 已登录 Boss 直聘');
  } else {
    console.log('❌ 未登录 Boss 直聘');
    console.log('\n请登录后重试:');
    console.log('  1. 在 Chrome 中访问: https://www.zhipin.com');
    console.log('  2. 点击右上角"登录/注册"');
    console.log('  3. 完成登录');
  }

  // 6. 关闭连接
  await client.close();

  console.log('\n✅ 测试完成!');
}

testLogin().catch(error => {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
});
