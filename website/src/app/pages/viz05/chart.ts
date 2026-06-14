import * as d3 from 'd3';
import type { Lang } from '../../core/services/lang.service';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Genre definitions ────────────────────────────────────────────────────────
// Colors align with GENRE_FAMILIES in genre-families.ts for visual consistency

export const MAJOR_GENRES = [
  'pop', 'rock', 'hip-hop', 'electronic', 'dance',
  'indie', 'r&b', 'country', 'jazz', 'classical', 'latin', 'metal',
] as const;

export type MajorGenre = (typeof MAJOR_GENRES)[number];

// Map each genre to a color consistent with the family palette
const GENRE_COLOR_MAP: Record<MajorGenre, string> = {
  pop:        '#4e9af1', // Pop family
  rock:       '#e05252', // Rock/Metal
  'hip-hop':  '#f59e0b', // Hip-hop/Rap
  electronic: '#a855f7', // Electronic/Dance
  dance:      '#9333ea', // Electronic/Dance (darker)
  indie:      '#60a5fa', // Pop adjacent
  'r&b':      '#ec4899', // R&B/Soul
  country:    '#65a30d', // Folk/Acoustic
  jazz:       '#0891b2', // Jazz/Blues
  classical:  '#10b981', // Classical/Instrumental
  latin:      '#f97316', // Latin/World
  metal:      '#b91c1c', // Rock/Metal (darker)
};

const GENRE_LABELS_FR: Record<MajorGenre, string> = {
  pop: 'Pop', rock: 'Rock', 'hip-hop': 'Hip-Hop', electronic: 'Électronique',
  dance: 'Dance', indie: 'Indie', 'r&b': 'R&B', country: 'Country',
  jazz: 'Jazz', classical: 'Classique', latin: 'Latin', metal: 'Métal',
};
const GENRE_LABELS_EN: Record<MajorGenre, string> = {
  pop: 'Pop', rock: 'Rock', 'hip-hop': 'Hip-Hop', electronic: 'Electronic',
  dance: 'Dance', indie: 'Indie', 'r&b': 'R&B', country: 'Country',
  jazz: 'Jazz', classical: 'Classical', latin: 'Latin', metal: 'Metal',
};

export const GENRE_LABELS = GENRE_LABELS_EN;

const L = (lang: Lang) =>
  lang === 'fr'
    ? {
        genreLabels: GENRE_LABELS_FR,
        noGenre: 'Sélectionnez au moins un genre.',
        tracks: 'titres',
        axisY: 'Dansabilité',
        axisX: 'Tempo (BPM)',
        sampleLabel: 'Échantillon',
        sharedLabel: 'Axes partagés',
        searchLabel: 'Recherche',
        resetLabel: 'Réinitialiser',
        tip: { pop: 'Popularité', tempo: 'Tempo', dance: 'Dansabilité' },
      }
    : {
        genreLabels: GENRE_LABELS_EN,
        noGenre: 'Select at least one genre.',
        tracks: 'tracks',
        axisY: 'Danceability',
        axisX: 'Tempo (BPM)',
        sampleLabel: 'Sample size',
        sharedLabel: 'Shared axes',
        searchLabel: 'Search',
        resetLabel: 'Reset',
        tip: { pop: 'Popularity', tempo: 'Tempo', dance: 'Danceability' },
      };

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedTrack {
  trackId: string;
  artists: string;
  trackName: string;
  popularity: number;
  tempo: number;
  danceability: number;
  genre: MajorGenre;
}

export interface Viz05State {
  selectedGenres: Set<MajorGenre>;
  sampleSize: number;
  sharedScales: boolean;
  search: string;
}

export interface Viz05Chart {
  update: (s: Viz05State) => void;
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyGenre(raw: unknown): MajorGenre | null {
  const tokens = String(raw || '')
    .toLowerCase()
    .split(';')
    .map((t) => t.trim());
  if (tokens.some((t) => t.includes('hip-hop') || t.includes('hip hop'))) return 'hip-hop';
  if (tokens.some((t) => t === 'r-n-b' || t === 'r&b' || t.includes('soul'))) return 'r&b';
  for (const g of MAJOR_GENRES) {
    if (tokens.some((t) => t.includes(g))) return g;
  }
  return null;
}

function linReg(data: ParsedTrack[]) {
  if (data.length < 2) return null;
  const mx = d3.mean(data, (d) => d.tempo)!;
  const my = d3.mean(data, (d) => d.danceability)!;
  const num = d3.sum(data, (d) => (d.tempo - mx) * (d.danceability - my));
  const xV = d3.sum(data, (d) => (d.tempo - mx) ** 2);
  const yV = d3.sum(data, (d) => (d.danceability - my) ** 2);
  if (xV === 0 || yV === 0) return null;
  const slope = num / xV;
  return { slope, intercept: my - slope * mx, r: num / Math.sqrt(xV * yV) };
}

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return d3.range(n).map((i) => arr[Math.floor(i * step)]);
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function createViz05Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  initLang: Lang = 'en',
): Viz05Chart {
  let _lang = initLang;

  const tracks = rows
    .map((r): ParsedTrack | null => {
      const tempo = Number(r.tempo);
      const danceability = Number(r.danceability);
      if (!Number.isFinite(tempo) || !Number.isFinite(danceability)) return null;
      const genre = classifyGenre(r.track_genre);
      if (!genre) return null;
      return {
        trackId: String(r.track_id || ''),
        artists: String(r.artists || ''),
        trackName: String(r.track_name || ''),
        popularity: Number(r.popularity),
        tempo,
        danceability,
        genre,
      };
    })
    .filter((d): d is ParsedTrack => d !== null);

  let state: Viz05State = {
    selectedGenres: new Set<MajorGenre>(['pop', 'rock', 'hip-hop', 'electronic', 'dance', 'latin']),
    sampleSize: 500,
    sharedScales: true,
    search: '',
  };

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const theme = getChartTheme();

    const selected = MAJOR_GENRES.filter((g) => state.selectedGenres.has(g));
    const facets = d3
      .groups(
        tracks.filter((d) => selected.includes(d.genre)),
        (d) => d.genre,
      )
      .sort((a, b) => selected.indexOf(a[0]) - selected.indexOf(b[0]));

    if (!facets.length) {
      container.innerHTML = `<p class="status">${lbl.noGenre}</p>`;
      return;
    }

    const cols = facets.length >= 3 ? 3 : facets.length;
    const rowCount = Math.ceil(facets.length / cols);
    const width = Math.max(container.clientWidth || 900, 640);
    const fW = width / cols;
    const fH = 270;
    const height = rowCount * fH + 8;
    const m = { top: 42, right: 18, bottom: 48, left: 52 };

    const allV = facets.flatMap(([, v]) => v);
    const xDom = state.sharedScales
      ? (d3.extent(allV, (d) => d.tempo) as [number, number])
      : null;
    const yDom = state.sharedScales ? ([0, 1] as [number, number]) : null;
    const srch = state.search.toLowerCase();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    facets.forEach(([genre, values], idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const iW = fW - m.left - m.right;
      const iH = fH - m.top - m.bottom;
      const pts = sample(values, state.sampleSize);
      const color = GENRE_COLOR_MAP[genre];

      const xSc = d3
        .scaleLinear()
        .domain(xDom ?? (d3.extent(values, (d) => d.tempo) as [number, number]))
        .nice()
        .range([0, iW]);
      const ySc = d3
        .scaleLinear()
        .domain(yDom ?? (d3.extent(values, (d) => d.danceability) as [number, number]))
        .nice()
        .range([iH, 0]);

      const facet = svg
        .append('g')
        .attr('transform', `translate(${col * fW + m.left},${row * fH + m.top})`);

      // Facet background — theme-aware
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

      // Facet title
      facet
        .append('text')
        .attr('y', -18)
        .attr('fill', color)
        .style('font-size', '11px')
        .style('font-weight', '700')
        .text(`${lbl.genreLabels[genre]}  ·  ${d3.format(',')(values.length)} ${lbl.tracks}`);

      // Grid lines
      facet
        .append('g')
        .attr('class', 'grid')
        .call(
          d3
            .axisLeft(ySc)
            .ticks(4)
            .tickSize(-iW)
            .tickFormat(() => ''),
        )
        .selectAll('line')
        .attr('stroke', theme.border)
        .attr('stroke-opacity', 0.4);

      facet.select('.grid .domain').remove();

      // Axes
      facet
        .append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${iH})`)
        .call(d3.axisBottom(xSc).ticks(4));

      facet.append('g').attr('class', 'axis').call(d3.axisLeft(ySc).ticks(4));

      // Axis labels (only on outer facets)
      if (col === 0) {
        facet
          .append('text')
          .attr('class', 'axis-label')
          .attr('transform', 'rotate(-90)')
          .attr('x', -iH / 2)
          .attr('y', -40)
          .attr('text-anchor', 'middle')
          .text(lbl.axisY);
      }
      if (row === rowCount - 1) {
        facet
          .append('text')
          .attr('class', 'axis-label')
          .attr('x', iW / 2)
          .attr('y', iH + 38)
          .attr('text-anchor', 'middle')
          .text(lbl.axisX);
      }

      // Points
      const matches = (d: ParsedTrack) =>
        !!srch && `${d.trackName} ${d.artists}`.toLowerCase().includes(srch);

      facet
        .selectAll<SVGCircleElement, ParsedTrack>('.point')
        .data(pts, (d) => d.trackId)
        .join('circle')
        .attr('class', 'point')
        .attr('cx', (d) => xSc(d.tempo))
        .attr('cy', (d) => ySc(d.danceability))
        .attr('r', (d) => (matches(d) ? 5 : 2.8))
        .attr('fill', color)
        .attr('opacity', (d) =>
          srch ? (matches(d) ? 0.95 : 0.06) : 0.42,
        )
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', 6).attr('opacity', 1);
          tip.show(
            event,
            `<div style="margin-bottom:0.35rem">
              <strong style="font-size:0.9rem">${d.trackName}</strong>
            </div>
            <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.45rem">${d.artists}</div>
            <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${lbl.tip.tempo}</span>
                <span class="tooltip-value">${d3.format('.1f')(d.tempo)} BPM</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${lbl.tip.dance}</span>
                <span class="tooltip-value">${d3.format('.2f')(d.danceability)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${lbl.tip.pop}</span>
                <span class="tooltip-value">${d.popularity}</span>
              </div>
            </div>`,
          );
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseleave', function (_, d) {
          d3.select(this)
            .attr('r', matches(d) ? 5 : 2.8)
            .attr('opacity', srch ? (matches(d) ? 0.95 : 0.06) : 0.42);
          tip.hide();
        });

      // Regression line — dashed, using full dataset (not sample)
      const fit = linReg(values);
      if (fit) {
        facet
          .append('path')
          .datum(xSc.domain().map((x) => ({ x, y: fit.intercept + fit.slope * x })))
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.8)
          .attr('stroke-dasharray', '5,4')
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0.85)
          .attr(
            'd',
            d3
              .line<{ x: number; y: number }>()
              .x((d) => xSc(d.x))
              .y((d) => ySc(d.y))
              .defined((d) => Number.isFinite(d.y)),
          );

        // Pearson r badge
        const rText = `r = ${d3.format('+.2f')(fit.r)}`;
        const badgeW = rText.length * 7.2 + 10;
        const badgeG = facet.append('g').attr('transform', `translate(${iW - badgeW - 2},2)`);

        badgeG
          .append('rect')
          .attr('width', badgeW)
          .attr('height', 18)
          .attr('rx', 3)
          .attr('fill', theme.panel)
          .attr('stroke', color)
          .attr('stroke-width', 1)
          .attr('opacity', 0.9);

        badgeG
          .append('text')
          .attr('x', 5)
          .attr('y', 13)
          .attr('fill', color)
          .style('font-size', '10.5px')
          .style('font-weight', '700')
          .text(rText);
      }
    });
  }

  render();

  return {
    update(s) { state = s; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}

export { GENRE_COLOR_MAP as COLOR_SCALE };
