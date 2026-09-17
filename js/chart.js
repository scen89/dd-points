import { esc } from './util.js';

export function dualBarChartSVG(items, opts = {}) {
  const {
    width = 340, height = 170, gap = 2,
    rewardColor = '#FF8A3D', penaltyColor = '#E5484D', zeroColor = '#E3E5E9'
  } = opts;
  if (!items.length) return '';

  const labelH = 18;
  const plotH = height - labelH;
  const base = plotH / 2;
  const maxAbs = Math.max(1, ...items.map(d => Math.max(d.reward || 0, d.penalty || 0)));
  const scale = (base - 8) / maxAbs;
  const slot = width / items.length;
  const bw = Math.max(1.5, Math.min(24, (slot - gap) / 2));
  const labelEvery = items.length <= 10 ? 1 : 5;

  let bars = '';
  items.forEach((d, i) => {
    const xL = i * slot + (slot - (2 * bw + gap)) / 2;
    const xR = xL + bw + gap;
    const rw = d.reward || 0;
    const pn = d.penalty || 0;
    if (rw > 0) {
      const h = Math.max(0.5, rw * scale);
      bars += `<rect x="${xL.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${rewardColor}"/>`;
    }
    if (pn > 0) {
      const h = Math.max(0.5, pn * scale);
      bars += `<rect x="${xR.toFixed(1)}" y="${base.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${penaltyColor}"/>`;
    }
    if (i % labelEvery === 0 || i === items.length - 1) {
      const lx = Math.min(width - 12, Math.max(12, i * slot + slot / 2));
      bars += `<text x="${lx.toFixed(1)}" y="${height - 4}" font-size="9" fill="#9AA0A6" text-anchor="middle">${esc(d.label)}</text>`;
    }
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="每日奖励与惩罚">` +
    `<line x1="0" y1="${base}" x2="${width}" y2="${base}" stroke="${zeroColor}" stroke-width="1"/>` +
    bars +
    `</svg>`;
}
