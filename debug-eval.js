import { createCdpClient } from '../../src/shared/cdp-client.js';
import { writeError, writeLine } from '../../src/shared/runtime.js';

const CDP_PORT = 9222;

async function debugEval() {
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
    
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    
    const result = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const cookies = document.cookie;
          const hasWt2 = cookies && cookies.includes('wt2');
          const hasStoken = cookies && cookies.includes('__zp_stoken__');
          const loginButtons = document.querySelectorAll('a[href*="login"], .login-btn, [class*="login"]');
          const hasLoginButtons = loginButtons.length > 0;
          const isLoggedIn = hasWt2 && hasStoken && !hasLoginButtons;
          return {
            hasWt2,
            hasStoken,
            hasLoginButtons,
            isLoggedIn,
            cookiesLength: cookies ? cookies.length : 0
          };
        })()
      `,
      awaitPromise: false,
      returnByValue: true,
    });

    writeLine('返回结果:', JSON.stringify(result, null, 2));

    if (result.exceptionDetails) {
      writeError('异常:', result.exceptionDetails.text);
    } else {
      writeLine('值:', result.result?.value);
    }
    
    await client.close();
  } catch (error) {
    writeError(`错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

debugEval();
