import test from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../js/util.js';

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
