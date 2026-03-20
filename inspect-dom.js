import { createCdpClient } from '../../src/shared/cdp-client.js';
import { writeError, writeLine } from '../../src/shared/runtime.js';
import { ensureChromeReady } from './index.js';

const CDP_PORT = 9222;

async function inspectBossDOM() {
  await ensureChromeReady(CDP_PORT, true);

  // 检查是否有zhipin.com的tab
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const targets = await response.json();
  const page = targets.find((item) => item.type === 'page' && item.url.includes('zhipin.com'));

  if (!page) {
    writeError('未找到 zhipin.com 的 Tab');
    writeError('当前页面:');
    targets.filter((item) => item.type === 'page').forEach((item) => {
      writeLine(`  ${item.url}`);
    });
    process.exit(1);
  }

  writeLine(`连接到: ${page.url}`);
  const client = createCdpClient(page.webSocketDebuggerUrl);

  // 启用必要的domains
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  // 检查各种登录状态
  writeLine('\n=== 检查登录状态 ===\n');

  const checks = await client.send('Runtime.evaluate', {
    expression: `
      (async () => {
        try {
          const results = { success: true };

          // 1. 检查 localStorage
          results.localStorageKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            results.localStorageKeys.push(localStorage.key(i));
          }
          results.zpStoken = localStorage.getItem('__zp_stoken__');
          results.zpToken = localStorage.getItem('__zp_token__');

          // 2. 检查 cookie
          results.cookie = document.cookie;

          // 3. 查找可能的用户元素 - 尝试各种选择器
          const selectors = [
            '.user-nav',
            '.nav-user',
            '.user-dropdown',
            '[class*="user"]',
            '[class*="User"]',
            '.nav-right',
            '.header-user',
            '[class*="nav"] [class*="user"]',
            '.geek-nav',
            'nav[class*="user"]',
            'span[class*="user"]',
          ];

          results.elements = [];
          selectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                results.elements.push({
                  selector: selector,
                  count: elements.length,
                  html: Array.from(elements).map(el => el.outerHTML.substring(0, 200)).join('\n')
                });
              }
            } catch (e) {
              // 忽略无效选择器
            }
          });

          // 4. 查找所有可能相关的class
          const allElements = document.querySelectorAll('[class]');
          const relevantClasses = new Set();
          allElements.forEach(el => {
            el.className.split(' ').forEach(cls => {
              if (cls.toLowerCase().includes('user') ||
                  cls.toLowerCase().includes('nav') ||
                  cls.toLowerCase().includes('login')) {
                relevantClasses.add(cls);
              }
            });
          });
          results.relevantClasses = Array.from(relevantClasses).slice(0, 20);

          // 5. 检查导航栏
          try {
            const nav = document.querySelector('nav') || document.querySelector('[class*="nav"]');
            if (nav) {
              results.navHTML = nav.outerHTML.substring(0, 500);
            }
          } catch (e) {}

          // 6. 检查头部
          try {
            const header = document.querySelector('header') || document.querySelector('[class*="header"]');
            if (header) {
              results.headerHTML = header.outerHTML.substring(0, 500);
            }
          } catch (e) {}

          // 7. 尝试查找用户头像或用户名
          try {
            const avatar = document.querySelector('[class*="avatar"]');
            if (avatar) {
              results.avatarHTML = avatar.outerHTML.substring(0, 300);
            }
          } catch (e) {}

          return results;
        } catch (error) {
          return { error: error.message };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true,
  });

  const data = checks.result?.value;

  if (!data || data.error) {
    writeError(`执行出错: ${data?.error || '未知错误'}`);
    await client.close();
    process.exit(1);
  }

  writeLine('1. localStorage 中的 keys:');
  if (data.localStorageKeys && data.localStorageKeys.length > 0) {
    data.localStorageKeys.forEach(key => writeLine(`   - ${key}`));
  } else {
    writeLine('   (空)');
  }

  writeLine('\n2. 登录相关 localStorage 值:');
  writeLine(`   __zp_stoken__: ${data.zpStoken ? '存在' : '不存在'}`);
  writeLine(`   __zp_token__: ${data.zpToken ? '存在' : '不存在'}`);

  writeLine('\n3. Cookie (前200字符):');
  writeLine(`   ${data.cookie ? data.cookie.substring(0, 200) + '...' : '(空)'}`);

  writeLine('\n4. 找到的用户相关元素:');
  if (data.elements && data.elements.length > 0) {
    data.elements.forEach(item => {
      writeLine(`   选择器 "${item.selector}": 找到 ${item.count} 个`);
      writeLine(`   HTML: ${item.html.substring(0, 100)}`);
    });
  } else {
    writeLine('   (未找到)');
  }

  writeLine('\n5. 相关的 class 名称:');
  if (data.relevantClasses && data.relevantClasses.length > 0) {
    data.relevantClasses.forEach(cls => writeLine(`   - ${cls}`));
  } else {
    writeLine('   (未找到)');
  }

  writeLine('\n6. 导航栏 HTML:');
  writeLine(`   ${data.navHTML || '(未找到)'}`);

  writeLine('\n7. 头部 HTML:');
  writeLine(`   ${data.headerHTML || '(未找到)'}`);

  writeLine('\n8. 头像元素:');
  writeLine(`   ${data.avatarHTML || '(未找到)'}`);

  await client.close();
  writeLine('\n✅ DOM 检查完成');
}

inspectBossDOM().catch(error => {
  writeError(`错误: ${error.message}`);
  process.exit(1);
});
