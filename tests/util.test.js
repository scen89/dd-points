import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, fmtPts } from '../js/util.js';

test('esc 转义全部五个字符', () => {
  assert.equal(esc('&'), '&amp;');
  assert.equal(esc('<'), '&lt;');
  assert.equal(esc('>'), '&gt;');
  assert.equal(esc('"'), '&quot;');
  assert.equal(esc("'"), '&#39;');
});

test('esc 处理属性上下文注入', () => {
  const out = `<input value="${esc('a" onfocus="alert(1)')}">`;
  assert.ok(!out.includes('" onfocus='));
  const img = esc('<img src=x onerror=alert(1)>');
  assert.ok(!img.includes('<'));
  assert.ok(!img.includes('>'));
});

test('esc 对非字符串输入不崩溃', () => {
  assert.equal(esc(42), '42');
  assert.equal(esc(null), 'null');
});

test('fmtPts 消除浮点尾差', () => {
  assert.equal(fmtPts(0.1 + 0.2), 0.3);
  assert.equal(fmtPts(3), 3);
  assert.equal(fmtPts(-0.30000000000000004), -0.3);
});
