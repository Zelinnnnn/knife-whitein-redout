# 血与刃的白蔷薇 · 联机版

在线地址：**https://zelinnnnn.github.io/knife-whitein-redout/**

每人一台手机，同一房间面对面玩。用 Firebase Realtime Database + 匿名登录同步（和 party-games 站点一样）。

## 文件

- `index.html`：游戏本体（Firebase 配置已写在文件顶部）
- `database.rules.json`：Realtime Database 安全规则
- `legacy/artifact-version.html`：旧版（Claude artifact 存储版，不能独立运行）

## 开启 GitHub Pages（一次性）

1. 把这个分支合并到 `main`。
2. 仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，Branch 选 `main`，文件夹选 `/ (root)`，点 Save。
3. 等一两分钟，打开 https://zelinnnnn.github.io/knife-whitein-redout/ 。

房间的邀请链接和二维码会自动指向这个网址，形如 `https://zelinnnnn.github.io/knife-whitein-redout/?room=ABCD`。
就算你在电脑上直接双击打开 `index.html`，生成的二维码也会指向线上网址。

## Firebase 设置（一次性）

1. **Build → Realtime Database → Create Database**，位置选 **Singapore (asia-southeast1)**，选锁定模式。
2. 在 **Rules** 标签页粘贴 `database.rules.json` 的全部内容，点 **Publish**。
3. **Build → Authentication → Get started → Sign-in method**，启用 **Anonymous**。
4. **Authentication → Settings → Authorized domains**，添加 `zelinnnnn.github.io`。

如果数据库地址不是 `https://blade-n-roses-default-rtdb.asia-southeast1.firebasedatabase.app`，改 `index.html` 顶部的 `databaseURL`。

## 怎么玩

- 一人点「开一间新房」，其他人扫二维码，或输入 4 位房间号加入（5–10 人）。
- 「桌面图板」不占座位，适合放在桌子中间的平板或电视上。
- 刷新页面会自动回到座位；房主掉线 75 秒后其他玩家可以「接管房主」。
