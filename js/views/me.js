import { getState, balance, totals } from '../state.js';
import { fmtPts } from '../util.js';

export function viewMe() {
  const state = getState();
  const bal = balance(state.ledger);
  const { income, spend, checkinDays } = totals(state.ledger);
  const tasks = state.categories.reduce((s, c) => s + c.rewards.length + c.penalties.length, 0);

  return `
  <div class="topbar"><h1>我的</h1></div>
  <div class="page">
    <div class="bal-card small">
      <div class="bal-label">当前余额</div>
      <div class="bal-num">${fmtPts(bal).toLocaleString()}<span>分</span></div>
    </div>

    <div class="stat-grid">
      <div class="stat"><b class="plus">${fmtPts(income).toLocaleString()}</b><span>累计获得</span></div>
      <div class="stat"><b class="minus">${fmtPts(spend).toLocaleString()}</b><span>累计消耗</span></div>
      <div class="stat"><b>${checkinDays}</b><span>打卡天数</span></div>
    </div>

    <div class="menu">
      <div class="menu-row" data-act="go" data-page="manage">
        <span class="mi">📚</span><span class="mt">任务与分类管理</span><span class="ma">${tasks} 个任务 ›</span>
      </div>
      <div class="menu-row" data-act="go" data-page="manageGoods">
        <span class="mi">🎁</span><span class="mt">商城商品管理</span><span class="ma">${state.goods.length} 件 ›</span>
      </div>
      <div class="menu-row" data-act="export">
        <span class="mi">📤</span><span class="mt">导出数据备份</span><span class="ma">›</span>
      </div>
      <div class="menu-row" data-act="import">
        <span class="mi">📥</span><span class="mt">导入备份恢复</span><span class="ma">›</span>
      </div>
      <div class="menu-row" data-act="reset">
        <span class="mi">🔄</span><span class="mt">清空所有记录</span><span class="ma">›</span>
      </div>
    </div>
    <div class="hint" style="text-align:center;padding-top:18px">
      数据保存在本机浏览器中，共 ${state.ledger.length} 条流水记录<br>
      建议定期「导出数据备份」保存到手机文件<br>
      安装：Chrome 菜单 → 安装应用 / 添加到主屏幕
    </div>
  </div>`;
}
