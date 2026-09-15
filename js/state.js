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
