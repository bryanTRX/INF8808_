import * as d3 from 'd3';
import type { Lang } from '../../core/services/lang.service';
import { TrackRow } from '../../core/models/track-row';
import { CHART, styleAxis } from '../../viz-shared/utils/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

export const MAJOR_GENRES = ['pop', 'rock', 'hip-hop', 'electronic', 'dance', 'indie', 'r&b', 'country', 'jazz', 'classical', 'latin', 'metal'] as const;
export type MajorGenre = (typeof MAJOR_GENRES)[number];

const GENRE_LABELS_FR: Record<MajorGenre, string> = { pop: 'Pop', rock: 'Rock', 'hip-hop': 'Hip-Hop', electronic: 'Électronique', dance: 'Dance', indie: 'Indie', 'r&b': 'R&B', country: 'Country', jazz: 'Jazz', classical: 'Classique', latin: 'Latin', metal: 'Métal' };
const GENRE_LABELS_EN: Record<MajorGenre, string> = { pop: 'Pop', rock: 'Rock', 'hip-hop': 'Hip-Hop', electronic: 'Electronic', dance: 'Dance', indie: 'Indie', 'r&b': 'R&B', country: 'Country', jazz: 'Jazz', classical: 'Classical', latin: 'Latin', metal: 'Metal' };
export const GENRE_LABELS = GENRE_LABELS_FR;

const L = (lang: Lang) => lang === 'fr' ? {
  genreLabels: GENRE_LABELS_FR, noGenre: 'Sélectionnez au moins un genre.',
  tracks: 'titres', axisY: 'Dansabilité', axisX: 'Tempo (BPM)',
  tip: { genre: 'Genre', pop: 'popularité', tempo: 'Tempo', dance: 'Dansabilité' },
} : {
  genreLabels: GENRE_LABELS_EN, noGenre: 'Select at least one genre.',
  tracks: 'tracks', axisY: 'Danceability', axisX: 'Tempo (BPM)',
  tip: { genre: 'Genre', pop: 'popularity', tempo: 'Tempo', dance: 'Danceability' },
};

const GENRE_COLORS = d3.scaleOrdinal<MajorGenre, string>()
  .domain([...MAJOR_GENRES])
  .range(['#2f80ed', '#d1495b', '#1b998b', '#8f63c7', '#f2a541', '#537a5a', '#ef476f', '#7f5539', '#118ab2', '#6c757d', '#e76f51', '#343a40']);

interface ParsedTrack { trackId: string; artists: string; trackName: string; popularity: number; tempo: number; danceability: number; genre: MajorGenre }

export interface Viz05State { selectedGenres: Set<MajorGenre>; sampleSize: number; sharedScales: boolean; search: string }
export interface Viz05Chart { update: (s: Viz05State) => void; setLang: (l: Lang) => void; resize: () => void; destroy: () => void }

function classifyGenre(raw: unknown): MajorGenre | null {
  const tokens = String(raw || '').toLowerCase().split(';').map((t) => t.trim());
  if (tokens.some((t) => t.includes('hip-hop') || t.includes('hip hop'))) return 'hip-hop';
  if (tokens.some((t) => t === 'r-n-b' || t === 'r&b' || t.includes('soul'))) return 'r&b';
  for (const g of MAJOR_GENRES) { if (tokens.some((t) => t.includes(g))) return g; }
  return null;
}
function linReg(data: ParsedTrack[]) {
  if (data.length < 2) return null;
  const mx = d3.mean(data, (d) => d.tempo)!, my = d3.mean(data, (d) => d.danceability)!;
  const num = d3.sum(data, (d) => (d.tempo - mx) * (d.danceability - my));
  const xV = d3.sum(data, (d) => (d.tempo - mx) ** 2), yV = d3.sum(data, (d) => (d.danceability - my) ** 2);
  if (xV === 0 || yV === 0) return null;
  const slope = num / xV;
  return { slope, intercept: my - slope * mx, r: num / Math.sqrt(xV * yV) };
}
function sample<T>(arr: T[], n: number): T[] { if (arr.length <= n) return arr; const step = arr.length / n; return d3.range(n).map((i) => arr[Math.floor(i * step)]); }

export function createViz05Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz05Chart {
  let _lang = initLang;
  const tracks = rows.map((r): ParsedTrack | null => {
    const tempo = Number(r.tempo), danceability = Number(r.danceability);
    if (!Number.isFinite(tempo) || !Number.isFinite(danceability)) return null;
    const genre = classifyGenre(r.track_genre);
    if (!genre) return null;
    return { trackId: String(r.track_id || ''), artists: String(r.artists || ''), trackName: String(r.track_name || ''), popularity: Number(r.popularity), tempo, danceability, genre };
  }).filter((d): d is ParsedTrack => d !== null);

  let state: Viz05State = { selectedGenres: new Set(['pop', 'rock', 'hip-hop', 'electronic', 'dance', 'latin'] as MajorGenre[]), sampleSize: 500, sharedScales: true, search: '' };

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const selected = MAJOR_GENRES.filter((g) => state.selectedGenres.has(g));
    const facets = d3.groups(tracks.filter((d) => selected.includes(d.genre)), (d) => d.genre).sort((a, b) => selected.indexOf(a[0]) - selected.indexOf(b[0]));
    if (!facets.length) { container.innerHTML = `<p class="status">${lbl.noGenre}</p>`; return; }

    const cols = facets.length >= 3 ? 3 : facets.length, rows2 = Math.ceil(facets.length / cols);
    const width = Math.max(container.clientWidth || 900, 720);
    const fW = width / cols, fH = 260, height = rows2 * fH + 8;
    const m = { top: 40, right: 18, bottom: 46, left: 52 };
    const allV = facets.flatMap(([, v]) => v);
    const xDom = state.sharedScales ? d3.extent(allV, (d) => d.tempo) as [number, number] : null;
    const yDom = state.sharedScales ? [0, 1] as [number, number] : null;
    const srch = state.search.toLowerCase();

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

    facets.forEach(([genre, values], idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const iW = fW - m.left - m.right, iH = fH - m.top - m.bottom;
      const pts = sample(values, state.sampleSize);
      const color = GENRE_COLORS(genre);
      const xSc = d3.scaleLinear().domain(xDom || d3.extent(values, (d) => d.tempo) as [number, number]).nice().range([0, iW]);
      const ySc = d3.scaleLinear().domain(yDom || d3.extent(values, (d) => d.danceability) as [number, number]).nice().range([iH, 0]);
      const facet = svg.append('g').attr('transform', `translate(${col * fW + m.left},${row * fH + m.top})`);

      facet.insert('rect', ':first-child').attr('x', -6).attr('y', -28).attr('width', iW + 12).attr('height', iH + 36).attr('rx', 8).attr('fill', '#1a1a1a').attr('stroke', '#2a2a2a');
      facet.append('text').attr('y', -12).attr('fill', color).attr('font-size', 11).attr('font-weight', 600)
        .text(`${lbl.genreLabels[genre]} · ${d3.format(',')(values.length)} ${lbl.tracks}`);

      facet.append('g').attr('class', 'grid').call(d3.axisLeft(ySc).ticks(4).tickSize(-iW).tickFormat(() => ''));
      const xAx = facet.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`).call(d3.axisBottom(xSc).ticks(4));
      const yAx = facet.append('g').attr('class', 'axis').call(d3.axisLeft(ySc).ticks(4));
      styleAxis(xAx as never); styleAxis(yAx as never);
      if (col === 0) facet.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -iH / 2).attr('y', -40).attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(lbl.axisY);
      if (row === rows2 - 1) facet.append('text').attr('class', 'axis-label').attr('x', iW / 2).attr('y', iH + 36).attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(lbl.axisX);

      const matches = (d: ParsedTrack) => !!srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch);
      facet.selectAll('.point').data(pts, (d) => (d as ParsedTrack).trackId).join('circle')
        .attr('cx', (d) => xSc(d.tempo)).attr('cy', (d) => ySc(d.danceability))
        .attr('r', (d) => matches(d) ? 4.5 : 2.6).attr('fill', color)
        .attr('opacity', (d) => srch ? (matches(d) ? 0.95 : 0.06) : 0.48)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', 5.5).attr('opacity', 1);
          tip.show(event, `<div><strong>${d.trackName}</strong></div><div class="muted">${d.artists}</div>
             <div>${lbl.genreLabels[d.genre]} · ${lbl.tip.pop} ${d.popularity}</div>
             <div>${lbl.tip.tempo} : <span class="tooltip-value">${d3.format('.1f')(d.tempo)} BPM</span></div>
             <div>${lbl.tip.dance} : <span class="tooltip-value">${d3.format('.2f')(d.danceability)}</span></div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseleave', function (_, d) { d3.select(this).attr('r', matches(d) ? 4.5 : 2.6).attr('opacity', srch ? (matches(d) ? 0.95 : 0.06) : 0.48); tip.hide(); });

      const fit = linReg(values);
      if (fit) {
        facet.append('path').datum(xSc.domain().map((x) => ({ x, y: fit.intercept + fit.slope * x }))).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2)
          .attr('d', d3.line<{ x: number; y: number }>().x((d) => xSc(d.x)).y((d) => ySc(d.y)).defined((d) => Number.isFinite(d.y)));
        facet.append('text').attr('x', iW - 4).attr('y', 10).attr('text-anchor', 'end').attr('fill', color).attr('font-size', 11).attr('font-weight', 700).text(`r = ${d3.format('+.2f')(fit.r)}`);
      }
    });
  }

  render();
  return { update(s) { state = s; render(); }, setLang(l) { _lang = l; render(); }, resize: render, destroy: () => { container.innerHTML = ''; } };
}

export { GENRE_COLORS as COLOR_SCALE };
