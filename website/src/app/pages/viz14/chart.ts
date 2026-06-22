import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Pair Definitions ─────────────────────────────────────────────────────────

export interface HexPair {
  xKey: string;
  yKey: string;
  xLabel: string;
  yLabel: string;
  xDomain: [number, number];
  yDomain: [number, number];
  title: string;
}

export const HEX_PAIRS: HexPair[] = [
  {
    xKey: 'energy', yKey: 'loudness',
    xLabel: 'Energy', yLabel: 'Loudness (dB)',
    xDomain: [0, 1], yDomain: [-40, 0],
    title: 'Energy × Loudness density',
  },
  {
    xKey: 'danceability', yKey: 'valence',
    xLabel: 'Danceability', yLabel: 'Valence',
    xDomain: [0, 1], yDomain: [0, 1],
    title: 'Danceability × Valence density',
  },
  {
    xKey: 'acousticness', yKey: 'energy',
    xLabel: 'Acousticness', yLabel: 'Energy',
    xDomain: [0, 1], yDomain: [0, 1],
    title: 'Acousticness × Energy density',
  },
  {
    xKey: 'tempo', yKey: 'danceability',
    xLabel: 'Tempo (BPM)', yLabel: 'Danceability',
    xDomain: [50, 220], yDomain: [0, 1],
    title: 'Tempo × Danceability density',
  },
];

export type HexPairIdx = 0 | 1 | 2 | 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Viz14Chart {
  setPair: (idx: HexPairIdx) => void;
  resize: () => void;
  destroy: () => void;
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz14Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz14Chart {
  let pairIdx: HexPairIdx = 0;

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    const pair = HEX_PAIRS[pairIdx];

    const margin = { top: 56, right: 80, bottom: 64, left: 64 };
    const W = Math.max(520, container.clientWidth  || 800);
    const H = Math.max(460, container.clientHeight || 540);
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top  - margin.bottom;

    const x = d3.scaleLinear().domain(pair.xDomain).range([0, innerW]);
    const y = d3.scaleLinear().domain(pair.yDomain).range([innerH, 0]);

    // Hexbin setup
    const hexRadius = Math.min(innerW, innerH) / 22;

    type HexRow = { 0: number; 1: number; [k: string]: unknown };
    const hexbin = (d3 as unknown as { hexbin: (opts?: { radius: number; extent: [[number, number], [number, number]] }) => { (data: HexRow[]): HexRow[][]; hexagon: (r?: number) => string } }).hexbin
      ? (d3 as unknown as { hexbin: (opts: { radius: number; extent: [[number, number], [number, number]] }) => { (data: HexRow[]): HexRow[][]; hexagon: (r?: number) => string } }).hexbin({
          radius: hexRadius,
          extent: [[0, 0], [innerW, innerH]],
        })
      : null;

    const pts: HexRow[] = rows.map((r) => {
      const xv = Number(r[pair.xKey as keyof TrackRow]);
      const yv = Number(r[pair.yKey as keyof TrackRow]);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) return null;
      if (xv < pair.xDomain[0] || xv > pair.xDomain[1]) return null;
      if (yv < pair.yDomain[0] || yv > pair.yDomain[1]) return null;
      const row: HexRow = { 0: x(xv), 1: y(yv), xv, yv, popularity: Number(r.popularity) };
      return row;
    }).filter((d): d is HexRow => d !== null);

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);

    svg.append('text').attr('class', 'chart-title')
      .attr('x', W / 2).attr('y', 26).attr('text-anchor', 'middle')
      .text(pair.title);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Clip path
    const clipId = `hex-clip-${pairIdx}`;
    svg.append('defs').append('clipPath').attr('id', clipId)
      .append('rect').attr('width', innerW).attr('height', innerH);

    const chartG = g.append('g').attr('clip-path', `url(#${clipId})`);

    if (hexbin) {
      const bins = hexbin(pts);
      const maxCount = d3.max(bins, (b) => b.length) ?? 1;
      const colorScale = d3.scaleSequential().domain([0, maxCount]).interpolator(d3.interpolateYlOrRd);

      chartG.selectAll<SVGPathElement, HexRow[]>('.hexagon')
        .data(bins).join('path').attr('class', 'hexagon')
        .attr('d', hexbin.hexagon())
        .attr('transform', (b) => `translate(${b['x'] ?? b[0]},${b['y'] ?? b[1]})`)
        .attr('fill', (b) => colorScale(b.length))
        .attr('stroke', theme.panel).attr('stroke-width', 0.5)
        .on('mouseover', function (event, b) {
          d3.select(this).attr('opacity', 0.7);
          const fmt2 = d3.format('.2f');
          const fmtN = d3.format(',');
          const avgPop = d3.mean(b, (d: HexRow) => Number(d['popularity'])) ?? 0;
          const xv = x.invert(b[0]);
          const yv = y.invert(b[1]);
          tip.show(event, `
            <div style="font-size:0.84rem;margin-bottom:0.4rem">
              <strong>${pair.xLabel}: ${fmt2(xv)}</strong><br>
              <strong>${pair.yLabel}: ${fmt2(yv)}</strong>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">Tracks</span>
                <span class="tooltip-value">${fmtN(b.length)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">Avg. popularity</span>
                <span class="tooltip-value">${fmt2(avgPop)}</span>
              </div>
            </div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', function () { d3.select(this).attr('opacity', 1); tip.hide(); });

      // Color legend
      const legendH2 = innerH * 0.5;
      const legendW = 12;
      const legG = g.append('g').attr('transform', `translate(${innerW + 18},${(innerH - legendH2) / 2})`);

      const defs2 = svg.select('defs');
      const gradId = `hex-grad-${pairIdx}`;
      const grad = defs2.append('linearGradient').attr('id', gradId)
        .attr('x1', '0%').attr('y1', '100%').attr('x2', '0%').attr('y2', '0%');
      d3.range(0, 1.01, 0.1).forEach((t) => {
        grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', colorScale(t * maxCount));
      });

      legG.append('rect').attr('width', legendW).attr('height', legendH2)
        .attr('fill', `url(#${gradId})`).attr('rx', 2);

      const legScale = d3.scaleLinear().domain([0, maxCount]).range([legendH2, 0]);
      legG.append('g').attr('class', 'axis').attr('transform', `translate(${legendW},0)`)
        .call(d3.axisRight(legScale).ticks(4).tickFormat(d3.format('.0f')));
      legG.append('text').attr('class', 'axis-label')
        .attr('x', legendW / 2).attr('y', -8).attr('text-anchor', 'middle')
        .style('font-size', '9px').text('Tracks');

    } else {
      // Fallback: scatter
      chartG.selectAll<SVGCircleElement, HexRow>('.dot')
        .data(pts.length > 3000 ? pts.filter((_, i) => i % Math.ceil(pts.length / 3000) === 0) : pts)
        .join('circle').attr('class', 'dot')
        .attr('cx', (d) => d[0]).attr('cy', (d) => d[1])
        .attr('r', 2.5).attr('fill', '#4C78A8').attr('opacity', 0.25);
    }

    // Axes
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));
    g.append('text').attr('class', 'axis-label').attr('x', innerW / 2).attr('y', innerH + 46).attr('text-anchor', 'middle').text(pair.xLabel);
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -50).attr('text-anchor', 'middle').text(pair.yLabel);
  }

  render();

  return {
    setPair: (idx) => { pairIdx = idx; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
