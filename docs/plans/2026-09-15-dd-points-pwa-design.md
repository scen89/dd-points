# 蹬蹬积分 PWA 设计文档

日期：2026-09-15
状态：已确认（用户确认于 2026-09-15）

## 背景与目标

参考文件 `ref/index.html` 是一个单文件儿童积分系统（打卡记分 / 商城兑换 / 明细 / 管理与导出），数据存 localStorage。
目标：演化为可「安装」到安卓手机的 PWA，通过 GitHub Pages 托管，长期可维护，并为将来云同步预留扩展位。

## 已确认的决策

| 决策点 | 结论 |
| --- | --- |
| 安装方式 | PWA（Chrome 添加到主屏幕/安装应用），不做 APK |
| 数据 | 本机 localStorage + 手动导出/导入备份；数据层预留未来云同步 |
| 家长锁 | 不需要 PIN；保留「家长确认」弹窗（惩罚/兑换/撤销） |
| 功能范围 | 参考文件全部功能 + 积分趋势图表 + 导入备份恢复 |
| 旧数据 | 无历史数据，全新开始，不要求兼容旧备份格式 |
| 托管 | GitHub Pages（public 仓库），无后端 |
| 技术路线 | 纯原生 JS ES Modules，零依赖、零构建 |
| 应用身份 | 名称「蹬蹬积分」，橙色主题（#FF8A3D），男孩头像 👦 |

## 架构

- 纯静态站点：HTML / CSS / ES Modules，无 npm 依赖、无构建步骤
- 所有数据读写经过唯一入口 `store` 模块；将来接云同步只替换该层
- 路由为内存 route 对象 + 整页 innerHTML 渲染（沿用参考文件模式，规模可控）
- 图表为手写 SVG，不引入图表库

### 文件结构

```
index.html                 外壳：顶栏/页面容器/弹窗/Toast/Tab 栏
css/app.css                样式（沿用参考文件视觉）
js/store.js                数据读写、schema 版本、校验、导入导出
js/state.js                内存状态 + 派生计算（余额/日/周汇总）
js/views/check.js          打卡页
js/views/shop.js           商城页
js/views/ledger.js         明细页（含趋势图容器）
js/views/me.js             我的页
js/views/manage.js         任务与分类管理
js/views/manage-goods.js   商品管理
js/chart.js                SVG 柱状图（7 天 / 30 天切换）
js/main.js                 路由、事件委托、启动
sw.js                      Service Worker（预缓存 app shell）
manifest.webmanifest       PWA 清单
icons/icon-192.png         图标 192
icons/icon-512.png         图标 512
tools/dev-server.js        本地开发用静态服务器（Node 内置模块）
tests/*.test.js            数据层单元测试（node --test）
docs/plans/                设计与计划文档
ref/index.html             参考实现（只读参照，不参与部署）
```

## 数据模型

```js
{
  schemaVersion: 1,
  categories: [
    { id, name, rewards: [Task], penalties: [Task] }
  ],
  goods: [ { id, name, points, emoji } ],
  ledger: [
    { id, type: 'in'|'out', points, source: 'task'|'exchange',
      taskId?, title, category?, date: 'YYYY-MM-DD', ts }
  ],
  createdAt, updatedAt
}

// Task 分值统一为正数；加/减由所属 rewards/penalties 决定
Task: { id, name, mode: 'normal'|'level', points, levels: [{label, points}] }
```

- 余额 = 所有 `type:'in'` 之和 − 所有 `type:'out'` 之和
- 分档任务记分时取所选档位分值，标题带档位名（如「午睡 · 1小时」）
- 导出格式 = 上述完整 state + 导出时间元信息；导入时逐字段校验，非法则拒绝且不改动现有数据

## 页面与交互（以参考文件行为为准）

1. **打卡页**：周导航/选日期（可补记过去日期）、奖励/惩罚分段、分类卡片；点任务即记分；惩罚类先弹「家长确认」；分档任务弹档位选择；已记任务可撤销（二次确认）；顶部余额卡显示今日/本周汇总
2. **商城**：2 列商品卡，积分足够才可兑换，确认后写入流水
3. **明细**：顶部趋势图（7 天/30 天切换的每日净得分柱状图），下方按日期分组流水（日期倒序，组内按时间正序）
4. **我的**：累计获得/累计消耗/打卡天数三宫格、管理入口、导出备份、导入恢复、清空记录（保留分类与商品）；底部安装提示（Chrome 菜单 → 安装应用）
5. **管理页**：分类 CRUD、奖励/惩罚任务 CRUD（含分档编辑）、商品 CRUD；均为底部弹窗表单

## PWA 细节

- `manifest.webmanifest`：name/short_name「蹬蹬积分」、display standalone、theme_color #FF8A3D、背景 #F4F5F7、icons 192/512（purpose any + maskable）
- 图标生成：一次性 PowerShell + System.Drawing 脚本绘制橙色圆角底 + 👦，输出 PNG；脚本不入运行时
- Service Worker：安装时预缓存全部静态资源（app shell），fetch 采用 cache-first（同源静态资源）+ 版本化缓存名；激活时清理旧缓存
- 更新流程：改动 → push → 手机下次打开时 SW 后台拉取新版本并自动生效

## 错误处理

- localStorage 写入失败（配额/隐私模式）：捕获并明确提示，数据保留在内存不丢失
- 导入：文件解析失败/字段校验失败 → 提示原因，且不覆盖现有数据；导入前二次确认
- 兑换：余额不足时按钮禁用（显示还差多少分）
- 清空记录：二次确认，明示分类与商品保留

## 测试策略

- 数据层单元测试（`node --test`，零依赖）：余额计算、周范围计算、分档记分、撤销、导入校验（合法/非法/缺字段/版本不符）、导出→导入往返一致
- 不引入 E2E 框架；UI 由用户按实机验收清单确认

### 实机验收清单

安装到主屏 → 断网可打开 → 打卡加分/扣分 → 撤销 → 兑换 → 趋势图正确 → 导出备份 → 导入恢复 → 清空记录

## 部署

- 用户提供 GitHub 用户名并创建 **public** 仓库 `dd-points`（免费版 Pages 要求 public）
- push 后在 Settings → Pages 选择 main 分支根目录
- 访问地址形如 `https://<用户名>.github.io/dd-points/`
- 无构建步骤，push 即上线

## 未来扩展（暂不实现）

- 云同步：替换 store 层为远端适配器（保持相同的动作接口）
- 多孩子档案、连续打卡统计、每日上限、深色模式等

## 功能增强：可重复任务（2026-09-15 追加，已实现）

- 任务新增 `repeat` 字段（布尔，默认 false；老数据/旧备份缺省按 false 处理）
- 可重复任务当天不限次数记分：点一次记一次；非重复任务保持「一天一次，再点即撤销」
- 打卡页：可重复任务显示 `×N` 计数与「−」按钮（确认后撤销最近一次），任务行不置灰
- 任务表单新增「可重复（一天可多次加/减分）」复选框；管理页显示「可重复」标记
- 每条记录仍是普通流水，余额、图表与日/周汇总天然兼容
