import playwright from 'playwright';

const CDP_PORT = 9222;

async function checkBossLogin() {
  console.log('正在连接到 Chrome CDP...');

  // 获取 WebSocket URL
  const versionResponse = await fetch(`http://localhost:${CDP_PORT}/json/version`);
  const versionData = await versionResponse.json();
  const wsUrl = versionData.webSocketDebuggerUrl;
  
  console.log(`WebSocket URL: ${wsUrl}`);

  // 连接到现有的 Chrome 实例
  const browser = await playwright.chromium.connectOverCDP(wsUrl);
  
  // 获取所有页面
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = await context.pages();
  
  // 查找 Boss 直聘的页面
  let bossPage = pages.find(page => page.url().includes('zhipin.com'));
  
  if (!bossPage) {
    console.log('未找到 Boss 直聘页面，尝试打开...');
    bossPage = await context.newPage();
    await bossPage.goto('https://www.zhipin.com/web/geek/jobs?query=AI%E5%BA%94%E7%94%A8%E5%B7%A5%E7%A8%8B%E5%B8%88&city=101280600');
    await bossPage.waitForLoadState('networkidle');
  } else {
    console.log(`找到 Boss 直聘页面: ${bossPage.url()}`);
  }

  console.log('\n=== 检查登录状态 ===\n');

  // 1. 检查 localStorage
  console.log('1. localStorage:');
  const localStorageKeys = await bossPage.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i));
    }
    return keys;
  });

  if (localStorageKeys.length > 0) {
    localStorageKeys.forEach(key => console.log(`   - ${key}`));
    
    const zpStoken = await bossPage.evaluate(() => localStorage.getItem('__zp_stoken__'));
    const zpToken = await bossPage.evaluate(() => localStorage.getItem('__zp_token__'));
    
    console.log(`\n   __zp_stoken__: ${zpStoken ? '✓ 存在' : '✗ 不存在'}`);
    console.log(`   __zp_token__: ${zpToken ? '✓ 存在' : '✗ 不存在'}`);
  } else {
    console.log('   (空)');
  }

  // 2. 检查 Cookie
  console.log('\n2. Cookie:');
  const cookies = await context.cookies();
  const relevantCookies = cookies.filter(c => 
    c.name.includes('wt2') || 
    c.name.includes('zp') ||
    c.name.includes('token') ||
    c.name.includes('stoken')
  );
  
  if (relevantCookies.length > 0) {
    relevantCookies.forEach(cookie => {
      console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
    });
  } else {
    console.log('   (未找到相关 cookie)');
  }

  // 3. 检查页面上的用户元素
  console.log('\n3. 查找用户相关元素:');
  
  // 检查导航栏
  const navElements = await bossPage.$$eval('nav', elements => {
    return elements.map(el => el.className);
  });
  console.log(`   找到 ${navElements.length} 个 nav 元素`);
  
  // 查找所有可能的用户选择器
  const selectors = [
    '.user-nav',
    '.nav-user', 
    '.user-dropdown',
    '[class*="user"]',
    '.header-user',
    '.geek-nav',
    'span.user-name',
    'a.user-name',
  ];
  
  for (const selector of selectors) {
    try {
      const elements = await bossPage.$$(selector);
      if (elements.length > 0) {
        console.log(`   选择器 "${selector}": ✓ 找到 ${elements.length} 个`);
        
        // 获取第一个元素的文本
        const firstElementText = await elements[0].textContent();
        if (firstElementText && firstElementText.trim()) {
          console.log(`     文本内容: ${firstElementText.trim()}`);
        }
      }
    } catch (e) {
      // 忽略无效选择器
    }
  }

  // 4. 检查是否有登录按钮（如果未登录会有登录按钮）
  console.log('\n4. 检查登录按钮:');
  const loginButtons = await bossPage.$$('a[href*="login"], .login-btn, [class*="login"]');
  console.log(`   找到 ${loginButtons.length} 个登录相关按钮`);

  // 5. 获取导航栏的完整HTML
  console.log('\n5. 导航栏 HTML (前500字符):');
  const navHTML = await bossPage.$eval('nav, header, [class*="nav"]', el => el.outerHTML.substring(0, 500));
  console.log(`   ${navHTML || '(未找到)'}`);

  // 6. 检查是否有用户头像
  console.log('\n6. 用户头像:');
  const avatarElements = await bossPage.$$('[class*="avatar"], img[src*="avatar"]');
  console.log(`   找到 ${avatarElements.length} 个头像元素`);

  // 7. 总结登录状态
  console.log('\n=== 登录状态总结 ===');
  const hasStoken = localStorageKeys.includes('__zp_stoken__');
  const hasRelevantCookies = relevantCookies.length > 0;
  const hasLoginButtons = loginButtons.length > 0;
  
  if (hasStoken && hasRelevantCookies && !hasLoginButtons) {
    console.log('✓ 已登录');
  } else if (hasLoginButtons) {
    console.log('✗ 未登录 (发现登录按钮)');
  } else if (!hasStoken || !hasRelevantCookies) {
    console.log('✗ 未登录 (缺少登录凭证)');
  } else {
    console.log('⚠ 无法确定登录状态');
  }

  // 断开连接，但不关闭浏览器
  await browser.close();
}

checkBossLogin().catch(error => {
  console.error('错误:', error.message);
  process.exit(1);
});
