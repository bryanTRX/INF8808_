import * as d3 from 'd3';
import type { Lang } from '../../core/services/lang.service';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// Colors align with GENRE_FAMILIES for visual consistency
const GENRES = [
  { id: 'pop' as const, label: 'Pop', color: '#4e9af1' },
  { id: 'rock' as const, label: 'Rock', color: '#e05252' },
];

const L = (lang: Lang) => lang === 'fr' ? {
  tracks: 'titres', axisY: 'Popularité (0–100)',
  axisX: 'Niveau acoustique (de 0 = production électronique à 1 = acoustique pur)',
  labels: { low: 'peu acoustique', mid: 'mixte', high: 'très acoustique' },
  legend: ['Tendance (régression)', 'Moyenne par tranche'],
  tip: { acoustic: 'Acoustique', pop: 'Popularité' },
} : {
  tracks: 'tracks', axisY: 'Popularity (0–100)',
  axisX: 'Acousticness (0 = fully produced, 1 = fully acoustic)',
  labels: { low: 'not acoustic', mid: 'mixed', high: 'very acoustic' },
  legend: ['Trend (regression)', 'Binned mean'],
  tip: { acoustic: 'Acousticness', pop: 'Popularity' },
};

interface ParsedTrack { trackId: string; artists: string; trackName: string; acousticness: number; popularity: number; genre: 'pop' | 'rock'; trackGenre: string }

export interface Viz06State { sampleSize: number; sharedScales: boolean; search: string }
export interface Viz06Chart { update: (s: Viz06State) => void; setLang: (l: Lang) => void; resize: () => void; destroy: () => void }

function classifyPopRock(raw: unknown): 'pop' | 'rock' | null {
  const tokens = String(raw || '').toLowerCase().split(';').map((t) => t.trim()).filter(Boolean);
  if (tokens.some((t) => t.includes('hip-hop') || t.includes('hip hop'))) return null;
  for (const g of ['pop', 'rock'] as const) { if (tokens.some((t) => t.includes(g))) return g; }
  return null;
}
function linReg(data: ParsedTrack[]) {
  if (data.length < 2) return null;
  const mx = d3.mean(data, (d) => d.acousticness)!, my = d3.mean(data, (d) => d.popularity)!;
  const num = d3.sum(data, (d) => (d.acousticness - mx) * (d.popularity - my));
  const xV = d3.sum(data, (d) => (d.acousticness - mx) ** 2), yV = d3.sum(data, (d) => (d.popularity - my) ** 2);
  if (xV === 0 || yV === 0) return null;
  const slope = num / xV;
  return { slope, intercept: my - slope * mx, r: num / Math.sqrt(xV * yV) };
}
function binnedMeans(data: ParsedTrack[], bins = 8) {
  return d3.bin().domain([0, 1]).thresholds(bins)(data.map((d) => d.acousticness))
    .map((bin) => { const pts = data.filter((d) => d.acousticness >= bin.x0! && d.acousticness < (bin.x1 ?? 1.001)); if (!pts.length) return null; return { x: ((bin.x0 ?? 0) + (bin.x1 ?? 1)) / 2, y: d3.mean(pts, (d) => d.popularity)! }; })
    .filter((d): d is { x: number; y: number } => d !== null);
}
function sample<T>(arr: T[], n: number): T[] { if (arr.length <= n) return arr; return d3.range(n).map((i) => arr[Math.floor((i * arr.length) / n)]); }

export function createViz06Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz06Chart {
  let _lang = initLang;
  const tracks = rows.map((r): ParsedTrack | null => {
    const a = Number(r.acousticness), p = Number(r.popularity);
    if (!Number.isFinite(a) || !Number.isFinite(p)) return null;
    const genre = classifyPopRock(r.track_genre); if (!genre) return null;
    return { trackId: String(r.track_id || ''), artists: String(r.artists || ''), trackName: String(r.track_name || ''), acousticness: a, popularity: p, genre, trackGenre: String(r.track_genre || '') };
  }).filter((d): d is ParsedTrack => d !== null);
  const byGenre = { pop: tracks.filter((t) => t.genre === 'pop'), rock: tracks.filter((t) => t.genre === 'rock') };
  let state: Viz06State = { sampleSize: 700, sharedScales: true, search: '' };

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const theme = getChartTheme();
    const facets = GENRES.map((g) => [g, byGenre[g.id]] as const).filter(([, v]) => v.length);
    const width = Math.max(container.clientWidth || 900, 640);
    const fW = width / 2;
    const fH = 420;
    const height = fH + 8;
    const m = { top: 50, right: 24, bottom: 56, left: 60 };
    const allV = facets.flatMap(([, v]) => v);
    const xDom = state.sharedScales ? ([0, 1] as [number, number]) : null;
    const yDom = state.sharedScales
      ? ([0, d3.max(allV, (d) => d.popularity) || 100] as [number, number])
      : null;
    const srch = state.search.toLowerCase();
    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    facets.forEach(([meta, values], idx) => {
      const iW = fW - m.left - m.right;
      const iH = fH - m.top - m.bottom;
      const pts = sample(values, state.sampleSize);
      const xSc = d3
        .scaleLinear()
        .domain(xDom ?? (d3.extent(values, (d) => d.acousticness) as [number, number]))
        .nice()
        .range([0, iW]);
      const ySc = d3
        .scaleLinear()
        .domain(yDom ?? (d3.extent(values, (d) => d.popularity) as [number, number]))
        .nice()
        .range([iH, 0]);

      const facet = svg.append('g').attr('transform', `translate(${idx * fW + m.left},${m.top})`);

      // Theme-aware facet background
      facet
        .insert('rect', ':first-child')
        .attr('x', -m.left + 4)
        .attr('y', -m.top + 4)
        .attr('width', iW + m.left + m.right - 8)
        .attr('height', iH + m.top + m.bottom - 8)
        .attr('rx', 10)
        .attr('fill', theme.panel)
        .attr('stroke', theme.border)
        .attr('stroke-width', 1);

      facet
        .append('text')
        .attr('y', -18)
        .attr('fill', meta.color)
        .style('font-size', '12px')
        .style('font-weight', '700')
        .text(`${meta.label}  —  ${d3.format(',')(values.length)} ${lbl.tracks}`);

      // Grid
      facet
        .append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(ySc).ticks(5).tickSize(-iW).tickFormat(() => ''))
        .selectAll('line')
        .attr('stroke', theme.border)
        .attr('stroke-opacity', 0.4);
      facet.select('.grid .domain').remove();

      // Axes
      facet.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`).call(d3.axisBottom(xSc).ticks(5));
      facet.append('g').attr('class', 'axis').call(d3.axisLeft(ySc).ticks(5));

      if (idx === 0) {
        facet.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -iH / 2).attr('y', -46).attr('text-anchor', 'middle').text(lbl.axisY);
      }
      facet.append('text').attr('class', 'axis-label').attr('x', iW / 2).attr('y', iH + 46).attr('text-anchor', 'middle').text(lbl.axisX);

      // Points
      const matches = (d: ParsedTrack) =>
        !!srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch);

      facet
        .selectAll<SVGCircleElement, ParsedTrack>('.point')
        .data(pts, (d) => d.trackId)
        .join('circle')
        .attr('class', 'point')
        .attr('cx', (d) => xSc(d.acousticness))
        .attr('cy', (d) => ySc(d.popularity))
        .attr('r', (d) => (matches(d) ? 5 : 2.8))
        .attr('fill', meta.color)
        .attr('opacity', (d) => (srch ? (matches(d) ? 0.95 : 0.07) : 0.42))
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', 6).attr('opacity', 1);
          const acousticLabel =
            d.acousticness < 0.33
              ? lbl.labels.low
              : d.acousticness > 0.66
                ? lbl.labels.high
                : lbl.labels.mid;
          tip.show(
            event,
            `<div style="margin-bottom:0.35rem">
              <strong style="font-size:0.9rem">${d.trackName}</strong>
            </div>
            <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.45rem">${d.artists}</div>
            <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${lbl.tip.acoustic}</span>
                <span class="tooltip-value">${d3.format('.2f')(d.acousticness)} <span style="font-weight:400;color:var(--muted)">(${acousticLabel})</span></span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${lbl.tip.pop}</span>
                <span class="tooltip-value">${d3.format('.0f')(d.popularity)}</span>
              </div>
            </div>`,
          );
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseleave', function (_, d) {
          d3.select(this)
            .attr('r', matches(d) ? 5 : 2.8)
            .attr('opacity', srch ? (matches(d) ? 0.95 : 0.07) : 0.42);
          tip.hide();
        });

      // Regression line (dashed — overall trend)
      const fit = linReg(values);
      if (fit) {
        facet
          .append('path')
          .datum(xSc.domain().map((x) => ({ x, y: fit.intercept + fit.slope * x })))
          .attr('fill', 'none')
          .attr('stroke', meta.color)
          .attr('stroke-width', 1.8)
          .attr('stroke-dasharray', '5,4')
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0.8)
          .attr('d', d3.line<{ x: number; y: number }>().x((d) => xSc(d.x)).y((d) => ySc(d.y)).defined((d) => Number.isFinite(d.y)));

        // Pearson r badge
        const rText = `r = ${d3.format('+.2f')(fit.r)}`;
        const bW = rText.length * 7.2 + 10;
        const bg = facet.append('g').attr('transform', `translate(${iW - bW - 2},4)`);
        bg.append('rect').attr('width', bW).attr('height', 18).attr('rx', 3).attr('fill', theme.panel).attr('stroke', meta.color).attr('stroke-width', 1).attr('opacity', 0.9);
        bg.append('text').attr('x', 5).attr('y', 13).attr('fill', meta.color).style('font-size', '10.5px').style('font-weight', '700').text(rText);
      }

      // Binned mean line (solid — non-linear trend)
      facet
        .append('path')
        .datum(binnedMeans(values, 8))
        .attr('fill', 'none')
        .attr('stroke', meta.color)
        .attr('stroke-width', 2.2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', 0.65)
        .attr('d', d3.line<{ x: number; y: number }>().x((d) => xSc(d.x)).y((d) => ySc(d.y)));

      // In-facet legend
      const legY = iH - 38;
      lbl.legend.forEach((label, li) => {
        const lg = facet.append('g').attr('transform', `translate(6,${legY + li * 18})`);
        lg.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 5).attr('y2', 5)
          .attr('stroke', meta.color).attr('stroke-width', li === 0 ? 1.8 : 2.2)
          .attr('stroke-dasharray', li === 0 ? '5,4' : null);
        lg.append('text').attr('x', 28).attr('y', 9).attr('class', 'legend-label').style('font-size', '9.5px').text(label);
      });
    });
  }

  render();
  return { update(s) { state = s; render(); }, setLang(l) { _lang = l; render(); }, resize: render, destroy: () => { container.innerHTML = ''; } };
}

export function getViz06Stats(rows: TrackRow[]) {
  const tracks = rows.map((r): ParsedTrack | null => {
    const a = Number(r.acousticness), p = Number(r.popularity);
    if (!Number.isFinite(a) || !Number.isFinite(p)) return null;
    const genre = classifyPopRock(r.track_genre); if (!genre) return null;
    return { trackId: '', artists: String(r.artists || ''), trackName: String(r.track_name || ''), acousticness: a, popularity: p, genre, trackGenre: String(r.track_genre || '') };
  }).filter((d): d is ParsedTrack => d !== null);
  return GENRES.map((g) => {
    const values = tracks.filter((t) => t.genre === g.id);
    const fit = linReg(values); const low = values.filter((d) => d.acousticness < 0.33); const high = values.filter((d) => d.acousticness > 0.66);
    return { ...g, count: values.length, fit, meanPopLow: d3.mean(low, (d) => d.popularity), meanPopHigh: d3.mean(high, (d) => d.popularity) };
  });
}
