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

test('负值柱从零轴向下、正负颜色区分', () => {
  const svg = barChartSVG([
    { label: '9/13', value: 4 },
    { label: '9/14', value: -2 }
  ], { width: 300, height: 150 });
  const base = (150 - 18) / 2;
  const rects = [...svg.matchAll(/<rect x="[^"]*" y="([\d.]+)" width="[^"]*" height="([\d.]+)" rx="2" fill="([^"]+)"/g)]
    .map(m => ({ y: Number(m[1]), h: Number(m[2]), fill: m[3] }));
  assert.equal(rects.length, 2);
  assert.ok(rects[0].y + rects[0].h <= base + 0.01);
  assert.ok(rects[1].y >= base - 0.01);
  assert.ok(rects[1].y + rects[1].h > base);
  assert.notEqual(rects[0].fill, rects[1].fill);
});

test('30 天时首尾标签不越界', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ label: '10/' + (i + 1), value: i % 3 }));
  const svg = barChartSVG(items, { width: 300, height: 150 });
  const xs = [...svg.matchAll(/<text x="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.ok(xs.length > 0);
  for (const x of xs) assert.ok(x >= 10 && x <= 290, 'x=' + x);
});

test('极大差值下极小值仍可见', () => {
  const svg = barChartSVG([
    { label: 'a', value: 1 },
    { label: 'b', value: 100000 }
  ], { width: 300, height: 150 });
  const heights = [...svg.matchAll(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="([\d.]+)"/g)]
    .map(m => Number(m[1]));
  assert.equal(heights.length, 2);
  assert.ok(heights[0] >= 0.5);
  assert.ok(heights[1] > heights[0]);
});
