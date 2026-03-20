import { createCdpClient } from '../../src/shared/cdp-client.js';
import { writeError, writeLine } from '../../src/shared/runtime.js';

const CDP_PORT = 9222;

async function testWithPage() {
  try {
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
    
    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    writeLine('启用后测试:');
    const result = await client.send('Runtime.evaluate', {
      expression: 'document.cookie',
      returnByValue: true,
    });
    writeLine('结果:', JSON.stringify(result, null, 2));
    
    await client.close();
  } catch (error) {
    writeError(`错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

testWithPage();
