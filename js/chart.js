import { esc } from './util.js';

export function barChartSVG(items, opts = {}) {
  const {
    width = 340, height = 170, gap = 2,
    posColor = '#FF8A3D', negColor = '#E5484D', zeroColor = '#E3E5E9'
  } = opts;
  if (!items.length) return '';

  const labelH = 18;
  const plotH = height - labelH;
  const maxAbs = Math.max(1, ...items.map(d => Math.abs(d.value)));
  const base = plotH / 2;
  const scale = (base - 8) / maxAbs;
  const bw = (width - gap * (items.length - 1)) / items.length;
  const labelEvery = items.length <= 10 ? 1 : 5;

  let bars = '';
  items.forEach((d, i) => {
    const x = i * (bw + gap);
    const h = Math.abs(d.value) * scale;
    if (h > 0) {
      const hh = Math.max(0.5, h);
      const y = d.value > 0 ? base - hh : base;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${hh.toFixed(1)}" rx="2" fill="${d.value > 0 ? posColor : negColor}"/>`;
    }
    if (i % labelEvery === 0 || i === items.length - 1) {
      const lx = Math.min(width - 12, Math.max(12, x + bw / 2));
      bars += `<text x="${lx.toFixed(1)}" y="${height - 4}" font-size="9" fill="#9AA0A6" text-anchor="middle">${esc(d.label)}</text>`;
    }
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="每日净得分">` +
    `<line x1="0" y1="${base}" x2="${width}" y2="${base}" stroke="${zeroColor}" stroke-width="1"/>` +
    bars +
    `</svg>`;
}
