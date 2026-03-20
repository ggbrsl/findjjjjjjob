import puppeteer from 'puppeteer';

const CDP_PORT = 9222;

async function checkBossLogin() {
  console.log('正在连接到 Chrome CDP...');

  // 连接到现有的 Chrome 实例
  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://localhost:${CDP_PORT}/devtools/browser/37f479a6-4292-4b68-9c06-b07a190b89cc`,
  });

  // 获取所有页面
  const pages = await browser.pages();
  console.log(`找到 ${pages.length} 个页面:`);
  
  // 查找 Boss 直聘的页面
  let bossPage = pages.find(page => page.url().includes('zhipin.com'));
  
  if (!bossPage) {
    console.log('未找到 Boss 直聘页面，尝试打开...');
    bossPage = await browser.newPage();
    await bossPage.goto('https://www.zhipin.com/web/geek/jobs?query=AI%E5%BA%94%E7%94%A8%E5%B7%A5%E7%A8%8B%E5%B8%88&city=101280600', {
      waitUntil: 'networkidle2',
    });
  } else {
    console.log(`找到 Boss 直聘页面: ${bossPage.url()}`);
  }

  console.log('\n=== 检查登录状态 ===\n');

  // 1. 检查 localStorage
  console.log('1. localStorage:');
  const localStorageData = await bossPage.evaluate(() => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  });

  const localStorageKeys = Object.keys(localStorageData);
  if (localStorageKeys.length > 0) {
    localStorageKeys.forEach(key => console.log(`   - ${key}`));
    
    const zpStoken = localStorageData['__zp_stoken__'];
    const zpToken = localStorageData['__zp_token__'];
    
    console.log(`\n   __zp_stoken__: ${zpStoken ? '✓ 存在' : '✗ 不存在'}`);
    console.log(`   __zp_token__: ${zpToken ? '✓ 存在' : '✗ 不存在'}`);
  } else {
    console.log('   (空)');
  }

  // 2. 检查 Cookie
  console.log('\n2. Cookie:');
  const cookies = await bossPage.cookies();
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
  const navElements = await bossPage.$$('nav');
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
        const firstElementText = await elements[0].evaluate(el => el.textContent);
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

  if (loginButtons.length > 0) {
    for (let i = 0; i < Math.min(loginButtons.length, 3); i++) {
      const text = await loginButtons[i].evaluate(el => el.textContent);
      const href = await loginButtons[i].evaluate(el => el.getAttribute('href'));
      console.log(`   - 按钮 ${i + 1}: "${text.trim()}" -> ${href}`);
    }
  }

  // 5. 获取导航栏的完整HTML
  console.log('\n5. 导航栏 HTML (前500字符):');
  try {
    const navElement = await bossPage.$('nav, header, [class*="nav"]');
    if (navElement) {
      const navHTML = await navElement.evaluate(el => el.outerHTML.substring(0, 500));
      console.log(`   ${navHTML || '(未找到)'}`);
    } else {
      console.log('   (未找到)');
    }
  } catch (e) {
    console.log('   (获取失败)');
  }

  // 6. 检查是否有用户头像
  console.log('\n6. 用户头像:');
  const avatarElements = await bossPage.$$('[class*="avatar"], img[src*="avatar"]');
  console.log(`   找到 ${avatarElements.length} 个头像元素`);

  // 7. 总结登录状态
  console.log('\n=== 登录状态总结 ===');
  const hasStoken = localStorageKeys.includes('__zp_stoken__');
  const hasRelevantCookies = relevantCookies.length > 0;
  const hasLoginButtons = loginButtons.length > 0;
  
  console.log(`   localStorage __zp_stoken__: ${hasStoken ? '✓' : '✗'}`);
  console.log(`   相关 cookies: ${hasRelevantCookies ? '✓' : '✗'}`);
  console.log(`   登录按钮: ${hasLoginButtons ? '✗ 有 (未登录)' : '✓ 无'}`);
  
  if (hasStoken && hasRelevantCookies && !hasLoginButtons) {
    console.log('\n✓ 已登录');
  } else if (hasLoginButtons) {
    console.log('\n✗ 未登录 (发现登录按钮)');
  } else if (!hasStoken || !hasRelevantCookies) {
    console.log('\n✗ 未登录 (缺少登录凭证)');
  } else {
    console.log('\n⚠ 无法确定登录状态');
  }

  // 断开连接，但不关闭浏览器
  await browser.disconnect();
}

checkBossLogin().catch(error => {
  console.error('错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});
