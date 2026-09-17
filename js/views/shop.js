import { getState, balance, fmtDate } from '../state.js';
import { esc, fmtPts } from '../util.js';

export function viewShop() {
  const state = getState();
  const bal = balance(state.ledger);
  let h = `
  <div class="topbar">
    <h1>积分商城</h1>
    <button class="icon-btn" data-act="exchange-log" title="兑换记录">📋</button>
    <button class="icon-btn" data-act="go" data-page="manageGoods" title="商品管理">⚙️</button>
  </div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">可用积分</div>
      <div class="bal-num">${fmtPts(bal).toLocaleString()}<span>分</span></div>
    </div>
    <div class="grid">`;

  state.goods.forEach(g => {
    const ok = fmtPts(bal) >= fmtPts(g.points);
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

export function exchangeLogHtml(state) {
  const recs = state.ledger
    .filter(r => r.source === 'exchange')
    .slice()
    .sort((a, b) => b.ts - a.ts);
  const totalCount = recs.reduce((s, r) => s + (r.count || 1), 0);
  const totalSpend = recs.reduce((s, r) => s + r.points, 0);
  let rows = '';
  recs.forEach(r => {
    rows += `<div class="led-row">
      <div class="led-title">${esc(r.title)}<span style="color:#9AA0A6;font-size:12px"> · ${fmtDate(r.date)}</span></div>
      <div class="led-pts minus">-${fmtPts(r.points)}</div>
    </div>`;
  });
  return `
    <div class="sheet-head">兑换记录</div>
    <div class="log-sum">共兑换 ${totalCount} 次 · 累计消耗 ${fmtPts(totalSpend)} 分</div>
    <div class="card" style="margin-bottom:0">${rows || '<div class="empty">还没有兑换记录</div>'}</div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">关闭</button>
    </div>
  `;
}
