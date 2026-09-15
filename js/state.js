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
