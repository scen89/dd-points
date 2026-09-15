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
