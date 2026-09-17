# 蹬蹬积分 PWA 实施计划（Implementation Plan）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 `ref/index.html` 的单文件积分系统，实现为零依赖、可安装到安卓手机的 PWA（打卡 / 商城 / 明细+趋势图 / 我的+导入导出 / 管理），托管到 GitHub Pages。

**Architecture:** 纯静态 ES Modules，无构建、无 npm 运行依赖。数据读写统一经过 `js/store.js`（持久化+校验）与 `js/state.js`（内存状态+变更操作），视图为返回 HTML 字符串的纯函数，`js/main.js` 负责路由与事件委托。Service Worker 预缓存 app shell，实现离线与自动更新。

**Tech Stack:** 原生 HTML/CSS/JS（ES Modules）、localStorage、Service Worker、Taskfile 级工具：Node 22 内置 `node --test` 与 `node:http` 开发服务器、PowerShell + System.Drawing 生成图标。

---

## 执行须知（务必先读）

- 工作目录：`D:\dd-points`，直接在此目录执行，不要创建 worktree。
- `ref/index.html` 是参考实现（**未跟踪、不部署**，已加入 .gitignore），移植视图时对照其行号，**不要修改或删除它**。
- 所有命令在 PowerShell 7（pwsh）下执行；git 版本较老（2.25），不要使用新特性。
- 每个 Task 完成后必须提交；提交信息使用中文、`feat:/test:/docs:` 前缀。
- 测试命令：`npm test`（等价 `node --test tests/`）；单文件：`node --test tests/store.test.js`。
- 本计划给出的代码是最终代码，直接照抄；"移植"指对照 ref 的行号抄写，然后按列出的"改动清单"修改。除列出的改动外不要自行发挥。
- 纯逻辑有单测覆盖；UI 由用户在桌面浏览器与安卓手机上人工验收（见文末清单）。

---

### Task 1: 项目骨架与本地预览

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `css/app.css`
- Create: `tools/dev-server.js`
- Create: `js/main.js`（临时占位，Task 11 重写）
- Modify: `.gitignore`（追加 `ref/`）

**Step 1: 写 `package.json`**

```json
{
  "name": "dd-points",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "蹬蹬积分 - 儿童积分打卡 PWA",
  "scripts": {
    "dev": "node tools/dev-server.js",
    "test": "node --test tests/"
  }
}
```

**Step 2: 写 `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#FF8A3D">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="stylesheet" href="css/app.css">
<title>蹬蹬积分</title>
</head>
<body>
<div id="app">
  <div id="page"></div>
  <nav id="tabbar"></nav>
</div>
<div id="modal"></div>
<input type="file" id="import-file" accept=".json,application/json" hidden>
<script type="module" src="js/main.js"></script>
</body>
</html>
```

**Step 3: 写 `css/app.css`**

把 `ref/index.html` 第 9–233 行 `<style>` 内的全部规则原样复制到 `css/app.css`，然后在文件末尾追加以下新规则：

```css
/* ===== 趋势图 ===== */
.chart-card{background:#fff;border-radius:var(--r);padding:12px 10px 6px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.045);}
.chart-head{display:flex;align-items:center;justify-content:space-between;padding:0 4px 2px;}
.chart-head .ct{font-size:14px;font-weight:600;}
.chart-seg{margin:0;width:132px;padding:2px;}
.chart-seg button{padding:5px 0;font-size:13px;border-radius:7px;}
```

**Step 4: 写 `tools/dev-server.js`**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filePath = normalize(join(root, urlPath === '/' ? '/index.html' : urlPath));
    if (!filePath.startsWith(root + sep) && filePath !== root) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403');
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': types[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 ' + req.url);
  }
}).listen(8080, () => console.log('dev server: http://localhost:8080'));
```

**Step 5: 写 `js/main.js` 占位**

```js
document.getElementById('page').innerHTML =
  '<div class="page"><div class="empty big">加载中…</div></div>';
```

**Step 6: `.gitignore` 追加 `ref/`**

```
ref/
```

**Step 7: 验证**

```powershell
node --check tools/dev-server.js
node --check js/main.js
$p = Start-Process node -ArgumentList 'tools/dev-server.js' -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 1
(Invoke-WebRequest http://localhost:8080/ -UseBasicParsing).StatusCode
Stop-Process $p.Id
```

Expected: 语法检查无输出；HTTP 状态码 `200`。

**Step 8: 提交**

```powershell
git add package.json index.html css/app.css tools/dev-server.js js/main.js .gitignore
git commit -m "feat: 项目骨架、样式与本地开发服务器"
```

---

### Task 2: 数据层 store.js（TDD）

**Files:**
- Create: `js/store.js`
- Test: `tests/store.test.js`

**Step 1: 写失败测试 `tests/store.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  uid, createSeedState, validateState, loadState, saveState,
  buildExport, parseImport, STORAGE_KEY, SCHEMA_VERSION
} from '../js/store.js';

function memStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    _dump: () => Object.fromEntries(m)
  };
}

test('uid 生成短且唯一的 id', () => {
  const ids = new Set(Array.from({ length: 200 }, () => uid()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^[a-z0-9]{6,10}$/);
});

test('种子数据合法且分值全为正', () => {
  const s = createSeedState();
  assert.equal(validateState(s).ok, true);
  assert.ok(s.categories.length >= 5);
  assert.ok(s.goods.length > 0);
  for (const c of s.categories) {
    for (const t of [...c.rewards, ...c.penalties]) {
      assert.ok(t.points > 0, t.name);
      if (t.mode === 'level') for (const l of t.levels) assert.ok(l.points > 0);
    }
  }
});

test('validateState 拒绝非法数据', () => {
  assert.equal(validateState(null).ok, false);
  assert.equal(validateState({}).ok, false);
  const s = createSeedState();
  assert.equal(validateState({ ...s, schemaVersion: 99 }).ok, false);
  const bad = createSeedState();
  bad.categories[0].rewards[0].points = -3;
  assert.equal(validateState(bad).ok, false);
  const bad2 = createSeedState();
  bad2.ledger.push({ id: 'x', type: 'in', points: 1, source: 'task', title: 't', date: '2026/09/15', ts: 1 });
  assert.equal(validateState(bad2).ok, false);
  const bad3 = createSeedState();
  bad3.goods = 'nope';
  assert.equal(validateState(bad3).ok, false);
});

test('loadState：空存储写入种子、已有数据原样读、损坏时回退种子', () => {
  const empty = memStorage();
  const seed = loadState(empty);
  assert.equal(validateState(seed).ok, true);
  assert.ok(empty._dump()[STORAGE_KEY]);

  const stored = createSeedState();
  stored.ledger.push({ id: 'a', type: 'in', points: 5, source: 'task', title: '测试', date: '2026-09-15', ts: 1 });
  const ok = memStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
  assert.equal(loadState(ok).ledger.length, 1);

  const broken = memStorage({ [STORAGE_KEY]: '{oops' });
  assert.equal(validateState(loadState(broken)).ok, true);
});

test('saveState 写入失败返回错误而不抛出', () => {
  const bad = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const res = saveState(createSeedState(), bad);
  assert.equal(res.ok, false);
});

test('导出与导入往返一致', () => {
  const s = createSeedState();
  s.ledger.push({ id: 'a', type: 'in', points: 5, source: 'task', title: '测试', date: '2026-09-15', ts: 1 });
  const payload = buildExport(s);
  assert.equal(payload.app, 'dengdeng-points');
  assert.equal(payload.schemaVersion, SCHEMA_VERSION);
  const res = parseImport(JSON.stringify(payload));
  assert.equal(res.ok, true);
  assert.deepEqual(res.state, s);
});

test('parseImport 拒绝非备份文件与非法结构', () => {
  assert.equal(parseImport('not json').ok, false);
  assert.equal(parseImport(JSON.stringify({ app: 'other', schemaVersion: 1 })).ok, false);
  const payload = buildExport(createSeedState());
  payload.state.schemaVersion = 'x';
  assert.equal(parseImport(JSON.stringify(payload)).ok, false);
});
```

**Step 2: 运行确认失败**

```powershell
node --test tests/store.test.js
```

Expected: FAIL（`Cannot find module ... js/store.js`）

**Step 3: 实现 `js/store.js`**

```js
export const STORAGE_KEY = 'dengdeng_points_v1';
export const SCHEMA_VERSION = 1;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function createSeedState() {
  const now = Date.now();
  const T = (name, points, extra) =>
    Object.assign({ id: uid(), name, mode: 'normal', points, levels: [] }, extra || {});
  const cat = (name, rewards, penalties) => ({ id: uid(), name, rewards, penalties });
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [
      cat('生活习惯', [
        T('主动洗漱', 2),
        T('整理书包、课桌', 1),
        T('进门换鞋，七步洗手', 2),
        T('吃饭认真、不挑食', 1),
        T('按时睡觉、起床', 2),
        T('午睡', 3, { mode: 'level', levels: [
          { label: '1小时', points: 3 }, { label: '0.5-1小时', points: 2 }, { label: '0-0.5小时', points: 1 }
        ]}),
        T('主动做家务', 2),
        T('每日运动15-30分钟', 3),
        T('徒步1公里', 1)
      ], [
        T('不主动洗漱', 2),
        T('小嘴巴舔咬东西多于3次', 5),
        T('不主动整理书包、课桌', 1),
        T('不冲洗厕所', 2),
        T('吃饭不认真、挑食', 2),
        T('吃饭超过30分钟离开座位', 1),
        T('睡觉起床拖拉磨蹭', 1),
        T('乱扔东西、垃圾', 3),
        T('不尊老爱幼', 3),
        T('没完成运动任务', 3)
      ]),
      cat('学习习惯', [
        T('认真完成各科作业', 2),
        T('复习今日所学内容', 2),
        T('预习明日要学课程', 3),
        T('练钢琴认真', 2),
        T('每日练字15分钟', 2),
        T('坐姿、握笔姿势标准', 5),
        T('学习不无故离开座位', 5)
      ], [
        T('不认真完成各科作业', 5),
        T('没有复习今日所学', 1),
        T('没有预习明日课程', 2),
        T('没有练琴', 1),
        T('没有进行每日练字', 1),
        T('坐姿、握笔不标准', 2),
        T('做作业好动、不认真', 5)
      ]),
      cat('学习科目', [
        T('口算题100道', 2),
        T('阅读理解1篇', 3),
        T('看图写话1篇', 5),
        T('摘抄好词好句30个', 3)
      ], [
        T('看书姿势、环境错误', 2)
      ]),
      cat('学习成绩', [
        T('单元测试成绩', 5, { mode: 'level', levels: [
          { label: '100分', points: 5 }, { label: '95分', points: 2 }
        ]}),
        T('获得学校奖状', 10),
        T('课堂听写、默写满分', 5),
        T('被老师点名表扬一次', 2)
      ], [
        T('单元测试85分以下', 3),
        T('单元测试70分以下', 5),
        T('单元测试不及格', 10),
        T('被老师点名批评', 10),
        T('表现差，老师找家长', 15)
      ]),
      cat('性格养成', [
        T('一天不发脾气', 3),
        T('主动和认识的人打招呼', 2),
        T('遇到难题想办法解决', 5)
      ], [
        T('乱发脾气', 3),
        T('和长辈顶嘴', 5),
        T('说脏话', 5),
        T('撒谎，屡教不改', 10)
      ])
    ],
    goods: [
      { id: uid(), name: '手机/电视 1分钟', points: 2, emoji: '📱' },
      { id: uid(), name: '看电视 20分钟', points: 40, emoji: '📺' },
      { id: uid(), name: '零食 5元以内', points: 30, emoji: '🍬' },
      { id: uid(), name: '零食 10元以内', points: 60, emoji: '🍫' },
      { id: uid(), name: '小愿望 20元以内', points: 60, emoji: '⭐' },
      { id: uid(), name: '游乐场', points: 100, emoji: '🎢' },
      { id: uid(), name: '礼物 30元以内', points: 90, emoji: '🎁' },
      { id: uid(), name: '礼物 50元以内', points: 150, emoji: '🎀' },
      { id: uid(), name: '开启新电脑游戏', points: 200, emoji: '🎮' },
      { id: uid(), name: '周末自由支配一天', points: 200, emoji: '🛋️' },
      { id: uid(), name: '外出简餐', points: 60, emoji: '🍜' },
      { id: uid(), name: '吃大餐', points: 200, emoji: '🍱' },
      { id: uid(), name: '短途旅行', points: 600, emoji: '🚗' },
      { id: uid(), name: '长途旅行', points: 3000, emoji: '✈️' }
    ],
    ledger: [],
    createdAt: now,
    updatedAt: now
  };
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function validTask(t) {
  if (!isPlainObject(t)) return '任务不是对象';
  if (typeof t.id !== 'string' || !t.id) return '任务缺少 id';
  if (typeof t.name !== 'string' || !t.name) return '任务缺少名称';
  if (t.mode !== 'normal' && t.mode !== 'level') return '任务 mode 非法：' + t.mode;
  if (typeof t.points !== 'number' || !(t.points > 0)) return '任务分值必须为正数';
  if (t.mode === 'level') {
    if (!Array.isArray(t.levels) || !t.levels.length) return '分档任务缺少档位';
    for (const l of t.levels) {
      if (!isPlainObject(l) || typeof l.label !== 'string' || !l.label) return '档位缺少名称';
      if (typeof l.points !== 'number' || !(l.points > 0)) return '档位分值必须为正数';
    }
  }
  return null;
}

export function validateState(s) {
  if (!isPlainObject(s)) return { ok: false, error: '数据不是对象' };
  if (s.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: '数据版本不支持：' + s.schemaVersion };
  if (!Array.isArray(s.categories)) return { ok: false, error: '缺少 categories' };
  for (const c of s.categories) {
    if (!isPlainObject(c) || typeof c.id !== 'string' || typeof c.name !== 'string') {
      return { ok: false, error: '分类字段缺失' };
    }
    if (!Array.isArray(c.rewards) || !Array.isArray(c.penalties)) {
      return { ok: false, error: '分类缺少任务列表' };
    }
    for (const t of [...c.rewards, ...c.penalties]) {
      const err = validTask(t);
      if (err) return { ok: false, error: err };
    }
  }
  if (!Array.isArray(s.goods)) return { ok: false, error: '缺少 goods' };
  for (const g of s.goods) {
    if (!isPlainObject(g) || typeof g.id !== 'string' || typeof g.name !== 'string') {
      return { ok: false, error: '商品字段缺失' };
    }
    if (typeof g.points !== 'number' || !(g.points > 0)) return { ok: false, error: '商品分值必须为正数' };
    if (typeof g.emoji !== 'string') return { ok: false, error: '商品缺少 emoji 字段' };
  }
  if (!Array.isArray(s.ledger)) return { ok: false, error: '缺少 ledger' };
  for (const r of s.ledger) {
    if (!isPlainObject(r)) return { ok: false, error: '流水不是对象' };
    if (typeof r.id !== 'string' || !r.id) return { ok: false, error: '流水缺少 id' };
    if (r.type !== 'in' && r.type !== 'out') return { ok: false, error: '流水 type 非法' };
    if (typeof r.points !== 'number' || !(r.points > 0)) return { ok: false, error: '流水分值必须为正数' };
    if (r.source !== 'task' && r.source !== 'exchange') return { ok: false, error: '流水 source 非法' };
    if (typeof r.title !== 'string' || !r.title) return { ok: false, error: '流水缺少标题' };
    if (typeof r.date !== 'string' || !DATE_RE.test(r.date)) return { ok: false, error: '流水日期格式非法' };
    if (typeof r.ts !== 'number') return { ok: false, error: '流水缺少时间戳' };
  }
  return { ok: true };
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validateState(parsed).ok) return parsed;
    }
  } catch (e) { /* 回退到种子数据 */ }
  const fresh = createSeedState();
  saveState(fresh, storage);
  return fresh;
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    state.updatedAt = Date.now();
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || '保存失败' };
  }
}

export function buildExport(state) {
  return {
    app: 'dengdeng-points',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state
  };
}

export function parseImport(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: '不是有效的 JSON 文件' };
  }
  if (!isPlainObject(payload) || payload.app !== 'dengdeng-points') {
    return { ok: false, error: '不是蹬蹬积分的备份文件' };
  }
  const v = validateState(payload.state);
  if (!v.ok) return v;
  return { ok: true, state: payload.state };
}
```

**Step 4: 运行确认通过**

```powershell
node --test tests/store.test.js
```

Expected: `pass 7`（全部通过）

**Step 5: 提交**

```powershell
git add js/store.js tests/store.test.js
git commit -m "feat: 数据层 store（持久化、种子、校验、导入导出）"
```

---

### Task 3: state.js 日期与派生计算（TDD）

**Files:**
- Create: `js/state.js`（本 Task 只写前半部分，Task 4 追加变更操作）
- Test: `tests/state.test.js`（本 Task 只写计算类测试）

**Step 1: 写失败测试 `tests/state.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/state.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v))
  };
}

function freshState() {
  const storage = memStorage();
  S.init(storage);
  return { storage, state: S.getState() };
}

const A = (type, points, date, ts = 1) => ({
  id: 'x' + Math.random().toString(36).slice(2),
  type, points, source: 'task', title: 't', date, ts
});

test('ds/todayStr/fmtDate/weekDates 正确', () => {
  const tue = new Date(2026, 8, 15); // 2026-09-15 周二
  assert.equal(S.ds(tue), '2026-09-15');
  assert.equal(S.todayStr(tue), '2026-09-15');
  assert.equal(S.fmtDate('2026-09-15'), '9月15日 周二');
  assert.deepEqual(S.weekDates(0, tue).map(S.ds), [
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'
  ]);
  assert.equal(S.weekDates(-1, tue).map(S.ds)[0], '2026-09-07');
  const firstOfSep = new Date(2026, 8, 1); // 周二，所在周跨月
  assert.equal(S.weekDates(0, firstOfSep).map(S.ds)[0], '2026-08-31');
});

test('balance/dayNet/netSum 计算正确', () => {
  const ledger = [A('in', 10, '2026-09-15'), A('out', 3, '2026-09-15'), A('in', 5, '2026-09-14')];
  assert.equal(S.balance(ledger), 12);
  assert.equal(S.dayNet(ledger, '2026-09-15'), 7);
  assert.equal(S.netSum(ledger, ['2026-09-14', '2026-09-15']), 12);
  assert.equal(S.netSum(ledger, ['2026-09-13']), 0);
});

test('chartSeries 返回最近 N 天（含今天）最旧在前', () => {
  const ledger = [A('in', 4, '2026-09-15'), A('in', 2, '2026-09-14')];
  const series = S.chartSeries(ledger, 7, new Date(2026, 8, 15));
  assert.equal(series.length, 7);
  assert.equal(series[0].date, '2026-09-09');
  assert.equal(series[6].date, '2026-09-15');
  assert.equal(series[6].value, 4);
  assert.equal(series[5].value, 2);
  assert.ok(series[6].label.length > 0);
});

test('groupByDate 日期倒序、组内时间正序', () => {
  const ledger = [
    A('in', 1, '2026-09-14', 20),
    A('in', 2, '2026-09-15', 30),
    A('in', 3, '2026-09-15', 10)
  ];
  const { dates, byDate } = S.groupByDate(ledger);
  assert.deepEqual(dates, ['2026-09-15', '2026-09-14']);
  assert.deepEqual(byDate['2026-09-15'].map(r => r.ts), [10, 30]);
});

test('totals 汇总收入/支出/打卡天数/条数', () => {
  const ledger = [
    A('in', 10, '2026-09-15'),
    A('out', 3, '2026-09-15'),
    A('in', 5, '2026-09-14')
  ];
  const t = S.totals(ledger);
  assert.equal(t.income, 15);
  assert.equal(t.spend, 3);
  assert.equal(t.checkinDays, 2);
  assert.equal(t.count, 3);
});
```

**Step 2: 运行确认失败**

```powershell
node --test tests/state.test.js
```

Expected: FAIL（模块不存在）

**Step 3: 实现 `js/state.js` 前半部分**

```js
import { loadState, saveState, uid, buildExport, parseImport } from './store.js';

let state = null;
let storage = null;

export function init(storageObj = globalThis.localStorage) {
  storage = storageObj;
  state = loadState(storage);
  return state;
}

export function getState() {
  if (!state) init();
  return state;
}

function persist() {
  return saveState(state, storage);
}

/* ---------- 日期工具 ---------- */

export function ds(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export function todayStr(now = new Date()) {
  return ds(now);
}

export function fmtDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const wk = '日一二三四五六'[dt.getDay()];
  return `${m}月${d}日 周${wk}`;
}

export function weekDates(offset = 0, now = new Date()) {
  const wd = (now.getDay() + 6) % 7; // 周一 = 0
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - wd + offset * 7);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
}

/* ---------- 派生计算 ---------- */

export function balance(ledger) {
  return ledger.reduce((s, r) => s + (r.type === 'in' ? r.points : -r.points), 0);
}

export function dayNet(ledger, date) {
  return ledger.reduce((s, r) => {
    if (r.date !== date) return s;
    return s + (r.type === 'in' ? r.points : -r.points);
  }, 0);
}

export function netSum(ledger, dates) {
  const set = new Set(dates);
  return ledger.reduce((s, r) => {
    if (!set.has(r.date)) return s;
    return s + (r.type === 'in' ? r.points : -r.points);
  }, 0);
}

export function chartSeries(ledger, days, now = new Date()) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const date = ds(d);
    out.push({ date, label: (d.getMonth() + 1) + '/' + d.getDate(), value: dayNet(ledger, date) });
  }
  return out;
}

export function groupByDate(ledger) {
  const byDate = {};
  ledger.forEach(r => {
    (byDate[r.date] = byDate[r.date] || []).push(r);
  });
  const dates = Object.keys(byDate).sort().reverse();
  dates.forEach(d => byDate[d].sort((a, b) => a.ts - b.ts));
  return { dates, byDate };
}

export function totals(ledger) {
  let income = 0;
  let spend = 0;
  const daySet = new Set();
  ledger.forEach(r => {
    if (r.type === 'in') income += r.points;
    else spend += r.points;
    if (r.source === 'task') daySet.add(r.date);
  });
  return { income, spend, checkinDays: daySet.size, count: ledger.length };
}
```

**Step 4: 运行确认通过**

```powershell
node --test tests/state.test.js
```

Expected: `pass 5`

**Step 5: 提交**

```powershell
git add js/state.js tests/state.test.js
git commit -m "feat: state 日期工具与派生计算"
```

---

### Task 4: state.js 变更操作（TDD）

**Files:**
- Modify: `js/state.js`（文件末尾追加）
- Test: `tests/state.test.js`（追加测试）

**Step 1: 追加失败测试到 `tests/state.test.js`**

```js
test('recordTask 记分、防重复、惩罚为支出、分档取档位', () => {
  const { state } = freshState();
  const cat = state.categories[0];
  const reward = cat.rewards.find(t => t.mode === 'normal');
  const res = S.recordTask(cat.id, 'reward', reward.id, '2026-09-15');
  assert.equal(res.ok, true);
  assert.equal(res.entry.type, 'in');
  assert.equal(res.entry.points, reward.points);
  assert.equal(S.balance(state.ledger), reward.points);
  assert.equal(S.recordTask(cat.id, 'reward', reward.id, '2026-09-15').ok, false);

  const pen = cat.penalties[0];
  const res2 = S.recordTask(cat.id, 'penalty', pen.id, '2026-09-15');
  assert.equal(res2.entry.type, 'out');
  assert.equal(res2.entry.points, pen.points);

  const levelCat = state.categories.find(c => c.rewards.some(t => t.mode === 'level'));
  const levelTask = levelCat.rewards.find(t => t.mode === 'level');
  const res3 = S.recordTask(levelCat.id, 'reward', levelTask.id, '2026-09-15', 1);
  assert.equal(res3.entry.points, levelTask.levels[1].points);
  assert.ok(res3.entry.title.includes(levelTask.levels[1].label));
  assert.equal(S.recordTask(levelCat.id, 'reward', levelTask.id, '2026-09-15', 99).ok, false);
});

test('undoRecord 撤销', () => {
  const { state } = freshState();
  const cat = state.categories[0];
  const { entry } = S.recordTask(cat.id, 'reward', cat.rewards[0].id, '2026-09-15');
  S.undoRecord(entry.id);
  assert.equal(state.ledger.length, 0);
});

test('exchange 余额不足拒绝、足够则扣分', () => {
  const { state } = freshState();
  const g = state.goods[0];
  assert.equal(S.exchange(g.id).ok, false);
  state.ledger.push({ id: 'in1', type: 'in', points: 10000, source: 'task', title: '灌分', date: '2026-09-15', ts: 1 });
  const res = S.exchange(g.id);
  assert.equal(res.ok, true);
  assert.equal(S.balance(state.ledger), 10000 - g.points);
});

test('分类/任务/商品 CRUD 与清空记录', () => {
  const { state } = freshState();
  const c = S.addCategory('测试分类');
  assert.ok(state.categories.some(x => x.id === c.id));
  S.renameCategory(c.id, '改名');
  assert.equal(state.categories.find(x => x.id === c.id).name, '改名');
  const t = S.addTask(c.id, 'reward', { name: '新任务', mode: 'normal', points: 3, levels: [] });
  assert.equal(state.categories.find(x => x.id === c.id).rewards.length, 1);
  S.updateTask(c.id, 'reward', t.id, { name: '改名任务', mode: 'normal', points: 5, levels: [] });
  assert.equal(state.categories.find(x => x.id === c.id).rewards[0].points, 5);
  S.removeTask(c.id, 'reward', t.id);
  assert.equal(state.categories.find(x => x.id === c.id).rewards.length, 0);
  S.removeCategory(c.id);
  assert.equal(state.categories.some(x => x.id === c.id), false);

  const g = S.addGoods({ name: '测试商品', points: 9, emoji: '🎈' });
  S.updateGoods(g.id, { name: '改', points: 10, emoji: '🎁' });
  assert.equal(state.goods.find(x => x.id === g.id).points, 10);
  S.removeGoods(g.id);
  assert.equal(state.goods.some(x => x.id === g.id), false);

  S.recordTask(state.categories[0].id, 'reward', state.categories[0].rewards[0].id, '2026-09-15');
  S.clearLedger();
  assert.equal(state.ledger.length, 0);
  assert.ok(state.categories.length > 0 && state.goods.length > 0);
});

test('importJson 失败不改动、成功则替换并持久化', () => {
  const { storage, state } = freshState();
  assert.equal(S.importJson('{"app":"other"}').ok, false);
  assert.equal(S.getState().ledger.length, 0);

  state.ledger.push({ id: 'z', type: 'in', points: 7, source: 'task', title: '导入用', date: '2026-09-15', ts: 3 });
  const text = S.exportJson();
  S.clearLedger();
  assert.equal(S.importJson(text).ok, true);
  assert.equal(S.getState().ledger.length, 1);
  assert.ok(storage.getItem('dengdeng_points_v1'));
});
```

**Step 2: 运行确认失败**

```powershell
node --test tests/state.test.js
```

Expected: FAIL（`S.recordTask is not a function` 等）

**Step 3: 在 `js/state.js` 末尾追加实现**

```js
/* ---------- 变更操作 ---------- */

function findList(cat, kind) {
  return kind === 'penalty' ? cat.penalties : cat.rewards;
}

export function recordTask(catId, kind, taskId, date, levelIdx = null) {
  const s = getState();
  const cat = s.categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  const task = findList(cat, kind).find(t => t.id === taskId);
  if (!task) return { ok: false, error: '任务不存在' };
  if (s.ledger.some(r => r.source === 'task' && r.date === date && r.taskId === taskId)) {
    return { ok: false, error: '当天已经记过了，请先撤销' };
  }
  let points = task.points;
  let title = task.name;
  if (task.mode === 'level') {
    const lv = task.levels[levelIdx];
    if (!lv) return { ok: false, error: '档位不存在' };
    points = lv.points;
    title = task.name + ' · ' + lv.label;
  }
  const entry = {
    id: uid(),
    type: kind === 'penalty' ? 'out' : 'in',
    points,
    source: 'task',
    taskId: task.id,
    title,
    category: cat.name,
    date,
    ts: Date.now()
  };
  s.ledger.push(entry);
  return { ok: true, entry, saved: persist().ok };
}

export function undoRecord(entryId) {
  const s = getState();
  const before = s.ledger.length;
  s.ledger = s.ledger.filter(r => r.id !== entryId);
  persist();
  return { ok: s.ledger.length < before };
}

export function exchange(goodsId) {
  const s = getState();
  const g = s.goods.find(x => x.id === goodsId);
  if (!g) return { ok: false, error: '商品不存在' };
  const bal = balance(s.ledger);
  if (bal < g.points) return { ok: false, error: '积分不足' };
  s.ledger.push({
    id: uid(),
    type: 'out',
    points: g.points,
    source: 'exchange',
    title: '兑换 · ' + g.name,
    category: '商城',
    date: todayStr(),
    ts: Date.now()
  });
  return { ok: true, saved: persist().ok };
}

export function addCategory(name) {
  const s = getState();
  const c = { id: uid(), name, rewards: [], penalties: [] };
  s.categories.push(c);
  return { ok: true, id: c.id, saved: persist().ok };
}

export function renameCategory(id, name) {
  const c = getState().categories.find(x => x.id === id);
  if (!c) return { ok: false, error: '分类不存在' };
  c.name = name;
  return { ok: true, saved: persist().ok };
}

export function removeCategory(id) {
  const s = getState();
  s.categories = s.categories.filter(x => x.id !== id);
  return { ok: true, saved: persist().ok };
}

export function addTask(catId, kind, data) {
  const cat = getState().categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  const task = { id: uid(), name: data.name, mode: data.mode, points: data.points, levels: data.levels || [] };
  findList(cat, kind).push(task);
  return { ok: true, id: task.id, saved: persist().ok };
}

export function updateTask(catId, kind, taskId, data) {
  const cat = getState().categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  const task = findList(cat, kind).find(t => t.id === taskId);
  if (!task) return { ok: false, error: '任务不存在' };
  Object.assign(task, { name: data.name, mode: data.mode, points: data.points, levels: data.levels || [] });
  return { ok: true, saved: persist().ok };
}

export function removeTask(catId, kind, taskId) {
  const cat = getState().categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  if (kind === 'penalty') cat.penalties = cat.penalties.filter(t => t.id !== taskId);
  else cat.rewards = cat.rewards.filter(t => t.id !== taskId);
  return { ok: true, saved: persist().ok };
}

export function addGoods(data) {
  const s = getState();
  const g = { id: uid(), name: data.name, points: data.points, emoji: data.emoji };
  s.goods.push(g);
  return { ok: true, id: g.id, saved: persist().ok };
}

export function updateGoods(id, data) {
  const g = getState().goods.find(x => x.id === id);
  if (!g) return { ok: false, error: '商品不存在' };
  Object.assign(g, { name: data.name, points: data.points, emoji: data.emoji });
  return { ok: true, saved: persist().ok };
}

export function removeGoods(id) {
  const s = getState();
  s.goods = s.goods.filter(x => x.id !== id);
  return { ok: true, saved: persist().ok };
}

export function clearLedger() {
  const s = getState();
  s.ledger = [];
  return { ok: true, saved: persist().ok };
}

export function exportJson() {
  return JSON.stringify(buildExport(getState()), null, 2);
}

export function importJson(text) {
  const res = parseImport(text);
  if (!res.ok) return res;
  state = res.state;
  return { ok: true, saved: persist().ok };
}
```

**Step 4: 运行确认通过**

```powershell
node --test tests/state.test.js
```

Expected: `pass 10`

**Step 5: 提交**

```powershell
git add js/state.js tests/state.test.js
git commit -m "feat: state 变更操作（记分/撤销/兑换/CRUD/导入导出）"
```

---

### Task 5: util.js 与 chart.js（TDD）

**Files:**
- Create: `js/util.js`
- Create: `js/chart.js`
- Test: `tests/chart.test.js`

**Step 1: 写失败测试 `tests/chart.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { barChartSVG } from '../js/chart.js';

const OPTS = { width: 300, height: 150 };

test('空数据返回空串', () => {
  assert.equal(barChartSVG([], OPTS), '');
});

test('正负值分别向上向下、零值不画、标签齐全', () => {
  const svg = barChartSVG([
    { label: '9/13', value: 4 },
    { label: '9/14', value: -2 },
    { label: '9/15', value: 0 }
  ], OPTS);
  const base = (150 - 18) / 2;
  const ys = [...svg.matchAll(/<rect x="[^"]*" y="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.equal(ys.length, 2);
  assert.ok(ys[0] < base);
  assert.ok(ys[1] >= base - 0.01);
  assert.ok(svg.includes('9/13') && svg.includes('9/15'));
  assert.ok(svg.startsWith('<svg'));
});

test('30 天时标签按间隔抽样', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ label: '9/' + (i + 1), value: i % 3 }));
  const svg = barChartSVG(items, OPTS);
  const labels = [...svg.matchAll(/<text/g)].length;
  assert.ok(labels <= 8, '标签数量 ' + labels);
  assert.ok(labels >= 5);
});
```

**Step 2: 运行确认失败**

```powershell
node --test tests/chart.test.js
```

Expected: FAIL

**Step 3: 实现 `js/chart.js`**

```js
export function barChartSVG(items, opts = {}) {
  const {
    width = 340, height = 170, gap = 2,
    posColor = '#FF8A3D', negColor = '#E5484D', zeroColor = '#E3E5E9'
  } = opts;
  if (!items.length) return '';

  const labelH = 18;
  const plotH = height - labelH;
  const maxAbs = Math.max(1, ...items.map(d => Math.abs(d.value)));
  const base = plotH / 2;
  const scale = (base - 8) / maxAbs;
  const bw = (width - gap * (items.length - 1)) / items.length;
  const labelEvery = items.length <= 10 ? 1 : 5;

  let bars = '';
  items.forEach((d, i) => {
    const x = i * (bw + gap);
    const h = Math.abs(d.value) * scale;
    if (h > 0.01) {
      const y = d.value > 0 ? base - h : base;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${d.value > 0 ? posColor : negColor}"/>`;
    }
    if (i % labelEvery === 0 || i === items.length - 1) {
      bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${height - 4}" font-size="9" fill="#9AA0A6" text-anchor="middle">${d.label}</text>`;
    }
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="每日净得分">` +
    `<line x1="0" y1="${base}" x2="${width}" y2="${base}" stroke="${zeroColor}" stroke-width="1"/>` +
    bars +
    `</svg>`;
}
```

**Step 4: 运行确认通过**

```powershell
node --test tests/chart.test.js
```

Expected: `pass 3`

**Step 5: 实现 `js/util.js`**

```js
export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

let toastTimer;

export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* 忽略 */ }
}

export function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
```

**Step 6: 全量测试并提交**

```powershell
npm test
git add js/util.js js/chart.js tests/chart.test.js
git commit -m "feat: 工具函数与 SVG 柱状图"
```

Expected: 全部通过（pass ≥ 18）

---

### Task 6: 打卡页 js/views/check.js

**Files:**
- Create: `js/views/check.js`

**Step 1: 写 `js/views/check.js`（完整代码）**

```js
import { getState, weekDates, ds, todayStr, balance, netSum } from '../state.js';
import { esc } from '../util.js';

export function viewCheck(route) {
  const state = getState();
  const dates = weekDates(route.weekOffset);
  const d = route.date;
  const kind = route.seg;
  const bal = balance(state.ledger);
  const doneMap = {};
  state.ledger.forEach(r => {
    if (r.date === d && r.source === 'task') doneMap[r.taskId] = r;
  });

  const todaySum = netSum(state.ledger, [todayStr()]);
  const weekSum = netSum(state.ledger, weekDates(0).map(ds));

  let h = `
  <div class="topbar">
    <h1>👦 蹬蹬</h1>
    <button class="icon-btn" data-act="go" data-page="manage" title="任务管理">⚙️</button>
  </div>
  <div class="page">
    <div class="bal-card">
      <div class="bal-label">当前积分余额</div>
      <div class="bal-num">${bal.toLocaleString()}<span>分</span></div>
      <div class="bal-sub">今日 <b>${todaySum >= 0 ? '+' : ''}${todaySum}</b> · 本周 <b>${weekSum >= 0 ? '+' : ''}${weekSum}</b></div>
    </div>

    <div class="week">
      <button class="wk-nav" data-act="wk" data-d="-1">‹</button>
      <div class="wk-days">
        ${dates.map(dt => {
          const s = ds(dt);
          const has = state.ledger.some(r => r.date === s);
          return `<button class="wk-day ${s === d ? 'on' : ''}" data-act="day" data-d="${s}">
            <span class="wd">${'一二三四五六日'[(dt.getDay() + 6) % 7]}</span>
            <span class="dd">${dt.getDate()}</span>
            <i class="dot ${has ? 'on' : ''}"></i>
          </button>`;
        }).join('')}
      </div>
      <button class="wk-nav" data-act="wk" data-d="1">›</button>
    </div>

    <div class="seg">
      <button class="${kind === 'reward' ? 'on' : ''}" data-act="seg" data-v="reward">奖励</button>
      <button class="${kind === 'penalty' ? 'on' : ''}" data-act="seg" data-v="penalty">惩罚</button>
    </div>
  `;

  state.categories.forEach(cat => {
    const list = kind === 'reward' ? cat.rewards : cat.penalties;
    if (!list.length) return;

    const catSum = list.reduce((s, t) => {
      const r = doneMap[t.id];
      return s + (r ? (r.type === 'in' ? r.points : -r.points) : 0);
    }, 0);

    h += `<div class="card">
      <div class="cat-title ${kind === 'penalty' ? 'pen' : ''}">
        <i class="bar"></i>
        <span class="nm">${esc(cat.name)}</span>
        ${catSum !== 0 ? `<span class="sm ${catSum > 0 ? 'plus' : 'minus'}">${catSum > 0 ? '+' : ''}${catSum}</span>` : ''}
      </div>`;

    list.forEach(t => {
      const rec = doneMap[t.id];
      const done = !!rec;
      const sign = kind === 'penalty' ? '-' : '+';
      const ptsTxt = t.mode === 'level'
        ? sign + (t.levels[0] ? t.levels[0].points : 0) + '起'
        : sign + t.points;
      const sub = t.mode === 'level'
        ? `<i>${t.levels.map(l => esc(l.label) + ' ' + l.points + '分').join(' / ')}</i>`
        : '';
      h += `<div class="task ${done ? 'done' : ''}" data-act="task"
              data-cat="${cat.id}" data-kind="${kind}" data-id="${t.id}">
        <div class="tname">${esc(t.name)}${sub}</div>
        <div class="tpts ${kind === 'penalty' ? 'minus' : 'plus'}">${ptsTxt}</div>
        <div class="tbtn ${kind === 'penalty' ? 'pen' : ''}">${done ? '✓' : '＋'}</div>
      </div>`;
    });
    h += `</div>`;
  });

  if (!state.categories.length) {
    h += `<div class="empty big">还没有分类，去「⚙️ 任务管理」新建一个吧</div>`;
  }

  h += `</div>`;
  return h;
}
```

**Step 2: 验证语法**

```powershell
node --check js/views/check.js
```

Expected: 无输出（语法正确）

**Step 3: 提交**

```powershell
git add js/views/check.js
git commit -m "feat: 打卡页视图"
```

---

### Task 7: 商城页 js/views/shop.js

**Files:**
- Create: `js/views/shop.js`

**Step 1: 写 `js/views/shop.js`（完整代码）**

```js
import { getState, balance } from '../state.js';
import { esc } from '../util.js';

export function viewShop() {
  const state = getState();
  const bal = balance(state.ledger);
  let h = `
  <div class="topbar">
    <h1>积分商城</h1>
    <button class="icon-btn" data-act="go" data-page="manageGoods" title="商品管理">⚙️</button>
  </div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">可用积分</div>
      <div class="bal-num">${bal.toLocaleString()}<span>分</span></div>
    </div>
    <div class="grid">`;

  state.goods.forEach(g => {
    const ok = bal >= g.points;
    h += `<div class="good ${ok ? '' : 'dis'}">
      <div class="g-emoji">${g.emoji || '🎁'}</div>
      <div class="g-name">${esc(g.name)}</div>
      <div class="g-pts">${g.points} 分</div>
      ${ok
        ? `<button class="btn primary sm" data-act="exchange" data-id="${g.id}">兑换</button>`
        : `<button class="btn ghost sm" disabled>还差 ${g.points - bal}</button>`}
    </div>`;
  });

  if (!state.goods.length) {
    h += `<div class="empty big" style="grid-column:1/-1">还没有商品，去「⚙️」添加</div>`;
  }
  h += `</div></div>`;
  return h;
}
```

**Step 2: 验证并提交**

```powershell
node --check js/views/shop.js
git add js/views/shop.js
git commit -m "feat: 商城页视图"
```

---

### Task 8: 明细页 js/views/ledger.js（含趋势图）

**Files:**
- Create: `js/views/ledger.js`

**Step 1: 写 `js/views/ledger.js`（完整代码）**

```js
import { getState, balance, groupByDate, fmtDate, chartSeries } from '../state.js';
import { barChartSVG } from '../chart.js';
import { esc } from '../util.js';

export function viewLedger(route) {
  const state = getState();
  const days = route.chartDays || 7;
  const { dates, byDate } = groupByDate(state.ledger);

  let h = `
  <div class="topbar"><h1>积分明细</h1></div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">当前余额</div>
      <div class="bal-num">${balance(state.ledger).toLocaleString()}<span>分</span></div>
    </div>

    <div class="chart-card">
      <div class="chart-head">
        <span class="ct">每日净得分</span>
        <div class="seg chart-seg">
          <button class="${days === 7 ? 'on' : ''}" data-act="chart-days" data-v="7">7天</button>
          <button class="${days === 30 ? 'on' : ''}" data-act="chart-days" data-v="30">30天</button>
        </div>
      </div>
      ${barChartSVG(chartSeries(state.ledger, days))}
    </div>`;

  if (!dates.length) {
    h += `<div class="empty big">还没有记录，去打卡吧～</div>`;
  }

  dates.forEach(d => {
    const recs = byDate[d];
    const sum = recs.reduce((s, r) => s + (r.type === 'in' ? r.points : -r.points), 0);
    h += `<div class="day-group">
      <div class="day-head">
        <span>${fmtDate(d)}</span>
        <b class="${sum >= 0 ? 'plus' : 'minus'}">${sum >= 0 ? '+' : ''}${sum}</b>
      </div>
      <div class="card">`;
    recs.forEach(r => {
      const isIn = r.type === 'in';
      h += `<div class="led-row">
        <div class="led-title">${isIn ? '➕' : '➖'} ${esc(r.title)}
          ${r.category ? `<span style="color:#9AA0A6;font-size:12px"> · ${esc(r.category)}</span>` : ''}
        </div>
        <div class="led-pts ${isIn ? 'plus' : 'minus'}">${isIn ? '+' : '-'}${r.points}</div>
      </div>`;
    });
    h += `</div></div>`;
  });

  h += `</div>`;
  return h;
}
```

**Step 2: 验证并提交**

```powershell
node --check js/views/ledger.js
git add js/views/ledger.js
git commit -m "feat: 明细页视图（含 7/30 天趋势图）"
```

---

### Task 9: 我的页 js/views/me.js

**Files:**
- Create: `js/views/me.js`

**Step 1: 写 `js/views/me.js`（完整代码）**

```js
import { getState, balance, totals } from '../state.js';

export function viewMe() {
  const state = getState();
  const bal = balance(state.ledger);
  const { income, spend, checkinDays } = totals(state.ledger);
  const tasks = state.categories.reduce((s, c) => s + c.rewards.length + c.penalties.length, 0);

  return `
  <div class="topbar"><h1>我的</h1></div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">当前余额</div>
      <div class="bal-num">${bal.toLocaleString()}<span>分</span></div>
    </div>

    <div class="stat-grid">
      <div class="stat"><b class="plus">${income.toLocaleString()}</b><span>累计获得</span></div>
      <div class="stat"><b class="minus">${spend.toLocaleString()}</b><span>累计消耗</span></div>
      <div class="stat"><b>${checkinDays}</b><span>打卡天数</span></div>
    </div>

    <div class="menu">
      <div class="menu-row" data-act="go" data-page="manage">
        <span class="mi">📚</span><span class="mt">任务与分类管理</span><span class="ma">${tasks} 个任务 ›</span>
      </div>
      <div class="menu-row" data-act="go" data-page="manageGoods">
        <span class="mi">🎁</span><span class="mt">商城商品管理</span><span class="ma">${state.goods.length} 件 ›</span>
      </div>
      <div class="menu-row" data-act="export">
        <span class="mi">📤</span><span class="mt">导出数据备份</span><span class="ma">›</span>
      </div>
      <div class="menu-row" data-act="import">
        <span class="mi">📥</span><span class="mt">导入备份恢复</span><span class="ma">›</span>
      </div>
      <div class="menu-row" data-act="reset">
        <span class="mi">🔄</span><span class="mt">清空所有记录</span><span class="ma">›</span>
      </div>
    </div>
    <div class="hint" style="text-align:center;padding-top:18px">
      数据保存在本机浏览器中，共 ${state.ledger.length} 条流水记录<br>
      建议定期「导出数据备份」保存到手机文件<br>
      安装：Chrome 菜单 → 安装应用 / 添加到主屏幕
    </div>
  </div>`;
}
```

**Step 2: 验证并提交**

```powershell
node --check js/views/me.js
git add js/views/me.js
git commit -m "feat: 我的页视图（含导入恢复入口与安装提示）"
```

---

### Task 10: 管理页 js/views/manage.js 与 manage-goods.js

**Files:**
- Create: `js/views/manage.js`
- Create: `js/views/manage-goods.js`

**Step 1: 写 `js/views/manage.js`（完整代码）**

```js
import { getState } from '../state.js';
import { esc } from '../util.js';

export function viewManage() {
  const state = getState();
  let h = `
  <div class="topbar">
    <button class="icon-btn" data-act="go" data-page="me">‹</button>
    <h1>任务与分类管理</h1>
    <button class="icon-btn" data-act="cat-add">＋</button>
  </div>
  <div class="page">
    <div class="hint">大分类可新增 / 编辑 / 删除；每个分类下可分别管理「奖励」和「惩罚」任务。</div>`;

  state.categories.forEach(cat => {
    h += `<div class="card cat-card">
      <div class="cat-head">
        <div class="cat-name">${esc(cat.name)}</div>
        <button class="mini" data-act="cat-edit" data-id="${cat.id}">编辑</button>
        <button class="mini danger" data-act="cat-del" data-id="${cat.id}">删除</button>
      </div>

      <div class="sub-title">奖励任务 · ${cat.rewards.length}</div>
      ${cat.rewards.map(t => mRow(cat.id, 'reward', t)).join('') || '<div class="empty">暂无</div>'}
      <button class="add-line" data-act="task-add" data-cat="${cat.id}" data-kind="reward">＋ 添加奖励任务</button>

      <div class="sub-title">惩罚任务 · ${cat.penalties.length}</div>
      ${cat.penalties.map(t => mRow(cat.id, 'penalty', t)).join('') || '<div class="empty">暂无</div>'}
      <button class="add-line" data-act="task-add" data-cat="${cat.id}" data-kind="penalty">＋ 添加惩罚任务</button>
    </div>`;
  });

  h += `<button class="big-btn" data-act="cat-add">＋ 新建大分类</button></div>`;
  return h;
}

function mRow(catId, kind, t) {
  const sign = kind === 'penalty' ? '-' : '+';
  const p = t.mode === 'level'
    ? `分档 ${t.levels.map(l => l.points).join('/')}`
    : sign + t.points;
  return `<div class="m-row">
    <div class="m-name">${esc(t.name)}</div>
    <div class="m-pts ${kind === 'penalty' ? 'minus' : 'plus'}">${p}</div>
    <button class="mini" data-act="task-edit" data-cat="${catId}" data-kind="${kind}" data-id="${t.id}">编辑</button>
    <button class="mini danger" data-act="task-del" data-cat="${catId}" data-kind="${kind}" data-id="${t.id}">删</button>
  </div>`;
}
```

**Step 2: 写 `js/views/manage-goods.js`（完整代码）**

```js
import { getState } from '../state.js';
import { esc } from '../util.js';

export function viewManageGoods() {
  const state = getState();
  let h = `
  <div class="topbar">
    <button class="icon-btn" data-act="go" data-page="me">‹</button>
    <h1>商城商品管理</h1>
    <button class="icon-btn" data-act="goods-add">＋</button>
  </div>
  <div class="page">
    <div class="hint">孩子用积分兑换的商品，可随时调整所需分值。</div>
    <div class="card" style="padding:6px 14px">`;

  state.goods.forEach(g => {
    h += `<div class="m-row">
      <div class="m-name">${g.emoji || '🎁'} ${esc(g.name)}</div>
      <div class="m-pts plus">${g.points} 分</div>
      <button class="mini" data-act="goods-edit" data-id="${g.id}">编辑</button>
      <button class="mini danger" data-act="goods-del" data-id="${g.id}">删</button>
    </div>`;
  });

  if (!state.goods.length) h += `<div class="empty">还没有商品</div>`;
  h += `</div><button class="big-btn" data-act="goods-add">＋ 新增商品</button></div>`;
  return h;
}
```

**Step 3: 验证并提交**

```powershell
node --check js/views/manage.js
node --check js/views/manage-goods.js
git add js/views/manage.js js/views/manage-goods.js
git commit -m "feat: 任务分类管理与商品管理视图"
```

---

### Task 11: 主入口 js/main.js（路由、模态框、事件委托、导入流程）

**Files:**
- Modify: `js/main.js`（覆盖 Task 1 的占位内容）

**Step 1: 用以下完整代码覆盖 `js/main.js`**

```js
import {
  init, getState, recordTask, undoRecord, exchange,
  addCategory, renameCategory, removeCategory,
  addTask, updateTask, removeTask,
  addGoods, updateGoods, removeGoods,
  clearLedger, exportJson, importJson,
  todayStr, ds, weekDates
} from './state.js';
import { esc, toast, vibrate, download } from './util.js';
import { viewCheck } from './views/check.js';
import { viewShop } from './views/shop.js';
import { viewLedger } from './views/ledger.js';
import { viewMe } from './views/me.js';
import { viewManage } from './views/manage.js';
import { viewManageGoods } from './views/manage-goods.js';

const route = { name: 'check', date: todayStr(), weekOffset: 0, seg: 'reward', chartDays: 7 };

function render() {
  const views = {
    check: viewCheck, shop: viewShop, ledger: viewLedger,
    me: viewMe, manage: viewManage, manageGoods: viewManageGoods
  };
  document.getElementById('page').innerHTML = views[route.name](route);
  renderTab();
}

function renderTab() {
  const tabs = [['check', '🏠', '打卡'], ['shop', '🎁', '商城'], ['ledger', '📋', '明细'], ['me', '👤', '我的']];
  const el = document.getElementById('tabbar');
  const show = ['check', 'shop', 'ledger', 'me'].includes(route.name);
  if (!show) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = tabs.map(([k, i, n]) =>
    `<button class="tab ${route.name === k ? 'on' : ''}" data-act="go" data-page="${k}">
      <span>${i}</span>${n}
    </button>`).join('');
}

/* ---------- 弹窗 ---------- */

function openModal(html) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="mask" data-act="close"></div><div class="sheet">${html}</div>`;
  m.classList.add('show');
}

function closeModal() {
  const m = document.getElementById('modal');
  m.classList.remove('show');
  m.innerHTML = '';
}

function confirmModal(title, bodyHtml, onConfirm, opts = {}) {
  openModal(`
    <div class="sheet-head">${esc(title)}</div>
    <div class="confirm-body">${bodyHtml}</div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn ${opts.danger ? 'danger' : 'primary'}" id="cfm-ok">${esc(opts.okText || '确定')}</button>
    </div>
  `);
  document.getElementById('cfm-ok').addEventListener('click', function () {
    closeModal();
    onConfirm();
  });
}

/* ---------- 表单 ---------- */

function formCat(id) {
  const state = getState();
  const c = id ? state.categories.find(x => x.id === id) : null;
  openModal(`
    <div class="sheet-head">${c ? '编辑' : '新建'}大分类</div>
    <div class="form">
      <label>分类名称</label>
      <input id="f-cat" value="${c ? esc(c.name) : ''}" placeholder="例如：生活习惯">
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn primary" data-act="cat-save" data-id="${id || ''}">保存</button>
    </div>
  `);
  setTimeout(() => { const i = document.getElementById('f-cat'); if (i) i.focus(); }, 260);
}

function formTask(catId, kind, taskId) {
  const state = getState();
  const cat = state.categories.find(c => c.id === catId);
  const list = kind === 'penalty' ? cat.penalties : cat.rewards;
  const t = taskId ? list.find(x => x.id === taskId) : null;
  const isLevel = !!(t && t.mode === 'level');
  const lv = isLevel ? t.levels.map(l => `${l.label},${l.points}`).join('\n') : '';
  const kindName = kind === 'penalty' ? '惩罚' : '奖励';

  openModal(`
    <div class="sheet-head">${t ? '编辑' : '新建'}${kindName}任务</div>
    <div class="form">
      <label>任务名称</label>
      <input id="f-name" value="${t ? esc(t.name) : ''}" placeholder="例如：主动洗漱">

      <label>分值（填正数${kind === 'penalty' ? '，系统自动按扣分计算' : ''}）</label>
      <input id="f-pts" type="number" inputmode="decimal" value="${t ? t.points : ''}" placeholder="例如：2">

      <label class="ck">
        <input type="checkbox" id="f-level" data-act="toggle-level" ${isLevel ? 'checked' : ''}>
        分档任务（如午睡、单元测试）
      </label>

      <div id="f-level-box" style="display:${isLevel ? 'block' : 'none'}">
        <label>档位设置（每行一个：档位名,分值）</label>
        <textarea id="f-levels" rows="4"
          placeholder="1小时,3&#10;0.5-1小时,2&#10;0-0.5小时,1">${lv}</textarea>
      </div>
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn primary" data-act="task-save"
        data-cat="${catId}" data-kind="${kind}" data-id="${taskId || ''}">保存</button>
    </div>
  `);
  if (!t) setTimeout(() => { const i = document.getElementById('f-name'); if (i) i.focus(); }, 260);
}

function levelPicker(catId, kind, taskId) {
  const state = getState();
  const cat = state.categories.find(c => c.id === catId);
  const list = kind === 'penalty' ? cat.penalties : cat.rewards;
  const t = list.find(x => x.id === taskId);
  const sign = kind === 'penalty' ? '-' : '+';

  openModal(`
    <div class="sheet-head">选择档位 · ${esc(t.name)}</div>
    <div class="level-list">
      ${t.levels.map((l, i) => `
        <button class="level-item" data-act="level-pick"
          data-cat="${catId}" data-kind="${kind}" data-id="${taskId}" data-idx="${i}">
          <span>${esc(l.label)}</span>
          <b>${sign}${l.points} 分</b>
        </button>`).join('')}
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
    </div>
  `);
}

function formGoods(id) {
  const state = getState();
  const g = id ? state.goods.find(x => x.id === id) : null;
  openModal(`
    <div class="sheet-head">${g ? '编辑' : '新增'}商品</div>
    <div class="form">
      <label>商品名称</label>
      <input id="f-gname" value="${g ? esc(g.name) : ''}" placeholder="例如：游乐场">
      <label>所需积分</label>
      <input id="f-gpts" type="number" inputmode="numeric" value="${g ? g.points : ''}" placeholder="例如：100">
      <label>图标 Emoji（可选）</label>
      <input id="f-gemoji" value="${g ? (g.emoji || '') : ''}" placeholder="🎁">
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn primary" data-act="goods-save" data-id="${id || ''}">保存</button>
    </div>
  `);
}

/* ---------- 业务 ---------- */

function doRecord(catId, kind, taskId, levelIdx) {
  const res = recordTask(catId, kind, taskId, route.date, levelIdx);
  if (!res.ok) { toast(res.error); render(); return; }
  render();
  if (res.entry.type === 'out') {
    toast('已扣 ' + res.entry.points + ' 分');
    vibrate([40, 30, 40]);
  } else {
    toast('+' + res.entry.points + ' 分');
    vibrate(20);
  }
  if (res.saved === false) setTimeout(() => toast('注意：本机保存失败'), 1700);
}

function startImport() {
  const input = document.getElementById('import-file');
  input.value = '';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      confirmModal(
        '导入备份',
        '导入会覆盖当前所有分类、商品和流水记录，确定继续？',
        function () {
          const res = importJson(text);
          if (!res.ok) { toast('导入失败：' + res.error); return; }
          render();
          toast('导入成功');
        },
        { danger: true, okText: '确认导入' }
      );
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ---------- 事件委托 ---------- */

document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'go') {
    route.name = el.dataset.page;
    closeModal();
    render();
    window.scrollTo(0, 0);
    return;
  }

  if (act === 'wk') {
    route.weekOffset += parseInt(el.dataset.d, 10);
    const wd = weekDates(route.weekOffset);
    const t = todayStr();
    route.date = wd.some(x => ds(x) === t) ? t : ds(wd[0]);
    render();
    return;
  }
  if (act === 'day') {
    route.date = el.dataset.d;
    render();
    return;
  }
  if (act === 'seg') {
    route.seg = el.dataset.v;
    render();
    return;
  }
  if (act === 'chart-days') {
    route.chartDays = Number(el.dataset.v) || 7;
    render();
    return;
  }

  if (act === 'task') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const state = getState();
    const c = state.categories.find(x => x.id === catId);
    if (!c) return;
    const list = kind === 'penalty' ? c.penalties : c.rewards;
    const t = list.find(x => x.id === id);
    if (!t) return;

    const rec = state.ledger.find(r => r.source === 'task' && r.date === route.date && r.taskId === id);

    if (rec) {
      const isIn = rec.type === 'in';
      const ptsTxt = (isIn ? '+' : '-') + rec.points + ' 分';
      confirmModal(
        '撤销记录',
        `确定撤销「${esc(t.name)}」？<br>将退回 <b style="color:${isIn ? '#FF8A3D' : '#E5484D'};font-size:17px">${ptsTxt}</b>`,
        function () {
          undoRecord(rec.id);
          render();
          toast('已撤销');
        },
        { danger: true, okText: '确认撤销' }
      );
      return;
    }

    if (t.mode === 'level') {
      if (kind === 'penalty') {
        confirmModal(
          '家长确认',
          `确认记一次「${esc(t.name)}」？<br><span style="font-size:13px;color:#9AA0A6">请家长确认后选择扣分档位</span>`,
          function () { levelPicker(catId, kind, id); },
          { danger: true, okText: '继续选择档位' }
        );
      } else {
        levelPicker(catId, kind, id);
      }
      return;
    }

    if (kind === 'penalty') {
      confirmModal(
        '家长确认',
        `确认记一次「${esc(t.name)}」？<br>将扣除 <b style="color:#E5484D;font-size:20px">${t.points}</b> 分`,
        function () { doRecord(catId, kind, id, null); },
        { danger: true, okText: '确认扣 ' + t.points + ' 分' }
      );
      return;
    }

    doRecord(catId, kind, id, null);
    return;
  }

  if (act === 'level-pick') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const idx = parseInt(el.dataset.idx, 10);
    closeModal();
    doRecord(catId, kind, id, idx);
    return;
  }

  /* ---------- 分类管理 ---------- */
  if (act === 'cat-add') { formCat(null); return; }
  if (act === 'cat-edit') { formCat(el.dataset.id); return; }
  if (act === 'cat-del') {
    const c = getState().categories.find(x => x.id === el.dataset.id);
    if (!c) return;
    const n = c.rewards.length + c.penalties.length;
    confirmModal(
      '删除分类',
      `确定删除分类「${esc(c.name)}」？<br>
       <span style="font-size:13px;color:#9AA0A6">该分类下 ${n} 个任务会一并删除<br>历史流水不受影响</span>`,
      function () {
        removeCategory(c.id);
        render();
        toast('已删除');
      },
      { danger: true, okText: '确认删除' }
    );
    return;
  }
  if (act === 'cat-save') {
    const id = el.dataset.id;
    const name = document.getElementById('f-cat').value.trim();
    if (!name) return toast('请输入分类名称');
    if (id) renameCategory(id, name);
    else addCategory(name);
    closeModal();
    render();
    toast('已保存');
    return;
  }

  /* ---------- 任务管理 ---------- */
  if (act === 'task-add') { formTask(el.dataset.cat, el.dataset.kind, null); return; }
  if (act === 'task-edit') { formTask(el.dataset.cat, el.dataset.kind, el.dataset.id); return; }
  if (act === 'task-del') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const c = getState().categories.find(x => x.id === catId);
    if (!c) return;
    const list = kind === 'penalty' ? c.penalties : c.rewards;
    const t = list.find(x => x.id === id);
    if (!t) return;
    confirmModal(
      '删除任务',
      `确定删除任务「${esc(t.name)}」？`,
      function () {
        removeTask(catId, kind, id);
        render();
        toast('已删除');
      },
      { danger: true, okText: '确认删除' }
    );
    return;
  }
  if (act === 'task-save') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const name = document.getElementById('f-name').value.trim();
    if (!name) return toast('请输入任务名称');

    const isLevel = document.getElementById('f-level').checked;
    let levels = [];
    let pts = Math.abs(parseFloat(document.getElementById('f-pts').value) || 0);

    if (isLevel) {
      levels = document.getElementById('f-levels').value.split('\n')
        .map(l => l.trim()).filter(Boolean)
        .map(l => {
          const parts = l.split(/[,，]/);
          return { label: (parts[0] || '').trim(), points: Math.abs(parseFloat(parts[1]) || 0) };
        })
        .filter(l => l.label && l.points > 0);
      if (!levels.length) return toast('请至少填写一个有效档位');
    } else {
      if (!pts) return toast('请输入分值');
    }

    const data = { name, mode: isLevel ? 'level' : 'normal', points: pts, levels };
    if (id) updateTask(catId, kind, id, data);
    else addTask(catId, kind, data);
    closeModal();
    render();
    toast('已保存');
    return;
  }

  /* ---------- 商品管理 ---------- */
  if (act === 'goods-add') { formGoods(null); return; }
  if (act === 'goods-edit') { formGoods(el.dataset.id); return; }
  if (act === 'goods-del') {
    const g = getState().goods.find(x => x.id === el.dataset.id);
    if (!g) return;
    confirmModal(
      '删除商品',
      `确定删除商品「${esc(g.name)}」？`,
      function () {
        removeGoods(g.id);
        render();
        toast('已删除');
      },
      { danger: true, okText: '确认删除' }
    );
    return;
  }
  if (act === 'goods-save') {
    const id = el.dataset.id;
    const name = document.getElementById('f-gname').value.trim();
    const pts = Math.abs(parseInt(document.getElementById('f-gpts').value, 10) || 0);
    const emoji = document.getElementById('f-gemoji').value.trim() || '🎁';
    if (!name) return toast('请输入商品名称');
    if (!pts) return toast('请输入所需积分');
    const data = { name, points: pts, emoji };
    if (id) updateGoods(id, data);
    else addGoods(data);
    closeModal();
    render();
    toast('已保存');
    return;
  }

  /* ---------- 兑换 ---------- */
  if (act === 'exchange') {
    const g = getState().goods.find(x => x.id === el.dataset.id);
    if (!g) return;
    const bal = getState().ledger.reduce((s, r) => s + (r.type === 'in' ? r.points : -r.points), 0);
    if (bal < g.points) return toast('积分不足');

    confirmModal(
      '兑换确认',
      `用 <b style="color:#FF8A3D;font-size:17px">${g.points}</b> 分兑换「${esc(g.name)}」？<br>
       兑换后余额 <b>${bal - g.points}</b> 分<br>
       <span style="font-size:12px;color:#9AA0A6">需家长确认</span>`,
      function () {
        const res = exchange(g.id);
        if (!res.ok) { toast(res.error); return; }
        render();
        toast('兑换成功 🎉');
      },
      { okText: '确认兑换' }
    );
    return;
  }

  /* ---------- 我的 ---------- */
  if (act === 'export') {
    download('dengdeng-points-' + todayStr() + '.json', exportJson());
    toast('已导出备份');
    return;
  }
  if (act === 'import') { startImport(); return; }
  if (act === 'reset') {
    confirmModal(
      '清空所有记录',
      `确定清空所有打卡与流水记录？<br>
       <span style="font-size:13px;color:#9AA0A6">分类和商品会保留，操作不可恢复</span>`,
      function () {
        clearLedger();
        render();
        toast('已清空');
      },
      { danger: true, okText: '确认清空' }
    );
    return;
  }

  /* ---------- 弹窗 ---------- */
  if (act === 'close') { closeModal(); return; }
  if (act === 'toggle-level') {
    const box = document.getElementById('f-level-box');
    if (box) box.style.display = el.checked ? 'block' : 'none';
    return;
  }
});

/* ---------- 启动 ---------- */

init();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
```

**Step 2: 验证语法并跑全量测试**

```powershell
node --check js/main.js
npm test
```

Expected: 语法无输出；测试全部通过。

**Step 3: 桌面人工冒烟（跑开发服务器，用户确认）**

```powershell
npm run dev
```

浏览器打开 http://localhost:8080/ ，检查：切换 Tab、打卡加分/减分、撤销、兑换、明细图表 7/30 天、管理页增删改、导出下载 JSON。

**Step 4: 提交**

```powershell
git add js/main.js
git commit -m "feat: 主入口（路由、弹窗、事件委托、导入导出流程）"
```

---

### Task 12: PWA 资源（manifest、图标、Service Worker）

**Files:**
- Create: `manifest.webmanifest`
- Create: `tools/make-icons.ps1`
- Create: `icons/icon-192.png`、`icons/icon-512.png`、`icons/icon-maskable-512.png`（由脚本生成，需提交）
- Create: `sw.js`

**Step 1: 写 `manifest.webmanifest`**

```json
{
  "name": "蹬蹬积分",
  "short_name": "蹬蹬积分",
  "description": "儿童积分打卡与兑换",
  "lang": "zh-CN",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F4F5F7",
  "theme_color": "#FF8A3D",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Step 2: 写 `tools/make-icons.ps1`**

```powershell
Add-Type -AssemblyName System.Drawing
$outDir = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Icon([int]$Size, [string]$OutPath, [bool]$Maskable) {
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $orange = [System.Drawing.Color]::FromArgb(255, 255, 138, 61)
  $g.Clear([System.Drawing.Color]::Transparent)

  if ($Maskable) {
    $g.Clear($orange)
    $fontPx = $Size * 0.34
  } else {
    $r = [int]($Size * 0.22)
    $d = $r * 2
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc(0, 0, $d, $d, 180, 90)
    $shape.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $shape.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $shape.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $shape.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush($orange)
    $g.FillPath($brush, $shape)
    $fontPx = $Size * 0.5
  }

  $font = New-Object System.Drawing.Font('Microsoft YaHei', [float]$fontPx, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rectF = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString('蹬', $font, $white, $rectF, $sf)

  $g.Dispose()
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-Icon -Size 192 -OutPath (Join-Path $outDir 'icon-192.png') -Maskable $false
New-Icon -Size 512 -OutPath (Join-Path $outDir 'icon-512.png') -Maskable $false
New-Icon -Size 512 -OutPath (Join-Path $outDir 'icon-maskable-512.png') -Maskable $true
Write-Output 'icons generated'
```

**Step 3: 生成图标并验证**

```powershell
pwsh -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path 'icons/icon-512.png'))
"$($img.Width)x$($img.Height)"
$img.Dispose()
```

Expected: `icons generated`；`512x512`

**Step 4: 写 `sw.js`**

```js
const CACHE = 'dd-points-v1';
const ASSETS = [
  './', './index.html', './css/app.css',
  './js/main.js', './js/util.js', './js/store.js', './js/state.js', './js/chart.js',
  './js/views/check.js', './js/views/shop.js', './js/views/ledger.js',
  './js/views/me.js', './js/views/manage.js', './js/views/manage-goods.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req)
      .then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => null);
    const res = cached || await network;
    if (res) return res;
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('离线且无缓存', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
```

**Step 5: 验证离线与安装（桌面，用户确认）**

```powershell
npm run dev
```

Chrome 打开 http://localhost:8080/ ：DevTools → Application → Manifest 无报错、Service Worker 已激活；勾选 Offline 后刷新仍可打开。

**Step 6: 提交**

```powershell
git add manifest.webmanifest sw.js tools/make-icons.ps1 icons/
git commit -m "feat: PWA 清单、图标与 Service Worker"
```

---

### Task 13: README、部署与验收

**Files:**
- Create: `README.md`
- Modify: 无（部署为手动步骤）

**Step 1: 写 `README.md`**

内容需包含：

1. 项目简介：蹬蹬积分——儿童积分打卡 PWA（打卡/商城/明细+趋势图/我的，数据存本机，支持导出导入备份）
2. 目录结构（简要）
3. 本地开发：`npm run dev` → http://localhost:8080 （本地环境 Service Worker 可正常工作）
4. 测试：`npm test`
5. 部署到 GitHub Pages：
   - 在 GitHub 创建 **public** 仓库 `dd-points`
   - `git remote add origin https://github.com/<用户名>/dd-points.git`
   - `git push -u origin main`
   - 仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`，保存
   - 访问 `https://<用户名>.github.io/dd-points/`
6. 手机安装：Android Chrome 打开上述地址 → 右上角菜单 → 「安装应用」/「添加到主屏幕」；之后可断网使用
7. 更新流程：改代码 → `git push` → 手机下次打开自动更新（Service Worker 后台更新缓存）
8. 数据说明：数据存在手机本机浏览器中；换机/恢复用「我的 → 导出数据备份 / 导入备份恢复」；导入会覆盖现有数据

**Step 2: 全量验证**

```powershell
npm test
node --check js/main.js
git status
```

Expected: 测试全部通过；工作区干净（除 README 待提交）。

**Step 3: 提交**

```powershell
git add README.md
git commit -m "docs: README 与部署说明"
```

**Step 4: 推送与上线（需用户提供 GitHub 用户名并已创建仓库）**

```powershell
git remote add origin https://github.com/<用户名>/dd-points.git
git push -u origin main
```

推送后在 GitHub 仓库 Settings → Pages 开启（main / root），等待 1–2 分钟。

**Step 5: 手机验收清单（用户执行）**

1. 手机 Chrome 打开 `https://<用户名>.github.io/dd-points/`
2. 菜单 → 「安装应用」→ 桌面出现「蹬蹬积分」图标，打开为全屏无地址栏
3. 断网后仍能打开并使用
4. 打卡：奖励加分、惩罚弹「家长确认」后扣分、分档任务弹出档位选择
5. 撤销一条打卡记录，余额恢复
6. 商城兑换一件商品，余额减少并出现在明细
7. 明细页趋势图 7 天/30 天切换正常，柱子正橙负红
8. 我的 → 导出数据备份 → 文件保存成功；清空记录后 → 导入刚才的备份 → 数据恢复
9. 管理页增删改分类/任务/商品，打卡页与商城即时生效

---

## 附：关键技术决策备忘

- Task.points 一律存正数；加/减由所属 rewards/penalties 决定（修正了参考文件中惩罚存负数、分档存绝对值的易错设计）
- 导入严格校验（版本、结构、日期格式），失败不覆盖现有数据
- 兑换用「打开应用时」的今天日期记账；打卡用 route.date（支持补记过去日期）
- 打卡任务同日去重由 `recordTask` 保证，UI 已记任务点击走撤销路径
- Service Worker 采用 stale-while-revalidate：离线可用，在线时后台静默更新
- 图标用一次性 PowerShell 脚本生成，不引入任何 npm 依赖

---

## 执行修正记录（2026-09-15 执行期间）

以下偏差已在执行中完成并通过测试，后续任务以本记录为准（与上文冲突处按本记录执行）：

### Task 2 相关（提交 5237e2a）
- `loadState` 在回退种子前，把无法解析/校验失败的原始字符串备份到 `STORAGE_KEY + '_backup_' + 时间戳`（尽力而为），避免静默丢数据
- `validateState` 加固：id 必须匹配 `/^[A-Za-z0-9_-]{1,64}$/`；各对象仅允许已知字段（`hasOnlyKeys`）；数值字段必须 `Number.isFinite`；商品/分类名称非空；`__proto__` 等未知字段被拒绝
- `package.json` 的 `test` 脚本改为裸 `node --test`（原 `node --test tests/` 在 Windows/Node 22 下报错）

### Task 3/4 相关（提交 cecdddb、bbf7174、471f0a2、383279e）
- 测试补充：空账本零值、负值、跨年周、totals 来源过滤、undoRecord 契约、写入侧校验、非法日期、导入回滚、档位未知字段
- `undoRecord` 改为 findIndex/splice：未知 id 返回 `{ok:false, error:'记录不存在'}` 且不写盘；成功返回 `{ok:true, saved}`
- 写入侧校验（`validKind` / `validTaskData` / `validGoodsData` + `DATE_RE`）：`recordTask` 校验 kind 与日期格式；`addTask/updateTask/addGoods/updateGoods` 校验名称/分值/mode/档位/未知字段；`addCategory/renameCategory` 名称非空
- `importJson` 持久化失败时回滚内存状态并返回 `{ok:false, error:'本机保存失败，导入已取消'}`

### Task 11 必须遵守的接口约定（替换计划中相应片段）
- 所有变更操作调用后必须检查返回值：`res.ok === false` 时 toast 显示 `res.error` 且不显示成功；`res.saved === false` 时提示「已修改，但本机保存失败」
- 分档任务保存时 `points` 必须取档位最大分值：`Math.max(...levels.map(l => l.points))`，不能依赖分值输入框的值
- 导入完成后按 `res.ok` 判断结果，不再无条件 toast「导入成功」

### 视图与数据加固（提交 d392b2b）
- `g.emoji` 双端防护：视图用 `esc` 转义；`validGoodsData`/`validateState` 限制为长度 ≤ 16 且不含 `&<>"']`
- 分档任务卡片头部改为显示最高档（`Math.max(...levels.map(l => l.points))`），不再用 `levels[0]`
- 新增 `sumNet(records)`（`balance` 委托给它）与 `fmtPts(n)`（消除浮点尾差），视图内的求和与数值展示统一走这两个函数
- 打卡页：当前分段无任务时显示空态；`+0` 不再显示正号；周导航按钮加 `aria-label`；`.mini` 按钮禁止压缩换行

### Task 11 补充（提交 eacab2d、d4786cf、187a8e1）
- 所有变更调用的成功提示都区分 `res.saved === false`（含撤销）；对话框与档位弹窗数值统一 `fmtPts`
- 任务编辑表单的档位文本使用 `esc(l.label)`；`validTaskData`/`validTask` 同时拒绝含 `&<>"'` 的档位名
- 导入：去除 UTF-8 BOM、增加 `reader.onerror` 提示
- `state.init` 改用 `safeStorage()`，localStorage 访问抛异常时应用仍可加载（内存模式，保存会提示失败）
- 商品积分改用 `parseFloat`（与任务一致，支持小数）
- `formTask`/`levelPicker` 增加 `!cat`/`!t` 防御性守卫

### Task 12 补充（提交 c8e9957）
- Service Worker 改为「在线优先、离线回退缓存」：手机上再次打开（联网）即拿到新版本，离线功能不变
- 激活时只清理 `dd-points-` 前缀的缓存，避免误删同域（github.io 共享域）其他项目的缓存
- README 更新说明以此为准：联网时下次打开即生效

### 功能增强：可重复任务（提交 c465851、47284d0）
- 详见设计文档「功能增强：可重复任务」；校验允许 `repeat` 缺省，兼容旧备份
- `latestTaskRecord` 按 `ts` 取当天最近一条；`updateTask` 未传 `repeat` 时保留原值
- 打卡页分类汇总改为按任务累计（修复多记录汇总）；撤销确认文案统一为「撤销后余额 ±N 分」

### 功能增强：兑换数量与兑换记录（提交 906714a、cf70049、6665aa4）
- 详见设计文档「功能增强：兑换数量与兑换记录」
- `maxExchangeCount(bal, price)` 纯函数统一步进器上限（≤ 999），`exchange(goodsId, count)` 以 `round2` 合计并校验
- 兑换记录渲染为 shop.js 纯函数 `exchangeLogHtml(state)`，便于单测
- 商品积分最低 0.01、最多两位小数（写入侧与导入校验同时约束）

### 功能增强：明细趋势图奖惩双柱（提交 2debb40、b49a4d7）
- 详见设计文档「功能增强：明细趋势图奖惩分开展示」
- `dualBarChartSVG` 替换原 `barChartSVG`；`chartSeries` 返回 `{date,label,reward,penalty,net}`（仅打卡口径）
- 抽取 `taskSplit(records)` 统一图/日汇总口径；每日标题「任务净」，图例标注「仅统计打卡，不含兑换」

### 功能增强：家长锁（提交 5e36a8a、6424c80、2803b1a）
- 详见设计文档「功能增强：家长锁」；新增 `js/auth.js` 与 `js/views/auth.js`，SW 缓存清单已更新
- 启动顺序：无密码→设置页；记住了且已确认恢复码→直接进入；未记住→锁屏；未确认恢复码仅对「记住密码」设备直接展示（其余需先验密码）
- 存储失败时提供「暂不设置，先使用」逃生通道；异步操作有 authBusy 防抖
- 恢复码生命周期：设置/修改/重设后需确认，未确认则下次启动自动重新生成（不落明文）
