import * as d3 from 'd3';
import type { Lang } from '../../core/services/lang.service';
import { TrackRow } from '../../core/models/track-row';
import { CHART, styleAxis } from '../../viz-shared/utils/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

const GENRES = [{ id: 'pop' as const, label: 'Pop', color: '#2f80ed' }, { id: 'rock' as const, label: 'Rock', color: '#d1495b' }];

const L = (lang: Lang) => lang === 'fr' ? {
  tracks: 'titres', axisY: 'Popularité (0–100)',
  axisX: 'Acoustique (0 = électrique · 1 = acoustique)',
  labels: { low: 'peu acoustique', mid: 'mixte', high: 'très acoustique' },
  legend: ['Tendance (régression)', 'Moyenne par tranche'],
  tip: { acoustic: 'Acoustique', pop: 'Popularité' },
} : {
  tracks: 'tracks', axisY: 'Popularity (0–100)',
  axisX: 'Acousticness (0 = electric · 1 = acoustic)',
  labels: { low: 'non-acoustic', mid: 'mixed', high: 'very acoustic' },
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
    const facets = GENRES.map((g) => [g, byGenre[g.id]] as const).filter(([, v]) => v.length);
    const width = Math.max(container.clientWidth || 900, 720);
    const fW = width / 2, fH = 400, height = fH + 8;
    const m = { top: 48, right: 24, bottom: 52, left: 60 };
    const allV = facets.flatMap(([, v]) => v);
    const xDom = state.sharedScales ? [0, 1] as [number, number] : null;
    const yDom = state.sharedScales ? [0, d3.max(allV, (d) => d.popularity) || 100] as [number, number] : null;
    const srch = state.search.toLowerCase();
    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

    facets.forEach(([meta, values], idx) => {
      const iW = fW - m.left - m.right, iH = fH - m.top - m.bottom;
      const pts = sample(values, state.sampleSize);
      const xSc = d3.scaleLinear().domain(xDom || d3.extent(values, (d) => d.acousticness) as [number, number]).nice().range([0, iW]);
      const ySc = d3.scaleLinear().domain(yDom || d3.extent(values, (d) => d.popularity) as [number, number]).nice().range([iH, 0]);
      const facet = svg.append('g').attr('transform', `translate(${idx * fW + m.left},${m.top})`);
      facet.insert('rect', ':first-child').attr('x', -8).attr('y', -32).attr('width', iW + 16).attr('height', iH + 44).attr('rx', 8).attr('fill', '#1a1a1a').attr('stroke', '#2a2a2a');
      facet.append('text').attr('y', -14).attr('fill', meta.color).attr('font-size', 12).attr('font-weight', 600).text(`${meta.label} · ${d3.format(',')(values.length)} ${lbl.tracks}`);
      facet.append('g').attr('class', 'grid').call(d3.axisLeft(ySc).ticks(5).tickSize(-iW).tickFormat(() => ''));
      const xAx = facet.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`).call(d3.axisBottom(xSc).ticks(5));
      const yAx = facet.append('g').attr('class', 'axis').call(d3.axisLeft(ySc).ticks(5));
      styleAxis(xAx as never); styleAxis(yAx as never);
      if (idx === 0) facet.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -iH / 2).attr('y', -46).attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(lbl.axisY);
      facet.append('text').attr('class', 'axis-label').attr('x', iW / 2).attr('y', iH + 42).attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(lbl.axisX);

      const matches = (d: ParsedTrack) => !!srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch);
      facet.selectAll('.point').data(pts, (d) => (d as ParsedTrack).trackId).join('circle')
        .attr('cx', (d) => xSc(d.acousticness)).attr('cy', (d) => ySc(d.popularity))
        .attr('r', (d) => matches(d) ? 4.5 : 2.8).attr('fill', meta.color)
        .attr('opacity', (d) => srch ? (matches(d) ? 0.95 : 0.07) : 0.48)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', 5.5).attr('opacity', 1);
          const label = d.acousticness < 0.33 ? lbl.labels.low : d.acousticness > 0.66 ? lbl.labels.high : lbl.labels.mid;
          tip.show(event, `<div><strong>${d.trackName}</strong></div><div class="muted">${d.artists}</div><div>${meta.label}</div>
             <div>${lbl.tip.acoustic} : <span class="tooltip-value">${d3.format('.2f')(d.acousticness)}</span> (${label})</div>
             <div>${lbl.tip.pop} : <span class="tooltip-value">${d3.format('.0f')(d.popularity)}</span></div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseleave', function (_, d) { d3.select(this).attr('r', matches(d) ? 4.5 : 2.8).attr('opacity', srch ? (matches(d) ? 0.95 : 0.07) : 0.48); tip.hide(); });

      const fit = linReg(values);
      if (fit) {
        facet.append('path').datum(xSc.domain().map((x) => ({ x, y: fit.intercept + fit.slope * x }))).attr('fill', 'none').attr('stroke', meta.color).attr('stroke-width', 2)
          .attr('d', d3.line<{ x: number; y: number }>().x((d) => xSc(d.x)).y((d) => ySc(d.y)).defined((d) => Number.isFinite(d.y)));
        facet.append('text').attr('x', iW - 4).attr('y', 14).attr('text-anchor', 'end').attr('fill', meta.color).attr('font-size', 11).attr('font-weight', 700).text(`r = ${d3.format('+.2f')(fit.r)}`);
      }
      facet.append('path').datum(binnedMeans(values, 8)).attr('fill', 'none').attr('stroke', meta.color).attr('stroke-width', 2).attr('stroke-dasharray', '5,3')
        .attr('d', d3.line<{ x: number; y: number }>().x((d) => xSc(d.x)).y((d) => ySc(d.y)));
      const legendY = iH - 36;
      lbl.legend.forEach((label, li) => {
        const lg = facet.append('g').attr('transform', `translate(4,${legendY + li * 16})`);
        lg.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 5).attr('y2', 5).attr('stroke', meta.color).attr('stroke-width', 1.5).attr('stroke-dasharray', li === 1 ? '5,3' : null);
        lg.append('text').attr('x', 27).attr('y', 9).attr('fill', CHART.muted).attr('font-size', 9).text(label);
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
