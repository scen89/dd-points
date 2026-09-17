import { esc } from '../util.js';
import { formatRecoveryCode } from '../auth.js';

export function authSetupHtml() {
  return `
  <div class="lock-screen">
    <div class="lock-logo">👦</div>
    <h1 class="lock-title">蹬蹬积分</h1>
    <p class="lock-sub">首次使用，请设置家长密码<br>忘记密码时可用恢复码找回</p>
    <input id="lock-pin" class="lock-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="输入 4–6 位数字密码">
    <input id="lock-pin2" class="lock-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="再输一次确认">
    <label class="lock-remember"><input type="checkbox" id="lock-remember" checked> 记住密码，下次直接进入</label>
    <button class="btn primary lock-btn" data-act="lock-setup">设置并进入</button>
  </div>`;
}

export function authLockHtml() {
  return `
  <div class="lock-screen">
    <div class="lock-logo">👦</div>
    <h1 class="lock-title">蹬蹬积分</h1>
    <p class="lock-sub">请输入家长密码</p>
    <input id="lock-pin" class="lock-input" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" placeholder="4–6 位数字密码">
    <label class="lock-remember"><input type="checkbox" id="lock-remember"> 记住密码，下次直接进入</label>
    <button class="btn primary lock-btn" data-act="lock-enter">进入</button>
    <button class="lock-link" data-act="lock-forgot">忘记密码？</button>
  </div>`;
}

export function authRecoveryHtml() {
  return `
  <div class="lock-screen">
    <div class="lock-logo">🔑</div>
    <h1 class="lock-title">重设密码</h1>
    <p class="lock-sub">输入设置密码时保存的 8 位恢复码</p>
    <input id="lock-code" class="lock-input" autocomplete="off" maxlength="12" placeholder="8 位恢复码（可含横线）">
    <input id="lock-pin" class="lock-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="新密码（4–6 位数字）">
    <input id="lock-pin2" class="lock-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="再输一次确认">
    <button class="btn primary lock-btn" data-act="lock-recover">重设密码</button>
    <button class="lock-link" data-act="lock-back">返回登录</button>
  </div>`;
}

export function authCodeHtml(code) {
  return `
  <div class="lock-screen">
    <div class="lock-logo">📝</div>
    <h1 class="lock-title">恢复码</h1>
    <p class="lock-sub">请抄写并妥善保存，忘记密码时用它重设。<br>此码只显示这一次。</p>
    <div class="lock-code">${esc(formatRecoveryCode(code))}</div>
    <button class="btn primary lock-btn" data-act="lock-code-done">我已抄写，开始使用</button>
  </div>`;
}
