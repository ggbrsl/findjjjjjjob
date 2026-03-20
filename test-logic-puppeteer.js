import puppeteer from 'puppeteer';

const CDP_PORT = 9222;

async function testLoginLogic() {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://localhost:${CDP_PORT}/devtools/browser/37f479a6-4292-4b68-9c06-b07a190b89cc`,
  });

  const pages = await browser.pages();
  const bossPage = pages.find(page => page.url().includes('zhipin.com'));
  
  if (!bossPage) {
    console.log('未找到 Boss 直聘页面');
    await browser.disconnect();
    process.exit(1);
  }

  console.log(`页面: ${bossPage.url()}\n`);

  // 测试修复后的登录检查逻辑
  const isLoggedIn = await bossPage.evaluate(() => {
    // 检查 Cookie 中是否有必要的登录信息
    const cookies = document.cookie;
    const hasWt2 = cookies && cookies.includes('wt2');
    const hasStoken = cookies && cookies.includes('__zp_stoken__');

    console.log('hasWt2:', hasWt2);
    console.log('hasStoken:', hasStoken);

    // 检查页面上是否有登录按钮（如果有登录按钮，说明未登录）
    const loginButtons = document.querySelectorAll('a[href*="login"], .login-btn, [class*="login"]');
    const hasLoginButtons = loginButtons.length > 0;
    console.log('hasLoginButtons:', hasLoginButtons);

    // 检查页面上是否有用户元素（如有用户名、头像等）
    const userNav = document.querySelector('.user-nav');
    const hasUserNav = !!userNav;
    console.log('hasUserNav:', hasUserNav);

    // 登录判断：有 Cookie + 无登录按钮 = 已登录
    return hasWt2 && hasStoken && !hasLoginButtons;
  });

  console.log('\n=== 结果 ===');
  if (isLoggedIn) {
    console.log('✓ 已登录');
  } else {
    console.log('✗ 未登录');
  }

  await browser.disconnect();
}

testLoginLogic().catch(error => {
  console.error('错误:', error.message);
  process.exit(1);
});
