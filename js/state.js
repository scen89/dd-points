import { loadState, saveState, uid, buildExport, parseImport } from './store.js';

let state = null;
let storage = null;

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch (e) {
    return null;
  }
}

export function init(storageObj) {
  storage = storageObj || safeStorage();
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
  return sumNet(ledger);
}

export function sumNet(records) {
  return records.reduce((s, r) => s + (r.type === 'in' ? r.points : -r.points), 0);
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function validKind(kind) {
  return kind === 'reward' || kind === 'penalty';
}

function hasOnlyKeys(o, allowed) {
  return Object.keys(o).every(k => allowed.includes(k));
}

function validTaskData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '任务数据非法';
  if (!hasOnlyKeys(data, ['name', 'mode', 'points', 'levels', 'repeat'])) return '任务包含未知字段';
  if (typeof data.name !== 'string' || !data.name.trim()) return '任务名称不能为空';
  if (data.mode !== 'normal' && data.mode !== 'level') return '任务类型非法';
  if (!Number.isFinite(data.points) || !(data.points > 0)) return '任务分值必须为正数';
  if (data.repeat !== undefined && typeof data.repeat !== 'boolean') return '任务 repeat 非法';
  if (!Array.isArray(data.levels)) return '任务缺少档位列表';
  if (data.mode === 'level') {
    if (!data.levels.length) return '分档任务至少需要一个档位';
    for (const l of data.levels) {
      if (!l || typeof l !== 'object' || Array.isArray(l)) return '档位数据非法';
      if (!hasOnlyKeys(l, ['label', 'points'])) return '档位包含未知字段';
      if (typeof l.label !== 'string' || !l.label.trim()) return '档位名称不能为空';
      if (/[&<>"']/.test(l.label)) return '档位名称包含非法字符';
      if (!Number.isFinite(l.points) || !(l.points > 0)) return '档位分值必须为正数';
    }
  }
  return null;
}

function validGoodsData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '商品数据非法';
  if (!hasOnlyKeys(data, ['name', 'points', 'emoji'])) return '商品包含未知字段';
  if (typeof data.name !== 'string' || !data.name.trim()) return '商品名称不能为空';
  if (!Number.isFinite(data.points) || !(data.points > 0)) return '商品积分必须为正数';
  if (typeof data.emoji !== 'string' || data.emoji.length > 16 || /[&<>"']/.test(data.emoji)) return '商品图标非法';
  return null;
}

export function recordTask(catId, kind, taskId, date, levelIdx = null) {
  const s = getState();
  if (!validKind(kind)) return { ok: false, error: '任务类型非法' };
  if (!validDateStr(date)) return { ok: false, error: '日期格式非法' };
  const cat = s.categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  const task = findList(cat, kind).find(t => t.id === taskId);
  if (!task) return { ok: false, error: '任务不存在' };
  if (task.repeat !== true && s.ledger.some(r => r.source === 'task' && r.date === date && r.taskId === taskId)) {
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

export function latestTaskRecord(ledger, taskId, date) {
  let found = null;
  for (const r of ledger) {
    if (r.source !== 'task' || r.taskId !== taskId || r.date !== date) continue;
    if (!found || r.ts >= found.ts) found = r;
  }
  return found;
}

export function undoRecord(entryId) {
  const s = getState();
  const idx = s.ledger.findIndex(r => r.id === entryId);
  if (idx < 0) return { ok: false, error: '记录不存在' };
  s.ledger.splice(idx, 1);
  return { ok: true, saved: persist().ok };
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
  if (typeof name !== 'string' || !name.trim()) return { ok: false, error: '分类名称不能为空' };
  const s = getState();
  const c = { id: uid(), name, rewards: [], penalties: [] };
  s.categories.push(c);
  return { ok: true, id: c.id, saved: persist().ok };
}

export function renameCategory(id, name) {
  if (typeof name !== 'string' || !name.trim()) return { ok: false, error: '分类名称不能为空' };
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
  if (!validKind(kind)) return { ok: false, error: '任务类型非法' };
  const cat = getState().categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  const err = validTaskData(data);
  if (err) return { ok: false, error: err };
  const task = { id: uid(), name: data.name, mode: data.mode, points: data.points, levels: data.levels || [], repeat: data.repeat === true };
  findList(cat, kind).push(task);
  return { ok: true, id: task.id, saved: persist().ok };
}

export function updateTask(catId, kind, taskId, data) {
  if (!validKind(kind)) return { ok: false, error: '任务类型非法' };
  const cat = getState().categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  const task = findList(cat, kind).find(t => t.id === taskId);
  if (!task) return { ok: false, error: '任务不存在' };
  const err = validTaskData(data);
  if (err) return { ok: false, error: err };
  Object.assign(task, {
    name: data.name,
    mode: data.mode,
    points: data.points,
    levels: data.levels || [],
    repeat: data.repeat === undefined ? task.repeat === true : data.repeat === true
  });
  return { ok: true, saved: persist().ok };
}

export function removeTask(catId, kind, taskId) {
  if (!validKind(kind)) return { ok: false, error: '任务类型非法' };
  const cat = getState().categories.find(c => c.id === catId);
  if (!cat) return { ok: false, error: '分类不存在' };
  if (kind === 'penalty') cat.penalties = cat.penalties.filter(t => t.id !== taskId);
  else cat.rewards = cat.rewards.filter(t => t.id !== taskId);
  return { ok: true, saved: persist().ok };
}

export function addGoods(data) {
  const s = getState();
  const err = validGoodsData(data);
  if (err) return { ok: false, error: err };
  const g = { id: uid(), name: data.name, points: data.points, emoji: data.emoji };
  s.goods.push(g);
  return { ok: true, id: g.id, saved: persist().ok };
}

export function updateGoods(id, data) {
  const g = getState().goods.find(x => x.id === id);
  if (!g) return { ok: false, error: '商品不存在' };
  const err = validGoodsData(data);
  if (err) return { ok: false, error: err };
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
  const prev = state;
  state = res.state;
  if (!persist().ok) {
    state = prev;
    return { ok: false, error: '本机保存失败，导入已取消' };
  }
  return { ok: true, saved: true };
}
