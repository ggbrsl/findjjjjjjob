import { createCdpClient } from '../../src/shared/cdp-client.js';
import { writeError, writeLine } from '../../src/shared/runtime.js';

const CDP_PORT = 9222;

async function testBasicEval() {
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
    
    // 不等待，直接启用
    await client.send('Runtime.enable');
    
    writeLine('测试 1: 简单字符串');
    const result1 = await client.send('Runtime.evaluate', {
      expression: '"hello world"',
      returnByValue: true,
    });
    writeLine('结果 1:', JSON.stringify(result1, null, 2));

    writeLine('\n测试 2: 简单数字');
    const result2 = await client.send('Runtime.evaluate', {
      expression: '123',
      returnByValue: true,
    });
    writeLine('结果 2:', JSON.stringify(result2, null, 2));

    writeLine('\n测试 3: document.title');
    const result3 = await client.send('Runtime.evaluate', {
      expression: 'document.title',
      returnByValue: true,
    });
    writeLine('结果 3:', JSON.stringify(result3, null, 2));

    writeLine('\n测试 4: document.cookie');
    const result4 = await client.send('Runtime.evaluate', {
      expression: 'document.cookie',
      returnByValue: true,
    });
    writeLine('结果 4:', result4.result?.value ? '存在' : '不存在');
    if (result4.result?.value) {
      writeLine('Cookie 长度:', result4.result.value.length);
    }

    writeLine('\n测试 5: 复杂表达式');
    const result5 = await client.send('Runtime.evaluate', {
      expression: '(() => { return { a: 1, b: 2 }; })()',
      returnByValue: true,
    });
    writeLine('结果 5:', JSON.stringify(result5, null, 2));
    
    await client.close();
  } catch (error) {
    writeError(`错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

testBasicEval();
