import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/state.js';
import { viewCheck } from '../js/views/check.js';
import { viewShop } from '../js/views/shop.js';
import { viewLedger } from '../js/views/ledger.js';
import { viewMe } from '../js/views/me.js';
import { viewManage } from '../js/views/manage.js';
import { viewManageGoods } from '../js/views/manage-goods.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v))
  };
}

test('六个视图对恶意数据不崩溃且转义', () => {
  S.init(memStorage());
  const state = S.getState();
  const evil = '"><img src=x onerror=alert(1)>';
  state.categories[0].name = evil;
  state.categories[0].rewards[0].name = evil;
  state.categories[0].rewards[0].levels = 'oops';
  state.goods[0].name = evil;
  state.goods[0].emoji = '<b>';
  state.ledger.push({
    id: 'lv1', type: 'out', points: 1, source: 'exchange',
    title: evil, category: evil, date: S.todayStr(), ts: 1
  });

  const route = { name: 'check', date: S.todayStr(), weekOffset: 0, seg: 'reward', chartDays: 7 };
  const htmls = [
    viewCheck(route),
    viewCheck({ ...route, seg: 'penalty' }),
    viewShop(route),
    viewLedger(route),
    viewMe(route),
    viewManage(route),
    viewManageGoods(route)
  ];
  for (const html of htmls) {
    assert.ok(typeof html === 'string' && html.length > 0);
    assert.ok(!html.includes('<img'), '存在未转义的 img 标签');
  }
});

test('可重复任务渲染计数与撤销按钮', () => {
  S.init(memStorage());
  const state = S.getState();
  const cat = state.categories[0];
  const rep = S.addTask(cat.id, 'reward', { name: '口算100道', mode: 'normal', points: 2, levels: [], repeat: true });
  S.recordTask(cat.id, 'reward', rep.id, S.todayStr());
  S.recordTask(cat.id, 'reward', rep.id, S.todayStr());
  const html = viewCheck({ name: 'check', date: S.todayStr(), weekOffset: 0, seg: 'reward', chartDays: 7 });
  assert.ok(html.includes('×2'), '应显示 ×2 计数');
  assert.ok(html.includes('data-act="task-undo"'), '应显示撤销按钮');
  assert.ok(html.includes('可重复'), '应显示可重复标记');
  assert.ok(html.includes('+4'), '分类汇总应累计两条记录');

  const pen = S.addTask(cat.id, 'penalty', { name: '可重复惩罚', mode: 'normal', points: 2, levels: [], repeat: true });
  S.recordTask(cat.id, 'penalty', pen.id, S.todayStr());
  S.recordTask(cat.id, 'penalty', pen.id, S.todayStr());
  const html2 = viewCheck({ name: 'check', date: S.todayStr(), weekOffset: 0, seg: 'penalty', chartDays: 7 });
  assert.ok(html2.includes('-4'), '惩罚分类汇总应为 -4');
});
