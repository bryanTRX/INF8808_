import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Labels ───────────────────────────────────────────────────────────────────

const LBL = {
  title: 'Song Duration vs. Popularity',
  subtitle: 'Tracks under 15 minutes — binned by 30-second intervals',
  xLabel: 'Duration (minutes)',
  yLabel: 'Average popularity',
  tipDuration: 'Duration',
  tipAvgPop: 'Avg. popularity',
  tipTracks: 'Tracks in bin',
  tipRange: 'Range',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BinDatum {
  range: [number, number];
  avg_popularity: number;
  count: number;
}

export interface Viz07Chart {
  getMeta: () => { tracks_in_view: number; correlation: number; bin_width_minutes: number };
  getFullBins: () => BinDatum[];
  resize: () => void;
  destroy: () => void;
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz07Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
): Viz07Chart {
  const BIN_WIDTH_MS = 30_000;
  const MAX_MINUTES = 15;
  const MAX_MS = MAX_MINUTES * 60_000;

  const clean = rows
    .map((r) => ({ dur: Number(r.duration_ms), pop: Number(r.popularity) }))
    .filter((d) => Number.isFinite(d.dur) && Number.isFinite(d.pop) && d.dur > 0 && d.dur <= MAX_MS);

  const numBins = Math.ceil(MAX_MS / BIN_WIDTH_MS);
  const binData: Array<{ dur: number; pop: number }[]> = Array.from({ length: numBins }, () => []);

  clean.forEach((d) => {
    const idx = Math.min(Math.floor(d.dur / BIN_WIDTH_MS), numBins - 1);
    binData[idx].push(d);
  });

  const fullBins: BinDatum[] = binData.map((tracks, i) => ({
    range: [(i * BIN_WIDTH_MS) / 60_000, ((i + 1) * BIN_WIDTH_MS) / 60_000],
    avg_popularity: tracks.length > 0 ? (d3.mean(tracks, (d) => d.pop) ?? 0) : 0,
    count: tracks.length,
  }));

  const correlation = (() => {
    const xs = clean.map((d) => d.dur / 60_000);
    const ys = clean.map((d) => d.pop);
    const mx = d3.mean(xs) ?? 0, my = d3.mean(ys) ?? 0;
    let n = 0, dx = 0, dy = 0;
    xs.forEach((x, i) => { n += (x - mx) * (ys[i] - my); dx += (x - mx) ** 2; dy += (ys[i] - my) ** 2; });
    const r = n / Math.sqrt(dx * dy);
    return parseFloat(r.toFixed(3));
  })();

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();

    const margin = { top: 56, right: 32, bottom: 64, left: 56 };
    const width = Math.max(600, container.clientWidth || 900);
    const height = Math.max(380, container.clientHeight || 480);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const displayed = fullBins.filter((b) => b.count > 0);

    const x = d3.scaleLinear()
      .domain([0, MAX_MINUTES])
      .range([0, innerW]);

    const y = d3.scaleLinear()
      .domain([0, Math.max(100, (d3.max(displayed, (b) => b.avg_popularity) ?? 100) * 1.05)])
      .range([innerH, 0])
      .nice();

    const barW = Math.max(1, (innerW / MAX_MINUTES) * (BIN_WIDTH_MS / 60_000) - 1);

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
    g.append('text').attr('class', 'chart-title')
      .attr('x', innerW / 2).attr('y', -32).attr('text-anchor', 'middle')
      .text(LBL.title);
    g.append('text').attr('class', 'chart-subtitle')
      .attr('x', innerW / 2).attr('y', -14).attr('text-anchor', 'middle')
      .text(LBL.subtitle);

    // Grid
    g.append('g').attr('class', 'grid')
      .selectAll('line').data(y.ticks(6)).join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (v) => y(v)).attr('y2', (v) => y(v))
      .attr('stroke', theme.border).attr('stroke-opacity', 0.35);

    // Bars
    g.selectAll<SVGRectElement, BinDatum>('.bar')
      .data(displayed).join('rect').attr('class', 'bar')
      .attr('x', (b) => x(b.range[0]))
      .attr('y', (b) => y(b.avg_popularity))
      .attr('width', barW)
      .attr('height', (b) => Math.max(0, innerH - y(b.avg_popularity)))
      .attr('fill', (b) => {
        const t = b.avg_popularity / 100;
        return d3.interpolateRdYlGn(t);
      })
      .attr('rx', 2).attr('opacity', 0.82)
      .on('mouseover', function (event, b) {
        d3.select(this).attr('opacity', 1);
        const fmt = d3.format('.2f');
        const fmtN = d3.format(',');
        tip.show(event, `
          <div style="font-size:0.84rem;margin-bottom:0.4rem">
            <strong>${LBL.tipDuration}: ${fmt(b.range[0])} – ${fmt(b.range[1])} min</strong>
          </div>
          <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipAvgPop}</span>
              <span class="tooltip-value">${fmt(b.avg_popularity)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipTracks}</span>
              <span class="tooltip-value">${fmtN(b.count)}</span>
            </div>
          </div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { d3.select(this).attr('opacity', 0.82); tip.hide(); });

    // Axes
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat((v) => `${v} min`));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));

    g.append('text').attr('class', 'axis-label')
      .attr('x', innerW / 2).attr('y', innerH + 46).attr('text-anchor', 'middle')
      .text(LBL.xLabel);
    g.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -42)
      .attr('text-anchor', 'middle').text(LBL.yLabel);
  }

  render();

  return {
    getMeta: () => ({
      tracks_in_view: clean.length,
      correlation,
      bin_width_minutes: BIN_WIDTH_MS / 60_000,
    }),
    getFullBins: () => fullBins,
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
