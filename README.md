# 蹬蹬积分

儿童积分打卡 PWA：打卡（奖励 / 惩罚、分档任务）、积分商城、明细（含 7/30 天趋势图）、我的（管理入口与数据备份）。纯静态、零依赖，数据保存在手机本机浏览器中，可安装到主屏幕并离线使用。

## 目录结构

```
dd-points/
├─ index.html               应用入口
├─ manifest.webmanifest     PWA 清单
├─ sw.js                    Service Worker（离线缓存与更新）
├─ package.json             npm scripts（无运行依赖）
├─ css/
│  └─ app.css               全部样式
├─ js/
│  ├─ main.js               路由、弹窗与事件委托
│  ├─ store.js              数据持久化、种子数据与校验
│  ├─ state.js              内存状态与变更操作
│  ├─ chart.js              SVG 柱状图
│  ├─ util.js               工具函数（转义、提示、下载等）
│  └─ views/                各页面视图：check / shop / ledger / me / manage / manage-goods
├─ icons/                   PWA 图标（192 / 512 / maskable-512）
├─ tests/                   Node 内置测试器用例（store / state / chart / util）
├─ tools/
│  ├─ dev-server.js         本地开发服务器（Node 内置 http）
│  └─ make-icons.ps1        一次性图标生成脚本
├─ docs/plans/              实施计划文档
└─ ref/                     参考实现（已 gitignore、不参与部署）
```

`ref/index.html` 是开发时的参考实现，不随应用部署。

## 本地开发

需要 Node 20 及以上（开发环境使用 Node 22）。Node 仅用于本地开发服务器和测试，应用本身零依赖。

```powershell
npm run dev
```

浏览器访问 http://localhost:8080 。在本地环境下 Service Worker 可正常工作，可以验证离线缓存、可安装性与刷新更新；Android 上的真实安装与离线体验请按文末验收清单确认。

## 测试

```powershell
npm test
```

使用 Node 内置测试器（`node --test`），无需安装任何测试依赖。用例覆盖数据层（持久化、校验、导入导出）、状态计算与变更操作、趋势图 SVG 生成以及工具函数。

## 部署到 GitHub Pages

1. 在 GitHub 创建 **public** 仓库 `dd-points`（若创建时勾选了初始化 README，可先 `git pull --rebase origin main` 再推送，或直接创建空仓库）。
2. 确认当前分支的代码就是要上线的版本；若在特性分支上开发，先合并回 `main`（例如 `git switch main` 然后 `git merge <分支名>`）。
3. 在项目目录添加远程仓库并推送：

   ```powershell
   git remote add origin https://github.com/<用户名>/dd-points.git
   git push -u origin main
   ```

4. 打开仓库 Settings → Pages，Source 选择 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，保存。
5. 等待几分钟（首次构建可能更久）后访问 `https://<用户名>.github.io/dd-points/` 。

## 手机安装

Android Chrome 打开 `https://<用户名>.github.io/dd-points/` → 右上角菜单 → 「安装应用」或「添加到主屏幕」。安装后桌面出现「蹬蹬积分」图标，打开为全屏无地址栏，之后可以断网使用。

## 更新流程

1. 修改代码并在本地提交、验证。
2. 合并到 `main` 后推送到 GitHub：

   ```powershell
   git push origin main
   ```

3. 手机在**联网状态**下再次打开应用时自动更新：Service Worker 在线优先获取新版本并更新缓存，离线时继续使用本地缓存，离线功能不受影响。若打开时仍是旧版本，稍等几分钟后重新打开（GitHub Pages 本身也有短暂缓存）。

## 数据说明

- 数据保存在手机本机浏览器中，不会上传到任何服务器。
- 换手机或误删数据时，用「我的 → 导出数据备份」保存 JSON 文件，再在目标设备用「导入备份恢复」选择该文件。
- 导入会覆盖现有全部分类、商品和流水记录，导入前请先导出当前数据。
- 「清空所有记录」只删除流水，分类与商品保留，操作不可恢复，建议先导出备份。
- 建议定期导出备份，并将文件另存到手机或网盘。

## 验收清单

1. 安装到主屏：手机 Chrome 打开应用地址，菜单 → 「安装应用」，桌面出现「蹬蹬积分」图标，打开为全屏无地址栏。
2. 断网可打开：开启飞行模式后应用仍能打开并使用。
3. 打卡：奖励任务加分；惩罚任务在「家长确认」后扣分；分档任务弹出档位选择。
4. 撤销：撤销一条打卡记录，余额恢复。
5. 兑换：商城兑换一件商品，余额减少并出现在明细中。
6. 趋势图：明细页 7 天 / 30 天切换正常（橙色奖励柱向上、红色惩罚柱向下），下方显示近 N 天奖励/惩罚占比；每日分组显示「奖励 / 惩罚 / 任务净」拆分。
7. 导出：「我的 → 导出数据备份」文件保存成功。
8. 导入恢复：清空记录后「导入备份恢复」刚才导出的文件，数据恢复。
9. 清空记录：「我的 → 清空所有记录」清空流水，分类与商品保留。
10. 管理页：新增 / 编辑 / 删除分类、任务、商品后，打卡页与商城即时生效。
11. 可重复任务：任务勾选「可重复」后，当天可多次加/减分；已记次数显示 ×N，点「−」可撤销最近一次。
