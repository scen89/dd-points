import {
  init, getState, recordTask, undoRecord, latestTaskRecord, exchange, balance,
  addCategory, renameCategory, removeCategory,
  addTask, updateTask, removeTask,
  addGoods, updateGoods, removeGoods,
  clearLedger, exportJson, importJson,
  todayStr, ds, weekDates
} from './state.js';
import { esc, toast, vibrate, download, fmtPts } from './util.js';
import { viewCheck } from './views/check.js';
import { viewShop, exchangeLogHtml } from './views/shop.js';
import { viewLedger } from './views/ledger.js';
import { viewMe } from './views/me.js';
import { viewManage } from './views/manage.js';
import { viewManageGoods } from './views/manage-goods.js';

const route = { name: 'check', date: todayStr(), weekOffset: 0, seg: 'reward', chartDays: 7 };
let lastToday = todayStr();

function render() {
  const t = todayStr();
  if (t !== lastToday) {
    if (route.date === lastToday) route.date = t;
    lastToday = t;
  }
  const views = {
    check: viewCheck, shop: viewShop, ledger: viewLedger,
    me: viewMe, manage: viewManage, manageGoods: viewManageGoods
  };
  document.getElementById('page').innerHTML = views[route.name](route);
  renderTab();
}

function renderTab() {
  const tabs = [['check', '🏠', '打卡'], ['shop', '🎁', '商城'], ['ledger', '📋', '明细'], ['me', '👤', '我的']];
  const el = document.getElementById('tabbar');
  const show = ['check', 'shop', 'ledger', 'me'].includes(route.name);
  if (!show) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = tabs.map(([k, i, n]) =>
    `<button class="tab ${route.name === k ? 'on' : ''}" data-act="go" data-page="${k}">
      <span>${i}</span>${n}
    </button>`).join('');
}

/* ---------- 弹窗 ---------- */

function openModal(html) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="mask" data-act="close"></div><div class="sheet">${html}</div>`;
  m.classList.add('show');
}

function setSheet(html) {
  const m = document.getElementById('modal');
  const sheet = m.querySelector('.sheet');
  if (!sheet) { openModal(html); return; }
  sheet.innerHTML = html;
}

function exchangeSheet(g, qty) {
  const bal = balance(getState().ledger);
  const maxQty = Math.max(1, Math.floor((bal + 1e-9) / g.points));
  const q = Math.min(Math.max(1, qty), maxQty);
  const total = fmtPts(g.points * q);
  setSheet(`
    <div class="sheet-head">兑换确认</div>
    <div class="confirm-body" style="padding-top:4px">
      ${esc(g.emoji) || '🎁'} ${esc(g.name)}<br>
      <span style="font-size:13px;color:#9AA0A6">单价 ${fmtPts(g.points)} 分 · 最多可兑 ${maxQty} 个</span>
    </div>
    <div class="qty-row">
      <button class="qty-btn" data-act="ex-qty" data-id="${g.id}" data-d="-1" ${q <= 1 ? 'disabled' : ''}>−</button>
      <span class="qty-num">${q}</span>
      <button class="qty-btn" data-act="ex-qty" data-id="${g.id}" data-d="1" ${q >= maxQty ? 'disabled' : ''}>＋</button>
    </div>
    <div class="qty-sum">合计 <b>${total}</b> 分 · 兑换后余额 <b>${fmtPts(bal - total)}</b> 分</div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn primary" data-act="ex-ok" data-id="${g.id}" data-qty="${q}">确认兑换</button>
    </div>
  `);
}

function closeModal() {
  const m = document.getElementById('modal');
  m.classList.remove('show');
  m.innerHTML = '';
}

function confirmModal(title, bodyHtml, onConfirm, opts = {}) {
  openModal(`
    <div class="sheet-head">${esc(title)}</div>
    <div class="confirm-body">${bodyHtml}</div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn ${opts.danger ? 'danger' : 'primary'}" id="cfm-ok">${esc(opts.okText || '确定')}</button>
    </div>
  `);
  document.getElementById('cfm-ok').addEventListener('click', function () {
    closeModal();
    onConfirm();
  });
}

/* ---------- 表单 ---------- */

function formCat(id) {
  const state = getState();
  const c = id ? state.categories.find(x => x.id === id) : null;
  openModal(`
    <div class="sheet-head">${c ? '编辑' : '新建'}大分类</div>
    <div class="form">
      <label>分类名称</label>
      <input id="f-cat" value="${c ? esc(c.name) : ''}" placeholder="例如：生活习惯">
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn primary" data-act="cat-save" data-id="${id || ''}">保存</button>
    </div>
  `);
  setTimeout(() => { const i = document.getElementById('f-cat'); if (i) i.focus(); }, 260);
}

function formTask(catId, kind, taskId) {
  const state = getState();
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;
  const list = kind === 'penalty' ? cat.penalties : cat.rewards;
  const t = taskId ? list.find(x => x.id === taskId) : null;
  const isLevel = !!(t && t.mode === 'level');
  const isRepeat = !!(t && t.repeat === true);
  const lv = isLevel ? t.levels.map(l => `${esc(l.label)},${l.points}`).join('\n') : '';
  const kindName = kind === 'penalty' ? '惩罚' : '奖励';

  openModal(`
    <div class="sheet-head">${t ? '编辑' : '新建'}${kindName}任务</div>
    <div class="form">
      <label>任务名称</label>
      <input id="f-name" value="${t ? esc(t.name) : ''}" placeholder="例如：主动洗漱">

      <label>分值（填正数${kind === 'penalty' ? '，系统自动按扣分计算' : ''}）</label>
      <input id="f-pts" type="number" inputmode="decimal" value="${t ? t.points : ''}" placeholder="例如：2">

      <label class="ck">
        <input type="checkbox" id="f-level" data-act="toggle-level" ${isLevel ? 'checked' : ''}>
        分档任务（如午睡、单元测试）
      </label>

      <label class="ck">
        <input type="checkbox" id="f-repeat" ${isRepeat ? 'checked' : ''}>
        可重复（一天可多次加/减分）
      </label>

      <div id="f-level-box" style="display:${isLevel ? 'block' : 'none'}">
        <label>档位设置（每行一个：档位名,分值）</label>
        <textarea id="f-levels" rows="4"
          placeholder="1小时,3&#10;0.5-1小时,2&#10;0-0.5小时,1">${lv}</textarea>
      </div>
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn primary" data-act="task-save"
        data-cat="${catId}" data-kind="${kind}" data-id="${taskId || ''}">保存</button>
    </div>
  `);
  if (!t) setTimeout(() => { const i = document.getElementById('f-name'); if (i) i.focus(); }, 260);
}

function levelPicker(catId, kind, taskId) {
  const state = getState();
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;
  const list = kind === 'penalty' ? cat.penalties : cat.rewards;
  const t = list.find(x => x.id === taskId);
  if (!t) return;
  const sign = kind === 'penalty' ? '-' : '+';

  openModal(`
    <div class="sheet-head">选择档位 · ${esc(t.name)}</div>
    <div class="level-list">
      ${t.levels.map((l, i) => `
        <button class="level-item" data-act="level-pick"
          data-cat="${catId}" data-kind="${kind}" data-id="${taskId}" data-idx="${i}">
          <span>${esc(l.label)}</span>
          <b>${sign}${fmtPts(l.points)} 分</b>
        </button>`).join('')}
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
    </div>
  `);
}

function formGoods(id) {
  const state = getState();
  const g = id ? state.goods.find(x => x.id === id) : null;
  openModal(`
    <div class="sheet-head">${g ? '编辑' : '新增'}商品</div>
    <div class="form">
      <label>商品名称</label>
      <input id="f-gname" value="${g ? esc(g.name) : ''}" placeholder="例如：游乐场">
      <label>所需积分</label>
      <input id="f-gpts" type="number" inputmode="decimal" value="${g ? g.points : ''}" placeholder="例如：100">
      <label>图标 Emoji（可选）</label>
      <input id="f-gemoji" value="${g ? esc(g.emoji || '') : ''}" placeholder="🎁">
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close">取消</button>
      <button class="btn primary" data-act="goods-save" data-id="${id || ''}">保存</button>
    </div>
  `);
}

/* ---------- 业务 ---------- */

function doRecord(catId, kind, taskId, levelIdx) {
  const res = recordTask(catId, kind, taskId, route.date, levelIdx);
  if (!res.ok) { toast(res.error); render(); return; }
  render();
  if (res.entry.type === 'out') {
    toast('已扣 ' + res.entry.points + ' 分');
    vibrate([40, 30, 40]);
  } else {
    toast('+' + res.entry.points + ' 分');
    vibrate(20);
  }
  if (res.saved === false) setTimeout(() => toast('注意：本机保存失败'), 1700);
}

function startImport() {
  const input = document.getElementById('import-file');
  input.value = '';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '').replace(/^\uFEFF/, '');
      confirmModal(
        '导入备份',
        '导入会覆盖当前所有分类、商品和流水记录，确定继续？',
        function () {
          const res = importJson(text);
          if (!res.ok) { toast('导入失败：' + res.error); return; }
          render();
          toast('导入成功');
        },
        { danger: true, okText: '确认导入' }
      );
    };
    reader.onerror = () => toast('读取文件失败');
    reader.readAsText(file);
  };
  input.click();
}

/* ---------- 事件委托 ---------- */

document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'go') {
    route.name = el.dataset.page;
    closeModal();
    render();
    window.scrollTo(0, 0);
    return;
  }

  if (act === 'wk') {
    route.weekOffset += parseInt(el.dataset.d, 10);
    const wd = weekDates(route.weekOffset);
    const t = todayStr();
    route.date = wd.some(x => ds(x) === t) ? t : ds(wd[0]);
    render();
    return;
  }
  if (act === 'day') {
    route.date = el.dataset.d;
    render();
    return;
  }
  if (act === 'seg') {
    route.seg = el.dataset.v;
    render();
    return;
  }
  if (act === 'chart-days') {
    route.chartDays = Number(el.dataset.v) || 7;
    render();
    return;
  }

  if (act === 'task-undo') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const state = getState();
    const c = state.categories.find(x => x.id === catId);
    if (!c) return;
    const list = kind === 'penalty' ? c.penalties : c.rewards;
    const t = list.find(x => x.id === id);
    if (!t) return;
    const rec = latestTaskRecord(state.ledger, id, route.date);
    if (!rec) { toast('没有可撤销的记录'); return; }
    const isIn = rec.type === 'in';
    confirmModal(
      '撤销最近一次',
      `撤销「${esc(t.name)}」最近一次记录？<br>撤销后余额 <b style="color:${isIn ? '#FF8A3D' : '#E5484D'};font-size:17px">${isIn ? '-' : '+'}${fmtPts(rec.points)} 分</b>`,
      function () {
        const res = undoRecord(rec.id);
        if (!res.ok) { toast(res.error || '撤销失败'); render(); return; }
        render();
        toast(res.saved === false ? '已撤销，但本机保存失败' : '已撤销');
      },
      { danger: true, okText: '确认撤销' }
    );
    return;
  }

  if (act === 'task') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const state = getState();
    const c = state.categories.find(x => x.id === catId);
    if (!c) return;
    const list = kind === 'penalty' ? c.penalties : c.rewards;
    const t = list.find(x => x.id === id);
    if (!t) return;

    const rec = t.repeat === true
      ? null
      : state.ledger.find(r => r.source === 'task' && r.date === route.date && r.taskId === id);

    if (rec) {
      const isIn = rec.type === 'in';
      confirmModal(
        '撤销记录',
        `确定撤销「${esc(t.name)}」？<br>撤销后余额 <b style="color:${isIn ? '#FF8A3D' : '#E5484D'};font-size:17px">${isIn ? '-' : '+'}${fmtPts(rec.points)} 分</b>`,
        function () {
          const res = undoRecord(rec.id);
          if (!res.ok) { toast(res.error || '撤销失败'); render(); return; }
          render();
          toast(res.saved === false ? '已撤销，但本机保存失败' : '已撤销');
        },
        { danger: true, okText: '确认撤销' }
      );
      return;
    }

    if (t.mode === 'level') {
      if (kind === 'penalty') {
        confirmModal(
          '家长确认',
          `确认记一次「${esc(t.name)}」？<br><span style="font-size:13px;color:#9AA0A6">请家长确认后选择扣分档位</span>`,
          function () { levelPicker(catId, kind, id); },
          { danger: true, okText: '继续选择档位' }
        );
      } else {
        levelPicker(catId, kind, id);
      }
      return;
    }

    if (kind === 'penalty') {
      confirmModal(
        '家长确认',
        `确认记一次「${esc(t.name)}」？<br>将扣除 <b style="color:#E5484D;font-size:20px">${fmtPts(t.points)}</b> 分`,
        function () { doRecord(catId, kind, id, null); },
        { danger: true, okText: '确认扣 ' + fmtPts(t.points) + ' 分' }
      );
      return;
    }

    doRecord(catId, kind, id, null);
    return;
  }

  if (act === 'level-pick') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const idx = parseInt(el.dataset.idx, 10);
    closeModal();
    doRecord(catId, kind, id, idx);
    return;
  }

  /* ---------- 分类管理 ---------- */
  if (act === 'cat-add') { formCat(null); return; }
  if (act === 'cat-edit') { formCat(el.dataset.id); return; }
  if (act === 'cat-del') {
    const c = getState().categories.find(x => x.id === el.dataset.id);
    if (!c) return;
    const n = c.rewards.length + c.penalties.length;
    confirmModal(
      '删除分类',
      `确定删除分类「${esc(c.name)}」？<br>
       <span style="font-size:13px;color:#9AA0A6">该分类下 ${n} 个任务会一并删除<br>历史流水不受影响</span>`,
      function () {
        const res = removeCategory(c.id);
        if (!res.ok) { toast(res.error); return; }
        render();
        toast(res.saved === false ? '已删除，但本机保存失败' : '已删除');
      },
      { danger: true, okText: '确认删除' }
    );
    return;
  }
  if (act === 'cat-save') {
    const id = el.dataset.id;
    const name = document.getElementById('f-cat').value.trim();
    if (!name) return toast('请输入分类名称');
    const res = id ? renameCategory(id, name) : addCategory(name);
    if (!res.ok) return toast(res.error);
    closeModal();
    render();
    toast(res.saved === false ? '已保存，但本机保存失败' : '已保存');
    return;
  }

  /* ---------- 任务管理 ---------- */
  if (act === 'task-add') { formTask(el.dataset.cat, el.dataset.kind, null); return; }
  if (act === 'task-edit') { formTask(el.dataset.cat, el.dataset.kind, el.dataset.id); return; }
  if (act === 'task-del') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const c = getState().categories.find(x => x.id === catId);
    if (!c) return;
    const list = kind === 'penalty' ? c.penalties : c.rewards;
    const t = list.find(x => x.id === id);
    if (!t) return;
    confirmModal(
      '删除任务',
      `确定删除任务「${esc(t.name)}」？`,
      function () {
        const res = removeTask(catId, kind, id);
        if (!res.ok) { toast(res.error); return; }
        render();
        toast(res.saved === false ? '已删除，但本机保存失败' : '已删除');
      },
      { danger: true, okText: '确认删除' }
    );
    return;
  }
  if (act === 'task-save') {
    const catId = el.dataset.cat;
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    const name = document.getElementById('f-name').value.trim();
    if (!name) return toast('请输入任务名称');

    const isLevel = document.getElementById('f-level').checked;
    const repeat = document.getElementById('f-repeat').checked;
    let levels = [];
    let pts = Math.abs(parseFloat(document.getElementById('f-pts').value) || 0);

    if (isLevel) {
      levels = document.getElementById('f-levels').value.split('\n')
        .map(l => l.trim()).filter(Boolean)
        .map(l => {
          const parts = l.split(/[,，]/);
          return { label: (parts[0] || '').trim(), points: Math.abs(parseFloat(parts[1]) || 0) };
        })
        .filter(l => l.label && l.points > 0);
      if (!levels.length) return toast('请至少填写一个有效档位');
      pts = Math.max(...levels.map(l => l.points));
    } else {
      if (!pts) return toast('请输入分值');
    }

    const data = { name, mode: isLevel ? 'level' : 'normal', points: pts, levels, repeat };
    const res = id ? updateTask(catId, kind, id, data) : addTask(catId, kind, data);
    if (!res.ok) return toast(res.error);
    closeModal();
    render();
    toast(res.saved === false ? '已保存，但本机保存失败' : '已保存');
    return;
  }

  /* ---------- 商品管理 ---------- */
  if (act === 'goods-add') { formGoods(null); return; }
  if (act === 'goods-edit') { formGoods(el.dataset.id); return; }
  if (act === 'goods-del') {
    const g = getState().goods.find(x => x.id === el.dataset.id);
    if (!g) return;
    confirmModal(
      '删除商品',
      `确定删除商品「${esc(g.name)}」？`,
      function () {
        const res = removeGoods(g.id);
        if (!res.ok) { toast(res.error); return; }
        render();
        toast(res.saved === false ? '已删除，但本机保存失败' : '已删除');
      },
      { danger: true, okText: '确认删除' }
    );
    return;
  }
  if (act === 'goods-save') {
    const id = el.dataset.id;
    const name = document.getElementById('f-gname').value.trim();
    const pts = Math.abs(parseFloat(document.getElementById('f-gpts').value) || 0);
    const emoji = document.getElementById('f-gemoji').value.trim() || '🎁';
    if (!name) return toast('请输入商品名称');
    if (!pts) return toast('请输入所需积分');
    const data = { name, points: pts, emoji };
    const res = id ? updateGoods(id, data) : addGoods(data);
    if (!res.ok) return toast(res.error);
    closeModal();
    render();
    toast(res.saved === false ? '已保存，但本机保存失败' : '已保存');
    return;
  }

  /* ---------- 兑换 ---------- */
  if (act === 'exchange') {
    const g = getState().goods.find(x => x.id === el.dataset.id);
    if (!g) return;
    const bal = balance(getState().ledger);
    if (bal < g.points) return toast('积分不足');
    exchangeSheet(g, 1);
    return;
  }

  if (act === 'exchange-log') {
    openModal(exchangeLogHtml(getState()));
    return;
  }

  if (act === 'ex-qty') {
    const g = getState().goods.find(x => x.id === el.dataset.id);
    if (!g) return;
    const numEl = document.querySelector('.qty-num');
    const cur = numEl ? (parseInt(numEl.textContent, 10) || 1) : 1;
    exchangeSheet(g, cur + (parseInt(el.dataset.d, 10) || 0));
    return;
  }

  if (act === 'ex-ok') {
    const g = getState().goods.find(x => x.id === el.dataset.id);
    if (!g) return;
    const qty = Math.max(1, Math.min(999, parseInt(el.dataset.qty, 10) || 1));
    const res = exchange(g.id, qty);
    if (!res.ok) { toast(res.error); return; }
    closeModal();
    render();
    toast(res.saved === false ? '兑换成功，但本机保存失败' : '兑换成功 🎉');
    return;
  }

  /* ---------- 我的 ---------- */
  if (act === 'export') {
    download('dengdeng-points-' + todayStr() + '.json', exportJson());
    toast('已导出备份');
    return;
  }
  if (act === 'import') { startImport(); return; }
  if (act === 'reset') {
    confirmModal(
      '清空所有记录',
      `确定清空所有打卡与流水记录？<br>
       <span style="font-size:13px;color:#9AA0A6">分类和商品会保留，操作不可恢复</span>`,
      function () {
        const res = clearLedger();
        if (!res.ok) { toast(res.error); return; }
        render();
        toast(res.saved === false ? '已清空，但本机保存失败' : '已清空');
      },
      { danger: true, okText: '确认清空' }
    );
    return;
  }

  /* ---------- 弹窗 ---------- */
  if (act === 'close') { closeModal(); return; }
  if (act === 'toggle-level') {
    const box = document.getElementById('f-level-box');
    if (box) box.style.display = el.checked ? 'block' : 'none';
    return;
  }
});

/* ---------- 启动 ---------- */

init();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
