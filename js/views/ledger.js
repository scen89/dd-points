import { getState, balance, groupByDate, fmtDate, chartSeries, sumNet } from '../state.js';
import { barChartSVG } from '../chart.js';
import { esc, fmtPts } from '../util.js';

export function viewLedger(route) {
  const state = getState();
  const days = route.chartDays || 7;
  const { dates, byDate } = groupByDate(state.ledger);

  let h = `
  <div class="topbar"><h1>积分明细</h1></div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">当前余额</div>
      <div class="bal-num">${balance(state.ledger).toLocaleString()}<span>分</span></div>
    </div>

    <div class="chart-card">
      <div class="chart-head">
        <span class="ct">每日净得分</span>
        <div class="seg chart-seg">
          <button class="${days === 7 ? 'on' : ''}" data-act="chart-days" data-v="7">7天</button>
          <button class="${days === 30 ? 'on' : ''}" data-act="chart-days" data-v="30">30天</button>
        </div>
      </div>
      ${barChartSVG(chartSeries(state.ledger, days))}
    </div>`;

  if (!dates.length) {
    h += `<div class="empty big">还没有记录，去打卡吧～</div>`;
  }

  dates.forEach(d => {
    const recs = byDate[d];
    const sum = sumNet(recs);
    h += `<div class="day-group">
      <div class="day-head">
        <span>${fmtDate(d)}</span>
        <b class="${sum >= 0 ? 'plus' : 'minus'}">${sum > 0 ? '+' : ''}${fmtPts(sum)}</b>
      </div>
      <div class="card">`;
    recs.forEach(r => {
      const isIn = r.type === 'in';
      h += `<div class="led-row">
        <div class="led-title">${isIn ? '➕' : '➖'} ${esc(r.title)}
          ${r.category ? `<span style="color:#9AA0A6;font-size:12px"> · ${esc(r.category)}</span>` : ''}
        </div>
        <div class="led-pts ${isIn ? 'plus' : 'minus'}">${isIn ? '+' : '-'}${fmtPts(r.points)}</div>
      </div>`;
    });
    h += `</div></div>`;
  });

  h += `</div>`;
  return h;
}
