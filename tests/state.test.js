import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/state.js';
import { validateState } from '../js/store.js';

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

test('空账本的派生计算输出为零值', () => {
  assert.equal(S.balance([]), 0);
  assert.equal(S.dayNet([], '2026-09-15'), 0);
  assert.equal(S.netSum([], ['2026-09-15']), 0);
  const series = S.chartSeries([], 7, new Date(2026, 8, 15));
  assert.equal(series.length, 7);
  assert.ok(series.every(x => x.value === 0));
  assert.deepEqual(S.groupByDate([]), { dates: [], byDate: {} });
  assert.deepEqual(S.totals([]), { income: 0, spend: 0, checkinDays: 0, count: 0 });
});

test('totals 的打卡天数只统计打卡流水', () => {
  const ledger = [
    A('in', 10, '2026-09-15'),
    { id: 'e1', type: 'out', points: 4, source: 'exchange', title: '兑换 · 测试', date: '2026-09-14', ts: 2 }
  ];
  const t = S.totals(ledger);
  assert.equal(t.income, 10);
  assert.equal(t.spend, 4);
  assert.equal(t.count, 2);
  assert.equal(t.checkinDays, 1);
});

test('负余额与负净得分', () => {
  const ledger = [A('in', 3, '2026-09-15'), A('out', 10, '2026-09-15')];
  assert.equal(S.balance(ledger), -7);
  assert.equal(S.dayNet(ledger, '2026-09-15'), -7);
  const series = S.chartSeries(ledger, 7, new Date(2026, 8, 15));
  assert.equal(series[6].value, -7);
});

test('weekDates 跨年边界', () => {
  const jan1 = new Date(2026, 0, 1); // 周四
  assert.deepEqual(S.weekDates(0, jan1).map(S.ds), [
    '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'
  ]);
});

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

test('undoRecord 未知 id 返回错误且不写入', () => {
  const { storage, state } = freshState();
  const before = state.updatedAt;
  const res = S.undoRecord('nope');
  assert.equal(res.ok, false);
  assert.ok(res.error);
  assert.equal(state.updatedAt, before);
  assert.ok(storage.getItem('dengdeng_points_v1'));
});

test('undoRecord 成功后返回 saved 标志并持久化', () => {
  const { storage, state } = freshState();
  const cat = state.categories[0];
  const { entry } = S.recordTask(cat.id, 'reward', cat.rewards[0].id, '2026-09-15');
  const res = S.undoRecord(entry.id);
  assert.equal(res.ok, true);
  assert.equal(res.saved, true);
  assert.equal(JSON.parse(storage.getItem('dengdeng_points_v1')).ledger.length, 0);
});

test('写入侧校验拒绝非法任务/商品/分类且状态仍合法', () => {
  const { state } = freshState();
  const c = S.addCategory('校验');
  assert.equal(c.ok, true);
  assert.equal(S.addTask(c.id, 'reward', { name: '坏任务', mode: 'normal', points: 0, levels: [] }).ok, false);
  assert.equal(S.addTask(c.id, 'reward', { name: '', mode: 'normal', points: 5, levels: [] }).ok, false);
  assert.equal(S.addTask(c.id, 'reward', { name: '坏分档', mode: 'level', points: 5, levels: [] }).ok, false);
  assert.equal(S.addTask(c.id, 'reward', { name: '坏分档2', mode: 'level', points: 5, levels: [{ label: '档', points: 0 }] }).ok, false);
  assert.equal(S.addTask(c.id, 'penalties', { name: '错 kind', mode: 'normal', points: 5, levels: [] }).ok, false);
  assert.equal(S.addGoods({ name: '坏商品', points: 0, emoji: '🎁' }).ok, false);
  assert.equal(S.addGoods({ name: '', points: 5, emoji: '🎁' }).ok, false);
  assert.equal(S.addCategory('  ').ok, false);
  const t = S.addTask(c.id, 'reward', { name: '好任务', mode: 'normal', points: 5, levels: [] });
  assert.equal(t.ok, true);
  assert.equal(S.updateTask(c.id, 'reward', t.id, { name: '坏改', mode: 'normal', points: -1, levels: [] }).ok, false);
  assert.equal(validateState(state).ok, true);
});

test('recordTask 拒绝非法日期格式', () => {
  const { state } = freshState();
  const cat = state.categories[0];
  assert.equal(S.recordTask(cat.id, 'reward', cat.rewards[0].id, '2026/09/15').ok, false);
});

test('importJson 保存失败时回滚且返回错误', () => {
  const good = memStorage();
  S.init(good);
  const state = S.getState();
  state.ledger.push({ id: 'z', type: 'in', points: 7, source: 'task', title: '导入用', date: '2026-09-15', ts: 3 });
  const text = S.exportJson();

  const failStorage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  S.init(failStorage);
  const seedState = S.getState();
  const res = S.importJson(text);
  assert.equal(res.ok, false);
  assert.ok(res.error);
  assert.equal(S.getState(), seedState);
});

test('写入侧校验拒绝带未知字段的档位', () => {
  const { state } = freshState();
  const c = S.addCategory('校验2');
  const res = S.addTask(c.id, 'reward', {
    name: '档位带脏字段',
    mode: 'level',
    points: 5,
    levels: [{ label: 'a', points: 1, extra: true }]
  });
  assert.equal(res.ok, false);
  assert.equal(validateState(state).ok, true);
});

test('sumNet 汇总任意记录集合', () => {
  const recs = [A('in', 10, '2026-09-15'), A('out', 3, '2026-09-15')];
  assert.equal(S.sumNet(recs), 7);
  assert.equal(S.sumNet([]), 0);
});

test('写入侧校验拒绝可疑商品图标', () => {
  const { state } = freshState();
  assert.equal(S.addGoods({ name: '坏图标', points: 5, emoji: '<b>' }).ok, false);
  assert.equal(S.addGoods({ name: '长图标', points: 5, emoji: 'x'.repeat(17) }).ok, false);
  assert.equal(validateState(state).ok, true);
});

test('写入侧校验拒绝可疑档位名称', () => {
  const { state } = freshState();
  const c = S.addCategory('校验3');
  const res = S.addTask(c.id, 'reward', {
    name: '任务', mode: 'level', points: 5,
    levels: [{ label: '</textarea><img>', points: 1 }]
  });
  assert.equal(res.ok, false);
  assert.equal(validateState(state).ok, true);
});

test('存储不可用时 init 仍加载种子、变更报告 saved:false', () => {
  S.init(null);
  assert.equal(validateState(S.getState()).ok, true);
  const res = S.addCategory('无存储');
  assert.equal(res.ok, true);
  assert.equal(res.saved, false);
});

test('写入侧校验拒绝非数组档位与非法日历日期', () => {
  const { state } = freshState();
  const c = S.addCategory('校验4');
  assert.equal(S.addTask(c.id, 'reward', { name: '任务', mode: 'normal', points: 5, levels: 'x' }).ok, false);
  assert.equal(S.recordTask(state.categories[0].id, 'reward', state.categories[0].rewards[0].id, '2026-02-31').ok, false);
  assert.equal(validateState(state).ok, true);
});
