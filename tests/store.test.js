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

test('loadState 损坏数据回退种子前会保留原始备份', () => {
  const raw = '{"schemaVersion":1,"categories":"bad"}';
  const storage = memStorage({ [STORAGE_KEY]: raw });
  const s = loadState(storage);
  assert.equal(validateState(s).ok, true);
  const backupKey = Object.keys(storage._dump()).find(k => k.startsWith(STORAGE_KEY + '_backup_'));
  assert.ok(backupKey, '应存在备份键');
  assert.equal(storage._dump()[backupKey], raw);
});

test('validateState 拒绝非法 id、未知字段与非有限数值', () => {
  const s1 = createSeedState();
  s1.categories[0].rewards[0].id = '"><img src=x onerror=alert(1)>';
  assert.equal(validateState(s1).ok, false);

  const s2 = createSeedState();
  s2.categories[0].rewards[0].points = Infinity;
  assert.equal(validateState(s2).ok, false);

  const base = JSON.parse(JSON.stringify(createSeedState()));
  base.extra = 1;
  assert.equal(parseImport(JSON.stringify(buildExport(base))).ok, false);
});

test('parseImport 拒绝 __proto__ 注入且不污染原型', () => {
  const evil = '{"app":"dengdeng-points","schemaVersion":1,"state":{"schemaVersion":1,"categories":[],"goods":[],"ledger":[],"__proto__":{"polluted":true}}}';
  const res = parseImport(evil);
  assert.equal(res.ok, false);
  assert.equal({}.polluted, undefined);
});
