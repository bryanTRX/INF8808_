import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Axis Definitions ─────────────────────────────────────────────────────────

export type ScatterAxisKey = 'popularity' | 'energy' | 'danceability' | 'valence' | 'loudness' | 'tempo' | 'acousticness' | 'speechiness';

interface AxisDef {
  key: ScatterAxisKey;
  label: string;
  domain: [number, number];
  fmt: (v: number) => string;
}

export const SCATTER_AXES: AxisDef[] = [
  { key: 'popularity',    label: 'Popularity',    domain: [0, 100],  fmt: d3.format('.0f')  },
  { key: 'energy',        label: 'Energy',        domain: [0, 1],    fmt: d3.format('.2f')  },
  { key: 'danceability',  label: 'Danceability',  domain: [0, 1],    fmt: d3.format('.2f')  },
  { key: 'valence',       label: 'Valence',        domain: [0, 1],   fmt: d3.format('.2f')  },
  { key: 'loudness',      label: 'Loudness (dB)', domain: [-40, 0],  fmt: d3.format('.1f')  },
  { key: 'tempo',         label: 'Tempo (BPM)',   domain: [50, 220], fmt: d3.format('.0f')  },
  { key: 'acousticness',  label: 'Acousticness',  domain: [0, 1],    fmt: d3.format('.2f')  },
  { key: 'speechiness',   label: 'Speechiness',   domain: [0, 0.6],  fmt: d3.format('.2f')  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Viz13Options {
  xAxis: ScatterAxisKey;
  yAxis: ScatterAxisKey;
  sampleSize: number;
  search: string;
  showTrend: boolean;
}

export interface Viz13Chart {
  resize: () => void;
  destroy: () => void;
  update: (opts: Partial<Viz13Options>) => void;
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz13Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz13Chart {
  let opts: Viz13Options = {
    xAxis: 'energy', yAxis: 'popularity', sampleSize: 2000, search: '', showTrend: true,
  };

  const axisMap = new Map(SCATTER_AXES.map((a) => [a.key, a]));

  function prepare() {
    const xDef = axisMap.get(opts.xAxis)!;
    const yDef = axisMap.get(opts.yAxis)!;
    const search = opts.search.toLowerCase();

    const filtered = rows.filter((r) => {
      const xv = Number(r[opts.xAxis as keyof TrackRow]);
      const yv = Number(r[opts.yAxis as keyof TrackRow]);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) return false;
      if (xv < xDef.domain[0] || xv > xDef.domain[1]) return false;
      if (yv < yDef.domain[0] || yv > yDef.domain[1]) return false;
      if (search) {
        const title  = String(r.track_name  || '').toLowerCase();
        const artist = String(r.artists     || '').toLowerCase();
        return title.includes(search) || artist.includes(search);
      }
      return true;
    });

    const step = filtered.length > opts.sampleSize ? Math.ceil(filtered.length / opts.sampleSize) : 1;
    return filtered.filter((_, i) => i % step === 0);
  }

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    const data = prepare();
    const xDef = axisMap.get(opts.xAxis)!;
    const yDef = axisMap.get(opts.yAxis)!;

    if (data.length === 0) {
      container.innerHTML = `<div class="chart-loading" style="color:var(--muted)">No data matches your filters.</div>`;
      return;
    }

    const margin = { top: 52, right: 28, bottom: 60, left: 60 };
    const W = Math.max(480, container.clientWidth  || 800);
    const H = Math.max(420, container.clientHeight || 560);
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top  - margin.bottom;

    const x = d3.scaleLinear().domain(xDef.domain).range([0, innerW]).clamp(true);
    const y = d3.scaleLinear().domain(yDef.domain).range([innerH, 0]).clamp(true);

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);

    svg.append('text').attr('class', 'chart-title')
      .attr('x', W / 2).attr('y', 24).attr('text-anchor', 'middle')
      .text(`${yDef.label} vs ${xDef.label}`);
    svg.append('text').attr('class', 'chart-subtitle')
      .attr('x', W / 2).attr('y', 40).attr('text-anchor', 'middle')
      .text(`${d3.format(',')(data.length)} tracks`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g').attr('class', 'grid')
      .selectAll('line').data(y.ticks(5)).join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (v) => y(v)).attr('y2', (v) => y(v))
      .attr('stroke', theme.border).attr('stroke-opacity', 0.35);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6).tickFormat(xDef.fmt as (v: d3.NumberValue) => string));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6).tickFormat(yDef.fmt as (v: d3.NumberValue) => string));

    g.append('text').attr('class', 'axis-label').attr('x', innerW / 2).attr('y', innerH + 44).attr('text-anchor', 'middle').text(xDef.label);
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -46).attr('text-anchor', 'middle').text(yDef.label);

    // Dots
    g.selectAll<SVGCircleElement, TrackRow>('.dot')
      .data(data).join('circle').attr('class', 'dot')
      .attr('cx', (r) => x(Number(r[opts.xAxis as keyof TrackRow])))
      .attr('cy', (r) => y(Number(r[opts.yAxis as keyof TrackRow])))
      .attr('r', 3).attr('fill', '#4C78A8').attr('opacity', 0.28)
      .on('mouseover', function (event, r) {
        d3.select(this).attr('opacity', 1).attr('r', 5);
        const xv = Number(r[opts.xAxis as keyof TrackRow]);
        const yv = Number(r[opts.yAxis as keyof TrackRow]);
        tip.show(event, `
          <strong style="font-size:0.9rem">${String(r.track_name || '')}</strong><br>
          <span style="color:var(--muted);font-size:0.82rem">${String(r.artists || '')}</span>
          <div style="border-top:1px solid var(--border);margin-top:0.4rem;padding-top:0.4rem;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${xDef.label}</span>
              <span class="tooltip-value">${xDef.fmt(xv)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${yDef.label}</span>
              <span class="tooltip-value">${yDef.fmt(yv)}</span>
            </div>
          </div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { d3.select(this).attr('opacity', 0.28).attr('r', 3); tip.hide(); });

    // Trend line
    if (opts.showTrend && data.length > 1) {
      const pairs = data.map((r) => ({
        x: Number(r[opts.xAxis as keyof TrackRow]),
        y: Number(r[opts.yAxis as keyof TrackRow]),
      })).filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

      const mx = d3.mean(pairs, (d) => d.x) ?? 0;
      const my = d3.mean(pairs, (d) => d.y) ?? 0;
      let num = 0, den = 0;
      pairs.forEach(({ x: xv, y: yv }) => { num += (xv - mx) * (yv - my); den += (xv - mx) ** 2; });
      const slope = den !== 0 ? num / den : 0;
      const intercept = my - slope * mx;

      const [x0, x1] = xDef.domain;
      const y0 = slope * x0 + intercept;
      const y1 = slope * x1 + intercept;

      g.append('line')
        .attr('x1', x(x0)).attr('y1', y(y0))
        .attr('x2', x(x1)).attr('y2', y(y1))
        .attr('stroke', '#E45756').attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4').attr('stroke-opacity', 0.7)
        .attr('pointer-events', 'none');
    }
  }

  render();

  return {
    resize: render,
    destroy: () => { container.innerHTML = ''; },
    update: (newOpts) => { opts = { ...opts, ...newOpts }; render(); },
  };
}
