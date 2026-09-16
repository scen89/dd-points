import { getState, weekDates, ds, todayStr, balance, netSum } from '../state.js';
import { esc } from '../util.js';

export function viewCheck(route) {
  const state = getState();
  const dates = weekDates(route.weekOffset);
  const d = route.date;
  const kind = route.seg;
  const bal = balance(state.ledger);
  const doneMap = {};
  state.ledger.forEach(r => {
    if (r.date === d && r.source === 'task') doneMap[r.taskId] = r;
  });

  const todaySum = netSum(state.ledger, [todayStr()]);
  const weekSum = netSum(state.ledger, weekDates(0).map(ds));

  let h = `
  <div class="topbar">
    <h1>👦 蹬蹬</h1>
    <button class="icon-btn" data-act="go" data-page="manage" title="任务管理">⚙️</button>
  </div>
  <div class="page">
    <div class="bal-card">
      <div class="bal-label">当前积分余额</div>
      <div class="bal-num">${bal.toLocaleString()}<span>分</span></div>
      <div class="bal-sub">今日 <b>${todaySum >= 0 ? '+' : ''}${todaySum}</b> · 本周 <b>${weekSum >= 0 ? '+' : ''}${weekSum}</b></div>
    </div>

    <div class="week">
      <button class="wk-nav" data-act="wk" data-d="-1">‹</button>
      <div class="wk-days">
        ${dates.map(dt => {
          const s = ds(dt);
          const has = state.ledger.some(r => r.date === s);
          return `<button class="wk-day ${s === d ? 'on' : ''}" data-act="day" data-d="${s}">
            <span class="wd">${'一二三四五六日'[(dt.getDay() + 6) % 7]}</span>
            <span class="dd">${dt.getDate()}</span>
            <i class="dot ${has ? 'on' : ''}"></i>
          </button>`;
        }).join('')}
      </div>
      <button class="wk-nav" data-act="wk" data-d="1">›</button>
    </div>

    <div class="seg">
      <button class="${kind === 'reward' ? 'on' : ''}" data-act="seg" data-v="reward">奖励</button>
      <button class="${kind === 'penalty' ? 'on' : ''}" data-act="seg" data-v="penalty">惩罚</button>
    </div>
  `;

  state.categories.forEach(cat => {
    const list = kind === 'reward' ? cat.rewards : cat.penalties;
    if (!list.length) return;

    const catSum = list.reduce((s, t) => {
      const r = doneMap[t.id];
      return s + (r ? (r.type === 'in' ? r.points : -r.points) : 0);
    }, 0);

    h += `<div class="card">
      <div class="cat-title ${kind === 'penalty' ? 'pen' : ''}">
        <i class="bar"></i>
        <span class="nm">${esc(cat.name)}</span>
        ${catSum !== 0 ? `<span class="sm ${catSum > 0 ? 'plus' : 'minus'}">${catSum > 0 ? '+' : ''}${catSum}</span>` : ''}
      </div>`;

    list.forEach(t => {
      const rec = doneMap[t.id];
      const done = !!rec;
      const sign = kind === 'penalty' ? '-' : '+';
      const ptsTxt = t.mode === 'level'
        ? sign + (t.levels[0] ? t.levels[0].points : 0) + '起'
        : sign + t.points;
      const sub = t.mode === 'level'
        ? `<i>${t.levels.map(l => esc(l.label) + ' ' + l.points + '分').join(' / ')}</i>`
        : '';
      h += `<div class="task ${done ? 'done' : ''}" data-act="task"
              data-cat="${cat.id}" data-kind="${kind}" data-id="${t.id}">
        <div class="tname">${esc(t.name)}${sub}</div>
        <div class="tpts ${kind === 'penalty' ? 'minus' : 'plus'}">${ptsTxt}</div>
        <div class="tbtn ${kind === 'penalty' ? 'pen' : ''}">${done ? '✓' : '＋'}</div>
      </div>`;
    });
    h += `</div>`;
  });

  if (!state.categories.length) {
    h += `<div class="empty big">还没有分类，去「⚙️ 任务管理」新建一个吧</div>`;
  }

  h += `</div>`;
  return h;
}
