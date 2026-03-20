#!/usr/bin/env node

import { checkCdpConnection } from './index.js';

const port = 9222;

async function test() {
  console.log('🔍 检查 CDP 连接...');

  const connected = await checkCdpConnection(port);
  console.log(connected ? '✅ CDP 已连接' : '❌ CDP 未连接');

  console.log('\n✅ 测试完成!');
  console.log('提示: 运行 "bun boss.js list --query 测试" 时会自动启动 Chrome(如果未运行)');
  process.exit(0);
}

test().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
