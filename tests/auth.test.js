import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/auth.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    _dump: () => Object.fromEntries(m)
  };
}

test('setPin 校验位数并生成恢复码', async () => {
  const s = memStorage();
  assert.equal((await A.setPin('12', s)).ok, false);
  assert.equal((await A.setPin('1234567', s)).ok, false);
  assert.equal((await A.setPin('12a4', s)).ok, false);
  const res = await A.setPin('1234', s);
  assert.equal(res.ok, true);
  assert.match(res.recoveryCode, /^[A-Z2-9]{8}$/);
  assert.equal(A.hasPin(s), true);
  assert.equal(A.isRemembered(s), false);
  const raw = s._dump()['dengdeng_auth_v1'];
  assert.ok(!raw.includes('1234'), '明文不应落盘');
  assert.match(A.formatRecoveryCode(res.recoveryCode), /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

test('verifyPin 正确/错误/未设置', async () => {
  const s = memStorage();
  assert.equal(await A.verifyPin('1234', s), false);
  await A.setPin('1234', s);
  assert.equal(await A.verifyPin('1234', s), true);
  assert.equal(await A.verifyPin('9999', s), false);
});

test('记住密码与退出', async () => {
  const s = memStorage();
  await A.setPin('1234', s);
  A.remember(s);
  assert.equal(A.isRemembered(s), true);
  A.forget(s);
  assert.equal(A.isRemembered(s), false);
});

test('恢复码重设密码：容错横线、旧码作废', async () => {
  const s = memStorage();
  const first = await A.setPin('1234', s);
  assert.equal((await A.resetWithRecovery('BADCODE1', '5678', s)).ok, false);
  const formatted = A.formatRecoveryCode(first.recoveryCode).toLowerCase();
  const res = await A.resetWithRecovery(formatted, '5678', s);
  assert.equal(res.ok, true);
  assert.equal(await A.verifyPin('5678', s), true);
  assert.equal(await A.verifyPin('1234', s), false);
  assert.equal((await A.resetWithRecovery(first.recoveryCode, '1111', s)).ok, false, '旧恢复码应作废');
});

test('changePin 需验证当前密码且保留记住状态', async () => {
  const s = memStorage();
  await A.setPin('1234', s);
  A.remember(s);
  assert.equal((await A.changePin('0000', '5678', s)).ok, false);
  const res = await A.changePin('1234', '5678', s);
  assert.equal(res.ok, true);
  assert.equal(await A.verifyPin('5678', s), true);
  assert.equal(A.isRemembered(s), true);
});

test('clearAuth 清除后无密码', async () => {
  const s = memStorage();
  await A.setPin('1234', s);
  A.clearAuth(s);
  assert.equal(A.hasPin(s), false);
  assert.equal(A.isRemembered(s), false);
});

test('恢复码确认状态与重新生成：新码可用、旧码作废', async () => {
  const s = memStorage();
  const first = await A.setPin('1234', s);
  assert.equal(A.isCodeAcked(s), false);
  assert.equal(A.acknowledgeCode(s).ok, true);
  assert.equal(A.isCodeAcked(s), true);
  const regen = await A.regenerateRecoveryCode(s);
  assert.equal(regen.ok, true);
  assert.equal(A.isCodeAcked(s), false);
  assert.notEqual(regen.recoveryCode, first.recoveryCode);
  assert.equal((await A.resetWithRecovery(first.recoveryCode, '5678', s)).ok, false);
  assert.equal((await A.resetWithRecovery(regen.recoveryCode, '5678', s)).ok, true);
});

test('存储不可用时 setPin/acknowledge 返回失败且不抛出', async () => {
  const failStorage = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  const res = await A.setPin('1234', failStorage);
  assert.equal(res.ok, false);
  assert.equal(A.hasPin(failStorage), false);
  assert.equal(A.acknowledgeCode(failStorage).ok, false);
});

test('导出备份不含认证数据', async () => {
  const { createSeedState, buildExport } = await import('../js/store.js');
  const s = memStorage();
  await A.setPin('1234', s);
  const payload = JSON.stringify(buildExport(createSeedState()));
  assert.ok(!payload.includes('pinHash'));
  assert.ok(!payload.includes('recoveryHash'));
  assert.ok(!payload.includes('dengdeng_auth'));
});
