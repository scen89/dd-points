import test from 'node:test';
import assert from 'node:assert/strict';
import { dualBarChartSVG } from '../js/chart.js';

const OPTS = { width: 300, height: 150 };
const BASE = (150 - 18) / 2;

test('空数据返回空串', () => {
  assert.equal(dualBarChartSVG([], OPTS), '');
});

test('奖惩双柱：奖励向上在左、惩罚向下在右、颜色不同', () => {
  const svg = dualBarChartSVG([{ label: '9/13', reward: 4, penalty: 2 }], OPTS);
  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="2" fill="([^"]+)"/g)]
    .map(m => ({ x: Number(m[1]), y: Number(m[2]), fill: m[5] }));
  assert.equal(rects.length, 2);
  const up = rects.find(r => r.y < BASE);
  const down = rects.find(r => r.y >= BASE);
  assert.ok(up && down, '应有一上一下两根柱');
  assert.notEqual(up.fill, down.fill);
  assert.ok(up.x < down.x, '奖励柱在左');
});

test('零值不画柱但有零轴与标签', () => {
  const svg = dualBarChartSVG([{ label: '9/13', reward: 0, penalty: 0 }], OPTS);
  assert.equal([...svg.matchAll(/<rect/g)].length, 0);
  assert.ok(svg.includes('<line'));
  assert.ok(svg.includes('9/13'));
});

test('30 天标签抽样且不越界', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ label: '10/' + (i + 1), reward: i % 3, penalty: i % 2 }));
  const svg = dualBarChartSVG(items, { width: 300, height: 150 });
  const xs = [...svg.matchAll(/<text x="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.ok(xs.length > 0 && xs.length <= 8);
  for (const x of xs) assert.ok(x >= 10 && x <= 290, 'x=' + x);
});

test('极大差值下极小柱仍可见', () => {
  const svg = dualBarChartSVG([{ label: 'a', reward: 1, penalty: 100000 }], { width: 300, height: 150 });
  const heights = [...svg.matchAll(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.equal(heights.length, 2);
  assert.ok(Math.min(...heights) >= 0.5);
});

test('标签被转义', () => {
  const svg = dualBarChartSVG([{ label: '<img src=x onerror=1>', reward: 1, penalty: 0 }], OPTS);
  assert.ok(!svg.includes('<img'));
  assert.ok(svg.includes('&lt;img'));
});
