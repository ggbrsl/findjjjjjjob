import puppeteer from 'puppeteer';

const CDP_PORT = 9222;

async function testSimpleLogin() {
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

  // 分步检查
  console.log('1. 检查 Cookie:');
  const cookies = await bossPage.cookies();
  const wt2 = cookies.find(c => c.name === 'wt2');
  const stoken = cookies.find(c => c.name === '__zp_stoken__');
  console.log(`   wt2: ${wt2 ? '✓ 存在' : '✗ 不存在'}`);
  console.log(`   __zp_stoken__: ${stoken ? '✓ 存在' : '✗ 不存在'}`);

  console.log('\n2. 检查登录按钮:');
  const loginButtons = await bossPage.$$('a[href*="login"], .login-btn, [class*="login"]');
  console.log(`   找到 ${loginButtons.length} 个登录按钮`);

  console.log('\n3. 检查用户导航:');
  const userNav = await bossPage.$('.user-nav');
  console.log(`   user-nav: ${userNav ? '✓ 存在' : '✗ 不存在'}`);

  console.log('\n4. 判断登录状态:');
  const hasWt2 = !!wt2;
  const hasStoken = !!stoken;
  const hasLoginButtons = loginButtons.length > 0;
  const isLoggedIn = hasWt2 && hasStoken && !hasLoginButtons;

  console.log(`   hasWt2: ${hasWt2}`);
  console.log(`   hasStoken: ${hasStoken}`);
  console.log(`   hasLoginButtons: ${hasLoginButtons}`);
  console.log(`   isLoggedIn: ${isLoggedIn}`);

  console.log('\n=== 结果 ===');
  if (isLoggedIn) {
    console.log('✓ 已登录');
  } else {
    console.log('✗ 未登录');
  }

  await browser.disconnect();
}

testSimpleLogin().catch(error => {
  console.error('错误:', error.message);
  process.exit(1);
});
