import { getState } from '../state.js';
import { esc } from '../util.js';

export function viewManageGoods() {
  const state = getState();
  let h = `
  <div class="topbar">
    <button class="icon-btn" data-act="go" data-page="me">‹</button>
    <h1>商城商品管理</h1>
    <button class="icon-btn" data-act="goods-add">＋</button>
  </div>
  <div class="page">
    <div class="hint">孩子用积分兑换的商品，可随时调整所需分值。</div>
    <div class="card" style="padding:6px 14px">`;

  state.goods.forEach(g => {
    h += `<div class="m-row">
      <div class="m-name">${g.emoji || '🎁'} ${esc(g.name)}</div>
      <div class="m-pts plus">${g.points} 分</div>
      <button class="mini" data-act="goods-edit" data-id="${g.id}">编辑</button>
      <button class="mini danger" data-act="goods-del" data-id="${g.id}">删</button>
    </div>`;
  });

  if (!state.goods.length) h += `<div class="empty">还没有商品</div>`;
  h += `</div><button class="big-btn" data-act="goods-add">＋ 新增商品</button></div>`;
  return h;
}
