import { getState } from '../state.js';
import { esc } from '../util.js';

export function viewManage() {
  const state = getState();
  let h = `
  <div class="topbar">
    <button class="icon-btn" data-act="go" data-page="me">‹</button>
    <h1>任务与分类管理</h1>
    <button class="icon-btn" data-act="cat-add">＋</button>
  </div>
  <div class="page">
    <div class="hint">大分类可新增 / 编辑 / 删除；每个分类下可分别管理「奖励」和「惩罚」任务。</div>`;

  state.categories.forEach(cat => {
    h += `<div class="card cat-card">
      <div class="cat-head">
        <div class="cat-name">${esc(cat.name)}</div>
        <button class="mini" data-act="cat-edit" data-id="${cat.id}">编辑</button>
        <button class="mini danger" data-act="cat-del" data-id="${cat.id}">删除</button>
      </div>

      <div class="sub-title">奖励任务 · ${cat.rewards.length}</div>
      ${cat.rewards.map(t => mRow(cat.id, 'reward', t)).join('') || '<div class="empty">暂无</div>'}
      <button class="add-line" data-act="task-add" data-cat="${cat.id}" data-kind="reward">＋ 添加奖励任务</button>

      <div class="sub-title">惩罚任务 · ${cat.penalties.length}</div>
      ${cat.penalties.map(t => mRow(cat.id, 'penalty', t)).join('') || '<div class="empty">暂无</div>'}
      <button class="add-line" data-act="task-add" data-cat="${cat.id}" data-kind="penalty">＋ 添加惩罚任务</button>
    </div>`;
  });

  h += `<button class="big-btn" data-act="cat-add">＋ 新建大分类</button></div>`;
  return h;
}

function mRow(catId, kind, t) {
  const sign = kind === 'penalty' ? '-' : '+';
  const p = t.mode === 'level'
    ? `分档 ${t.levels.map(l => l.points).join('/')}`
    : sign + t.points;
  return `<div class="m-row">
    <div class="m-name">${esc(t.name)}</div>
    <div class="m-pts ${kind === 'penalty' ? 'minus' : 'plus'}">${p}</div>
    <button class="mini" data-act="task-edit" data-cat="${catId}" data-kind="${kind}" data-id="${t.id}">编辑</button>
    <button class="mini danger" data-act="task-del" data-cat="${catId}" data-kind="${kind}" data-id="${t.id}">删</button>
  </div>`;
}
