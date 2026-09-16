import { getState, balance } from '../state.js';
import { esc, fmtPts } from '../util.js';

export function viewShop() {
  const state = getState();
  const bal = balance(state.ledger);
  let h = `
  <div class="topbar">
    <h1>积分商城</h1>
    <button class="icon-btn" data-act="go" data-page="manageGoods" title="商品管理">⚙️</button>
  </div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">可用积分</div>
      <div class="bal-num">${bal.toLocaleString()}<span>分</span></div>
    </div>
    <div class="grid">`;

  state.goods.forEach(g => {
    const ok = bal >= g.points;
    h += `<div class="good ${ok ? '' : 'dis'}">
      <div class="g-emoji">${esc(g.emoji) || '🎁'}</div>
      <div class="g-name">${esc(g.name)}</div>
      <div class="g-pts">${fmtPts(g.points)} 分</div>
      ${ok
        ? `<button class="btn primary sm" data-act="exchange" data-id="${g.id}">兑换</button>`
        : `<button class="btn ghost sm" disabled>还差 ${fmtPts(g.points - bal)}</button>`}
    </div>`;
  });

  if (!state.goods.length) {
    h += `<div class="empty big" style="grid-column:1/-1">还没有商品，去「⚙️」添加</div>`;
  }
  h += `</div></div>`;
  return h;
}
