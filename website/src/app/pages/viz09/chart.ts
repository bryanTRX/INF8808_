import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Mode Definitions ─────────────────────────────────────────────────────────

export type HeatmapMode = 'energy-loudness' | 'speech-dance';

export const MODE_LABELS_EN: Record<HeatmapMode, string> = {
  'energy-loudness': 'Energy × Loudness',
  'speech-dance': 'Speechiness × Danceability',
};

interface ModeConfig {
  xKey: keyof TrackRow;
  yKey: keyof TrackRow;
  xLabel: string;
  yLabel: string;
  xDomain: [number, number];
  yDomain: [number, number];
}

const MODE_CONFIGS: Record<HeatmapMode, ModeConfig> = {
  'energy-loudness': {
    xKey: 'energy', yKey: 'loudness',
    xLabel: 'Energy', yLabel: 'Loudness (dB)',
    xDomain: [0, 1], yDomain: [-40, 0],
  },
  'speech-dance': {
    xKey: 'speechiness', yKey: 'danceability',
    xLabel: 'Speechiness', yLabel: 'Danceability',
    xDomain: [0, 0.6], yDomain: [0, 1],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Viz09Chart {
  setMode: (mode: HeatmapMode) => void;
  resize: () => void;
  destroy: () => void;
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz09Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz09Chart {
  let mode: HeatmapMode = 'energy-loudness';

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    const config = MODE_CONFIGS[mode];

    const margin = { top: 60, right: 80, bottom: 64, left: 68 };
    const width  = Math.max(560, container.clientWidth  || 820);
    const height = Math.max(480, container.clientHeight || 560);
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const N_BINS = 30;

    const x = d3.scaleLinear().domain(config.xDomain).range([0, innerW]);
    const y = d3.scaleLinear().domain(config.yDomain).range([innerH, 0]);

    const xBinW = (config.xDomain[1] - config.xDomain[0]) / N_BINS;
    const yBinH = (config.yDomain[1] - config.yDomain[0]) / N_BINS;

    const binKey = (xVal: number, yVal: number): string => {
      const xi = Math.floor((xVal - config.xDomain[0]) / xBinW);
      const yi = Math.floor((yVal - config.yDomain[0]) / yBinH);
      const xc = Math.min(N_BINS - 1, Math.max(0, xi));
      const yc = Math.min(N_BINS - 1, Math.max(0, yi));
      return `${xc}-${yc}`;
    };

    type BinEntry = { xi: number; yi: number; pops: number[]; count: number };
    const bins = new Map<string, BinEntry>();

    for (const row of rows) {
      const xv = Number(row[config.xKey]);
      const yv = Number(row[config.yKey]);
      const pop = Number(row.popularity);
      if (!Number.isFinite(xv) || !Number.isFinite(yv) || !Number.isFinite(pop)) continue;
      if (xv < config.xDomain[0] || xv > config.xDomain[1]) continue;
      if (yv < config.yDomain[0] || yv > config.yDomain[1]) continue;

      const key = binKey(xv, yv);
      const xi = Math.min(N_BINS - 1, Math.max(0, Math.floor((xv - config.xDomain[0]) / xBinW)));
      const yi = Math.min(N_BINS - 1, Math.max(0, Math.floor((yv - config.yDomain[0]) / yBinH)));

      if (!bins.has(key)) bins.set(key, { xi, yi, pops: [], count: 0 });
      const b = bins.get(key)!;
      b.pops.push(pop);
      b.count += 1;
    }

    interface BinData { xi: number; yi: number; count: number; avgPop: number }
    const binArr: BinData[] = [];
    bins.forEach(({ xi, yi, pops, count }) => {
      binArr.push({ xi, yi, count, avgPop: d3.mean(pops) ?? 0 });
    });

    const maxCount = d3.max(binArr, (b) => b.count) ?? 1;
    const colorScale = d3.scaleSequential().domain([0, maxCount]).interpolator(d3.interpolateInferno);

    const cellW = innerW / N_BINS;
    const cellH = innerH / N_BINS;

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
    g.append('text').attr('class', 'chart-title')
      .attr('x', innerW / 2).attr('y', -34).attr('text-anchor', 'middle')
      .text(`Track Density – ${MODE_LABELS_EN[mode]}`);

    // Heatmap cells
    g.selectAll<SVGRectElement, BinData>('.cell')
      .data(binArr).join('rect').attr('class', 'cell')
      .attr('x', (b) => b.xi * cellW)
      .attr('y', (b) => innerH - (b.yi + 1) * cellH)
      .attr('width', cellW).attr('height', cellH)
      .attr('fill', (b) => colorScale(b.count))
      .attr('stroke', 'none')
      .on('mouseover', function (event, b) {
        d3.select(this).attr('opacity', 0.75);
        const xLo = config.xDomain[0] + b.xi * xBinW;
        const yLo = config.yDomain[0] + b.yi * yBinH;
        const fmt2 = d3.format('.2f');
        const fmtN = d3.format(',');
        tip.show(event, `
          <div style="font-size:0.84rem;margin-bottom:0.4rem">
            <strong>${config.xLabel}: ${fmt2(xLo)} – ${fmt2(xLo + xBinW)}</strong>
          </div>
          <div style="font-size:0.84rem;margin-bottom:0.4rem">
            <strong>${config.yLabel}: ${fmt2(yLo)} – ${fmt2(yLo + yBinH)}</strong>
          </div>
          <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">Tracks</span>
              <span class="tooltip-value">${fmtN(b.count)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">Avg. popularity</span>
              <span class="tooltip-value">${fmt2(b.avgPop)}</span>
            </div>
          </div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { d3.select(this).attr('opacity', 1); tip.hide(); });

    // Axes
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6));
    g.append('g').attr('class', 'axis')
      .call(d3.axisLeft(y).ticks(6));

    g.append('text').attr('class', 'axis-label')
      .attr('x', innerW / 2).attr('y', innerH + 46).attr('text-anchor', 'middle')
      .text(config.xLabel);
    g.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -50)
      .attr('text-anchor', 'middle').text(config.yLabel);

    // Color legend
    const legendW = 12;
    const legendH = innerH * 0.55;
    const legendG = g.append('g')
      .attr('transform', `translate(${innerW + 18},${(innerH - legendH) / 2})`);

    const defs = svg.append('defs');
    const gradId = `heatmap-grad-${Math.random().toString(36).slice(2)}`;
    const grad = defs.append('linearGradient').attr('id', gradId)
      .attr('x1', '0%').attr('y1', '100%').attr('x2', '0%').attr('y2', '0%');
    const stops = d3.range(0, 1.01, 0.1);
    stops.forEach((t) => {
      grad.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(t * maxCount));
    });

    legendG.append('rect')
      .attr('width', legendW).attr('height', legendH)
      .attr('fill', `url(#${gradId})`).attr('rx', 2);

    const legScale = d3.scaleLinear().domain([0, maxCount]).range([legendH, 0]);
    legendG.append('g').attr('class', 'axis')
      .attr('transform', `translate(${legendW},0)`)
      .call(d3.axisRight(legScale).ticks(4).tickFormat(d3.format('.0f')));

    legendG.append('text').attr('class', 'axis-label')
      .attr('x', legendW / 2).attr('y', -8).attr('text-anchor', 'middle')
      .style('font-size', '9px').text('Tracks');
  }

  render();

  return {
    setMode: (m) => { mode = m; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
