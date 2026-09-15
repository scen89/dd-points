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
