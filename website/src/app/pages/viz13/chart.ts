import type { Lang } from '../../core/services/lang.service';
import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { CHART, styleAxis } from '../../viz-shared/utils/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

const AXES_EN = [
  { key: 'popularity'       as const, label: 'Popularity',    domain: [0, 100]   as [number, number] },
  { key: 'energy'           as const, label: 'Energy',        domain: [0, 1]     as [number, number] },
  { key: 'danceability'     as const, label: 'Danceability',  domain: [0, 1]     as [number, number] },
  { key: 'valence'          as const, label: 'Valence',       domain: [0, 1]     as [number, number] },
  { key: 'acousticness'     as const, label: 'Acoustic',      domain: [0, 1]     as [number, number] },
  { key: 'speechiness'      as const, label: 'Speechiness',   domain: [0, 1]     as [number, number] },
  { key: 'instrumentalness' as const, label: 'Instrumental',  domain: [0, 1]     as [number, number] },
  { key: 'loudness'         as const, label: 'Loudness (dB)', domain: [-60, 0]   as [number, number] },
  { key: 'tempo'            as const, label: 'Tempo (BPM)',   domain: [50, 220]  as [number, number] },
];
export const SCATTER_AXES = AXES_EN;
export function getScatterAxes(_lang: Lang) { return AXES_EN; }
const L = (_lang: Lang) => ({
  axes: AXES_EN,
  title: (y: string, x: string) => `${y} as a function of ${x}`,
  hint: (n: number) => `${d3.format(',')(n)} tracks shown. Color indicates genre. Select the axes from the controls above.`,
  tip: { genre: 'Genre' },
});

export type ScatterAxisKey = (typeof SCATTER_AXES)[number]['key'];

interface ScatterPoint {
  id: string;
  trackName: string;
  artists: string;
  genre: string;
  values: Record<ScatterAxisKey, number>;
}

function classifyGenre(raw: unknown): string {
  const t = String(raw || '').toLowerCase().split(';');
  if (t.some((s) => s.includes('hip-hop') || s.includes('hip hop'))) return 'hip-hop';
  if (t.some((s) => s === 'r-n-b' || s.includes('r&b') || s.includes('soul'))) return 'r&b';
  for (const g of ['pop', 'rock', 'electronic', 'dance', 'indie', 'country', 'jazz', 'classical', 'latin', 'metal']) {
    if (t.some((s) => s.includes(g))) return g;
  }
  return 'other';
}

const GENRE_COLOR = d3.scaleOrdinal(
  ['pop','rock','hip-hop','electronic','dance','indie','r&b','country','jazz','classical','latin','metal','other'],
  ['#2f80ed','#d1495b','#1b998b','#8f63c7','#f2a541','#537a5a','#ef476f','#7f5539','#118ab2','#6c757d','#e76f51','#343a40','#888888'],
);

function linReg(data: { x: number; y: number }[]) {
  if (data.length < 2) return null;
  const mx = d3.mean(data, (d) => d.x)!;
  const my = d3.mean(data, (d) => d.y)!;
  const num  = d3.sum(data, (d) => (d.x - mx) * (d.y - my));
  const xVar = d3.sum(data, (d) => (d.x - mx) ** 2);
  const yVar = d3.sum(data, (d) => (d.y - my) ** 2);
  if (xVar === 0 || yVar === 0) return null;
  const slope = num / xVar;
  return { slope, intercept: my - slope * mx, r: num / Math.sqrt(xVar * yVar) };
}

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  return d3.range(n).map((i) => arr[Math.floor((i * arr.length) / n)]);
}

export interface Viz13State {
  xAxis: ScatterAxisKey;
  yAxis: ScatterAxisKey;
  sampleSize: number;
  search: string;
  showTrend: boolean;
}

export interface Viz13Chart {
  update: (s: Viz13State) => void;
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function createViz13Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz13Chart {
  let _lang = initLang;
  const allPoints: ScatterPoint[] = rows
    .map((r): ScatterPoint | null => {
      const vals = {} as Record<ScatterAxisKey, number>;
      for (const ax of SCATTER_AXES) {
        const v = Number(r[ax.key]);
        if (!Number.isFinite(v)) return null;
        vals[ax.key] = v;
      }
      return {
        id: String(r.track_id || ''),
        trackName: String(r.track_name || ''),
        artists: String(r.artists || ''),
        genre: classifyGenre(r.track_genre),
        values: vals,
      };
    })
    .filter((d): d is ScatterPoint => d !== null);

  let state: Viz13State = { xAxis: 'energy', yAxis: 'popularity', sampleSize: 2000, search: '', showTrend: true };

  function render() {
    container.innerHTML = '';
    const lbl  = L(_lang);
    const xCfg = lbl.axes.find((a) => a.key === state.xAxis)!;
    const yCfg = lbl.axes.find((a) => a.key === state.yAxis)!;
    const srch = state.search.toLowerCase();
    const pts  = sample(allPoints, state.sampleSize);

    const width  = Math.max(600, container.clientWidth || 860);
    const height = Math.max(480, container.clientHeight || 520);
    const margin = { top: 64, right: 40, bottom: 52, left: 60 };
    const iW     = width  - margin.left - margin.right;
    const iH     = height - margin.top  - margin.bottom;

    const x = d3.scaleLinear().domain(xCfg.domain).nice().range([0, iW]);
    const y = d3.scaleLinear().domain(yCfg.domain).nice().range([iH, 0]);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    const g   = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('text').attr('x', margin.left).attr('y', 22).attr('fill', CHART.text).attr('font-size', 15).attr('font-weight', 700).text(lbl.title(yCfg.label, xCfg.label));
    svg.append('text').attr('x', margin.left).attr('y', 42).attr('fill', CHART.muted).attr('font-size', 11).text(lbl.hint(pts.length));

    // Grids
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-iW).tickFormat(() => '').ticks(6) as never)
      .call((s) => s.select('.domain').remove())
      .selectAll('line').attr('stroke', CHART.grid).attr('opacity', 0.35);
    g.append('g').attr('class', 'grid')
      .call(d3.axisBottom(x).tickSize(iH).tickFormat(() => '').ticks(6) as never)
      .call((s) => s.select('.domain').remove())
      .selectAll('line').attr('stroke', CHART.grid).attr('opacity', 0.35);

    const xAx = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`).call(d3.axisBottom(x).ticks(6));
    const yAx = g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));
    styleAxis(xAx as never);
    styleAxis(yAx as never);
    g.append('text').attr('class', 'axis-label').attr('x', iW / 2).attr('y', iH + 40)
      .attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(xCfg.label);
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -iH / 2).attr('y', -46).attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(yCfg.label);

    g.selectAll('.dot').data(pts, (d) => (d as ScatterPoint).id).join('circle')
      .attr('cx', (d) => x(d.values[state.xAxis]))
      .attr('cy', (d) => y(d.values[state.yAxis]))
      .attr('r', (d) => srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch) ? 5 : 2.5)
      .attr('fill', (d) => GENRE_COLOR(d.genre))
      .attr('opacity', (d) => srch ? (`${d.trackName} ${d.artists}`.toLowerCase().includes(srch) ? 0.95 : 0.06) : 0.45)
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', 6).attr('opacity', 1);
        tip.show(event,
          `<div><strong>${d.trackName}</strong></div>
           <div class="muted">${d.artists} · ${d.genre}</div>
           <div>${xCfg.label} : <span class="tooltip-value">${d3.format('.2f')(d.values[state.xAxis])}</span></div>
           <div>${yCfg.label} : <span class="tooltip-value">${d3.format('.2f')(d.values[state.yAxis])}</span></div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseleave', function (_, d) {
        const m = srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch);
        d3.select(this).attr('r', m ? 5 : 2.5).attr('opacity', srch ? (m ? 0.95 : 0.06) : 0.45);
        tip.hide();
      });

    if (state.showTrend) {
      const fit = linReg(pts.map((p) => ({ x: p.values[state.xAxis], y: p.values[state.yAxis] })));
      if (fit) {
        g.append('path')
          .datum(x.domain().map((xv) => ({ xv, yv: fit.intercept + fit.slope * xv })))
          .attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2).attr('opacity', 0.85)
          .attr('d', d3.line<{ xv: number; yv: number }>()
            .x((d) => x(d.xv)).y((d) => y(d.yv)).defined((d) => Number.isFinite(d.yv)));
        g.append('text').attr('x', iW - 4).attr('y', 14).attr('text-anchor', 'end')
          .attr('fill', 'var(--accent)').attr('font-size', 12).attr('font-weight', 700)
          .text(`r = ${d3.format('+.3f')(fit.r)}`);
      }
    }
  }

  render();
  return {
    update(s) { state = s; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
