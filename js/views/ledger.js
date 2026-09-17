import { getState, balance, groupByDate, fmtDate, chartSeries, taskSplit } from '../state.js';
import { dualBarChartSVG } from '../chart.js';
import { esc, fmtPts } from '../util.js';

export function viewLedger(route) {
  const state = getState();
  const days = route.chartDays || 7;
  const { dates, byDate } = groupByDate(state.ledger);
  const series = chartSeries(state.ledger, days);
  const rewardSum = series.reduce((s, d) => s + d.reward, 0);
  const penaltySum = series.reduce((s, d) => s + d.penalty, 0);
  const splitTotal = rewardSum + penaltySum;
  const rewardPct = splitTotal > 0 ? Math.round(rewardSum / splitTotal * 100) : 0;
  const penaltyPct = splitTotal > 0 ? 100 - rewardPct : 0;

  let h = `
  <div class="topbar"><h1>积分明细</h1></div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">当前余额</div>
      <div class="bal-num">${fmtPts(balance(state.ledger)).toLocaleString()}<span>分</span></div>
    </div>

    <div class="chart-card">
      <div class="chart-head">
        <span class="ct">每日奖惩</span>
        <div class="seg chart-seg">
          <button class="${days === 7 ? 'on' : ''}" data-act="chart-days" data-v="7">7天</button>
          <button class="${days === 30 ? 'on' : ''}" data-act="chart-days" data-v="30">30天</button>
        </div>
      </div>
      ${dualBarChartSVG(series)}
      <div class="chart-legend">
        <span><i class="lg-dot reward"></i>奖励</span>
        <span><i class="lg-dot penalty"></i>惩罚</span>
        <span class="lg-note">仅统计打卡，不含兑换</span>
      </div>
      <div class="chart-sum">近${days}天：奖励 ${fmtPts(rewardSum)} 分（${rewardPct}%）· 惩罚 ${fmtPts(penaltySum)} 分（${penaltyPct}%）</div>
    </div>`;

  if (!dates.length) {
    h += `<div class="empty big">还没有记录，去打卡吧～</div>`;
  }

  dates.forEach(d => {
    const recs = byDate[d];
    const { reward, penalty } = taskSplit(recs);
    const dayNet = reward - penalty;
    h += `<div class="day-group">
      <div class="day-head">
        <span>${fmtDate(d)}</span>
        <span class="day-split">奖励 <b class="plus">${reward > 0 ? '+' + fmtPts(reward) : '0'}</b> · 惩罚 <b class="minus">${penalty > 0 ? '-' + fmtPts(penalty) : '0'}</b> · 任务净 <b class="${dayNet > 0 ? 'plus' : dayNet < 0 ? 'minus' : ''}">${dayNet > 0 ? '+' : ''}${fmtPts(dayNet)}</b></span>
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
