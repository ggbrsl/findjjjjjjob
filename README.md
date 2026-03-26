# 快速上手

## 前置条件

- Node.js 18+
- macOS（其他系统需修改 Chrome 路径）

---

## 首次使用（新用户）

**第一步：启动专用 Chrome**

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=$HOME/boss-chrome-profile
```

**第二步：在弹出的 Chrome 中登录 Boss 直聘**

访问 `https://www.zhipin.com`，完成登录。

**第三步：运行脚本**

```bash
node boss.js list --query "前端开发" --city "杭州"
```

---

## 日常使用（已登录过）

每次使用前先启动 Chrome（登录态会自动复用）：

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=$HOME/boss-chrome-profile
```

然后运行命令即可。

---

## 常用命令

```bash
# 抓取职位列表（默认 5 页）
node boss.js list --query "前端开发" --city "杭州"

# 抓更多页
node boss.js list --query "前端开发" --city "杭州" --page 10

# 网络慢或被限速时用慢速模式
node boss.js list --query "前端开发" --city "杭州" --slow

# 补抓职位详情（JD 正文）
node boss.js detail --input ./output/boss_前端开发.json
```

输出文件默认保存在 `./output/` 目录。

---

## 排查问题

**脚本提示"Chrome 启动超时"**：说明 Chrome 未以调试模式运行，按上面步骤手动启动。

**确认 Chrome 是否就绪**：
```bash
curl http://localhost:9222/json/version
```
有 JSON 返回则正常。

**登录态失效**：在专用 Chrome 中重新登录 `https://www.zhipin.com`，不需要清除 Profile。
