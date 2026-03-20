# Boss 直聘登录检查修复总结

## 问题描述

Boss 直聘爬虫脚本的登录状态检查一直误判已登录的用户为"未登录"，导致脚本无法正常运行。

## 问题分析

### 原始登录检查逻辑（有缺陷）
```javascript
// 检查 localStorage 中的登录状态
const userInfo = localStorage.getItem('__zp_stoken__');
if (!userInfo) return false;

// 检查 Cookie
const hasCookies = cookies && cookies.includes('wt2');

// 检查页面元素
const userElement = document.querySelector('.user-nav, .nav-user, .user-dropdown');
const isLoggedIn = !!userElement;

return isLoggedIn && hasCookies;
```

**问题：**
1. Boss 直聘的登录凭证 (`__zp_stoken__`) 存储在 **Cookie** 中，而不是 localStorage 中
2. 同时要求 localStorage 和 Cookie 都存在，但实际 localStorage 中没有 `__zp_stoken__`
3. 使用 `document.cookie` 检查 Cookie 时，自定义 CDP client 的 `Runtime.evaluate` 返回空值

### 实际登录凭证位置

通过 Puppeteer 测试发现：
- **Cookie**: `wt2` 和 `__zp_stoken__` 都存在 ✅
- **localStorage**: 没有 `__zp_stoken__` ❌
- **登录按钮**: 页面上没有登录按钮 ✅
- **用户导航**: 有 `.user-nav` 元素，包含用户名"龙旭" ✅

**结论：** 用户已登录，但脚本误判为未登录

## 解决方案

### 1. 修改登录检查逻辑

使用 CDP 的 `Network.getCookies` 命令来获取 Cookie，而不是通过 JavaScript `document.cookie`：

```javascript
export async function checkLoginStatus(client) {
  try {
    // 使用 Network.getCookies 命令来获取 Cookie
    const cookiesResult = await client.send('Network.getCookies');
    
    if (!cookiesResult || !cookiesResult.result || !Array.isArray(cookiesResult.result.cookies)) {
      return null;
    }

    const cookies = cookiesResult.result.cookies;
    const hasWt2 = cookies.some(c => c.name === 'wt2');
    const hasStoken = cookies.some(c => c.name === '__zp_stoken__');

    if (hasWt2 && hasStoken) {
      return true;  // 已登录
    }

    return false;  // 未登录
  } catch (error) {
    return null;  // 无法检查
  }
}
```

**优势：**
- 直接通过 CDP 协议获取 Cookie，不需要执行 JavaScript
- 更可靠，不受页面加载状态影响
- 检查两个关键 Cookie：`wt2` 和 `__zp_stoken__`

### 2. 确保 Network domain 已启用

在调用 `checkLoginStatus` 之前，必须先启用 `Network` domain：

#### cmdList 函数
```javascript
await client.send('Network.enable');  // 第605行
await client.send('Page.enable');
// ...
if (!opts.skipLoginCheck) {
  await ensureLogin(client);  // 第620行 - 使用 Network.getCookies
}
```

#### cmdDetail 函数（修复）
```javascript
await client.send('Network.enable');  // 新增

// 检查登录状态
if (!opts.skipLoginCheck) {
  await ensureLogin(client);  // 使用 Network.getCookies
}
```

## 测试结果

### 测试命令
```bash
bun boss.js list --query "AI应用工程师" --city "深圳" --count 15
```

### 输出结果
```
✓ 连接 Tab: https://www.zhipin.com/web/geek/jobs?query=AI%E5%BA%94%E7%94%A8%E5%B7%A5%E7%A8%8B%E5%B8%88&city=101280600

城市: 深圳 (101280600)  关键词: AI应用工程师  计划: 1 轮
目标条数: 15（按每次约15条估算）
输出: /Volumes/new/dev/skill/job-cawler2/boss-scripts/boss/output/boss_AI应用工程师.json

已有 0 条，续跑中...

导航: https://www.zhipin.com/web/geek/jobs?query=AI%E5%BA%94%E7%94%A8%E5%B7%A5%E7%A8%8B%E5%B8%88&city=101280600
等待页面加载...

[滚动 1/1] 等待列表...
  收到 15 条
  接口总数: 300 条
  新增 15 条，补全 0 条，累计 15 条
  已达到目标条数 15

✅ list 完成！已抓 15 / 总数 300 条
```

### 抓取的数据示例
```json
{
  "id": "52d9713b109e6a160nV93t61EVdS",
  "title": "AI应用工程师（AI Agent/内部自动化）",
  "salary": "15-25K",
  "company": "深圳贝酷",
  "city": "深圳",
  "district": "南山区 科技园",
  "experience": "3-5年",
  "degree": "本科",
  "company_size": "100-499人",
  "company_stage": "A轮",
  "boss_name": "熊友龙",
  "boss_title": "招聘者",
  "job_url": "https://www.zhipin.com/job_detail/52d9713b109e6a160nV93t61EVdS.html"
}
```

## 技术细节

### 为什么 Runtime.evaluate 返回空值？

自定义的 CDP client (`src/shared/cdp-client.js`) 在某些情况下无法正确执行 JavaScript 代码。可能的原因：
1. 页面上下文问题
2. 需要等待页面完全加载
3. Execution Context 的配置问题

因此，使用 CDP 原生命令 `Network.getCookies` 是更可靠的选择。

### Cookie 检查的可靠性

Boss 直聘的登录凭证：
- `wt2`: 主要的登录 Cookie
- `__zp_stoken__`: 安全 token

这两个 Cookie 的存在性可以可靠地判断用户是否已登录。

## 相关文件修改

1. `/Volumes/new/dev/skill/job-cawler2/boss-scripts/boss/index.js`
   - 修改 `checkLoginStatus` 函数
   - 在 `cmdDetail` 函数中添加 `Network.enable`

## 总结

通过将登录检查从 DOM/JavaScript 方式改为 CDP `Network.getCookies` 方式，解决了登录状态误判的问题。脚本现在可以正确识别已登录状态，并成功抓取职位数据。

**关键点：**
- Boss 直聘登录凭证在 Cookie 中，不在 localStorage 中
- 使用 CDP `Network.getCookies` 命令代替 `document.cookie`
- 在调用登录检查前必须先启用 `Network` domain
