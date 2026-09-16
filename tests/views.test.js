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
