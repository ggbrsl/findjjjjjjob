import { createCdpClient } from '../../src/shared/cdp-client.js';
import { checkLoginStatus } from './index.js';
import { writeError, writeLine } from '../../src/shared/runtime.js';

const CDP_PORT = 9222;

async function testLoginCheck() {
  try {
    // 获取 Boss 直聘的 tab
    const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await response.json();
    const bossPage = targets.find((item) => item.type === 'page' && item.url.includes('zhipin.com'));
    
    if (!bossPage) {
      writeError('未找到 zhipin.com 的 Tab');
      process.exit(1);
    }

    writeLine(`连接到: ${bossPage.url}`);
    const client = createCdpClient(bossPage.webSocketDebuggerUrl);
    
    // 启用必要的 domains
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    
    // 检查登录状态
    const isLoggedIn = await checkLoginStatus(client);
    
    if (isLoggedIn === null) {
      writeLine('⚠️ 无法确定登录状态（页面未加载）');
    } else if (isLoggedIn) {
      writeLine('✓ 已登录');
    } else {
      writeLine('✗ 未登录');
    }
    
    await client.close();
  } catch (error) {
    writeError(`错误: ${error.message}`);
    process.exit(1);
  }
}

testLoginCheck();
