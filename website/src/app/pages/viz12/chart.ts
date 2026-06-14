import type { Lang } from '../../core/services/lang.service';
import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { CHART, styleAxis } from '../../viz-shared/utils/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

const GENRE_COLORS: Record<string, string> = {
  pop: '#2f80ed', rock: '#d1495b', 'hip-hop': '#1b998b', electronic: '#8f63c7',
  dance: '#f2a541', indie: '#537a5a', 'r&b': '#ef476f', country: '#7f5539',
  jazz: '#118ab2', classical: '#6c757d', latin: '#e76f51', metal: '#343a40',
  other: '#888888',
};

function classifyGenre(raw: unknown): string {
  const tokens = String(raw || '').toLowerCase().split(';').map((t) => t.trim());
  if (tokens.some((t) => t.includes('hip-hop') || t.includes('hip hop'))) return 'hip-hop';
  if (tokens.some((t) => t === 'r-n-b' || t === 'r&b' || t.includes('soul'))) return 'r&b';
  for (const g of Object.keys(GENRE_COLORS).filter((k) => k !== 'other')) {
    if (tokens.some((t) => t.includes(g))) return g;
  }
  return 'other';
}

interface BeePoint {
  trackId: string;
  trackName: string;
  artists: string;
  popularity: number;
  genre: string;
  y: number;
}

export type BeeGrouping = 'none' | 'genre';

export interface Viz12State {
  groupBy: BeeGrouping;
  sampleSize: number;
  search: string;
}

const L = (lang: Lang) => lang === 'fr' ? {
  titleAll: (n: number) => `Distribution de la popularité — ${n} titres`,
  hintAll: 'Chaque point = un titre · Position = score de popularité Spotify (0–100)',
  titleGenre: (n: number) => `Popularité par genre — ${n} titres`,
  hintGenre: 'Une ligne par genre · Horizontal = popularité',
  axisX: 'Popularité Spotify (0 = inconnu · 100 = mondial)',
  tip: { genre: 'Genre', pop: 'Popularité' },
} : {
  titleAll: (n: number) => `Popularity Distribution — ${n} tracks`,
  hintAll: 'Each dot = one track · Position = Spotify popularity score (0–100)',
  titleGenre: (n: number) => `Popularity by Genre — ${n} tracks`,
  hintGenre: 'One row per genre · Horizontal = popularity',
  axisX: 'Spotify Popularity (0 = unknown · 100 = global)',
  tip: { genre: 'Genre', pop: 'Popularity' },
};

export interface Viz12Chart {
  update: (s: Viz12State) => void;
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

function dodge(points: BeePoint[], radius: number, x: (p: BeePoint) => number): void {
  const sorted = points.slice().sort((a, b) => a.popularity - b.popularity);
  const placed: { cx: number; cy: number }[] = [];
  const r2 = radius * 2;

  sorted.forEach((p) => {
    const cx = x(p);
    let cy = 0;
    let row = 0;
    while (true) {
      const cy1 = row === 0 ? 0 : (row % 2 === 0 ? 1 : -1) * Math.ceil(row / 2) * r2;
      const ok = placed.every(({ cx: ox, cy: oy }) => {
        const dx = cx - ox, dy = cy1 - oy;
        return dx * dx + dy * dy >= r2 * r2;
      });
      if (ok) { cy = cy1; break; }
      row++;
      if (row > 200) break;
    }
    p.y = cy;
    placed.push({ cx, cy });
  });
}

export function createViz12Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz12Chart {
  let _lang = initLang;
  const allPoints: BeePoint[] = rows
    .map((r): BeePoint | null => {
      const popularity = Number(r.popularity);
      if (!Number.isFinite(popularity)) return null;
      return {
        trackId: String(r.track_id || ''),
        trackName: String(r.track_name || ''),
        artists: String(r.artists || ''),
        popularity,
        genre: classifyGenre(r.track_genre),
        y: 0,
      };
    })
    .filter((d): d is BeePoint => d !== null);

  let state: Viz12State = { groupBy: 'none', sampleSize: 3000, search: '' };

  function sample<T>(arr: T[], n: number): T[] {
    if (arr.length <= n) return arr;
    const step = arr.length / n;
    return d3.range(n).map((i) => arr[Math.floor(i * step)]);
  }

  function render() {
    container.innerHTML = '';
    const lbl  = L(_lang);
    const srch   = state.search.toLowerCase();
    const pts    = sample(allPoints, state.sampleSize);
    const radius = 2.8;

    if (state.groupBy === 'none') {
      const width  = Math.max(640, container.clientWidth || 900);
      const margin = { top: 64, right: 40, bottom: 52, left: 40 };
      const iW     = width - margin.left - margin.right;

      const x = d3.scaleLinear().domain([0, 100]).range([0, iW]);
      dodge(pts, radius, (p) => x(p.popularity));
      const yExt = d3.extent(pts, (p) => p.y) as [number, number];
      const bandH = Math.abs(yExt[0]) + Math.abs(yExt[1]) + radius * 6;
      const height = margin.top + bandH + margin.bottom;

      const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
      const g   = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + Math.abs(yExt[0]) + radius * 3})`);

      svg.append('text').attr('x', margin.left).attr('y', 22).attr('fill', CHART.text).attr('font-size', 15).attr('font-weight', 700).text(lbl.titleAll(pts.length));
      svg.append('text').attr('x', margin.left).attr('y', 40).attr('fill', CHART.muted).attr('font-size', 11).text(lbl.hintAll);

      const xAx = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${bandH / 2})`).call(d3.axisBottom(x).ticks(10));
      styleAxis(xAx as never);
      g.append('text').attr('class', 'axis-label').attr('x', iW / 2).attr('y', bandH / 2 + 36).attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(lbl.axisX);

      g.selectAll('.bee').data(pts, (d) => (d as BeePoint).trackId).join('circle')
        .attr('cx', (d) => x(d.popularity)).attr('cy', (d) => d.y)
        .attr('r', (d) => srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch) ? 4.5 : radius)
        .attr('fill', (d) => GENRE_COLORS[d.genre] || GENRE_COLORS['other'])
        .attr('opacity', (d) => srch ? (`${d.trackName} ${d.artists}`.toLowerCase().includes(srch) ? 0.95 : 0.06) : 0.52)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', 5.5).attr('opacity', 1);
          tip.show(event,
            `<div><strong>${d.trackName}</strong></div>
             <div class="muted">${d.artists}</div>
             <div>${lbl.tip.genre} : ${d.genre}</div>
             <div>${lbl.tip.pop} : <span class="tooltip-value">${d.popularity}</span>/100</div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseleave', function (_, d) {
          const isMatch = srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch);
          d3.select(this).attr('r', isMatch ? 4.5 : radius).attr('opacity', srch ? (isMatch ? 0.95 : 0.06) : 0.52);
          tip.hide();
        });

      const legendG = svg.append('g').attr('transform', `translate(${margin.left}, ${height - margin.bottom + 18})`);
      Object.entries(GENRE_COLORS).filter(([k]) => k !== 'other').forEach(([genre, color], i) => {
        const col = legendG.append('g').attr('transform', `translate(${i * 76}, 0)`);
        col.append('circle').attr('cx', 5).attr('cy', 5).attr('r', 4).attr('fill', color);
        col.append('text').attr('x', 13).attr('y', 9).attr('font-size', 9).attr('fill', CHART.muted).text(genre);
      });

    } else {
      const genres  = Object.keys(GENRE_COLORS).filter((k) => k !== 'other');
      const grouped = d3.group(pts, (d) => d.genre);
      const rowH    = 64;
      const width   = Math.max(640, container.clientWidth || 900);
      const margin  = { top: 64, right: 40, bottom: 24, left: 96 };
      const iW      = width - margin.left - margin.right;
      const height  = margin.top + genres.length * rowH + margin.bottom;

      const x = d3.scaleLinear().domain([0, 100]).range([0, iW]);
      const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

      svg.append('text').attr('x', margin.left).attr('y', 22).attr('fill', CHART.text).attr('font-size', 15).attr('font-weight', 700).text(lbl.titleGenre(pts.length));
      svg.append('text').attr('x', margin.left).attr('y', 40).attr('fill', CHART.muted).attr('font-size', 11).text(lbl.hintGenre);

      genres.forEach((genre, gi) => {
        const gPts = grouped.get(genre) || [];
        const midY = margin.top + gi * rowH + rowH / 2;
        const color = GENRE_COLORS[genre];

        svg.append('text')
          .attr('x', margin.left - 8).attr('y', midY + 4)
          .attr('text-anchor', 'end').attr('fill', color)
          .attr('font-size', 11).attr('font-weight', 600)
          .text(genre);

        svg.append('line')
          .attr('x1', margin.left).attr('x2', margin.left + iW)
          .attr('y1', midY).attr('y2', midY)
          .attr('stroke', CHART.axis).attr('opacity', 0.4);

        dodge(gPts, 2.5, (p) => x(p.popularity));
        svg.selectAll(`.bee-${gi}`).data(gPts).join('circle')
          .attr('cx', (d) => margin.left + x(d.popularity))
          .attr('cy', (d) => midY + d.y)
          .attr('r', 2.5).attr('fill', color).attr('opacity', 0.55)
          .on('mouseenter', function (event, d) {
            d3.select(this).attr('r', 4.5).attr('opacity', 1);
            tip.show(event,
              `<div><strong>${d.trackName}</strong></div>
               <div class="muted">${d.artists}</div>
               <div>Popularité : <span class="tooltip-value">${d.popularity}</span>/100</div>`);
          })
          .on('mousemove', (event) => tip.move(event))
          .on('mouseleave', function () { d3.select(this).attr('r', 2.5).attr('opacity', 0.55); tip.hide(); });
      });

      const xAx = svg.append('g').attr('class', 'axis')
        .attr('transform', `translate(${margin.left},${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(10));
      styleAxis(xAx as never);
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
