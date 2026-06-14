import * as d3 from 'd3';
import type { Lang } from '../../core/services/lang.service';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

type AxisKind = 'unit' | 'tempo' | 'loudness' | 'popularity' | 'duration';

const RADAR_AXES: { key: string; kind: AxisKind }[] = [
  { key: 'danceability', kind: 'unit' },
  { key: 'energy', kind: 'unit' },
  { key: 'valence', kind: 'unit' },
  { key: 'acousticness', kind: 'unit' },
  { key: 'tempo', kind: 'tempo' },
  { key: 'loudness', kind: 'loudness' },
  { key: 'popularity', kind: 'popularity' },
  { key: 'durationMinutes', kind: 'duration' },
];

export type TrendMetric = 'durationMinutes' | 'valence' | 'acousticness' | 'loudness' | 'tempo' | 'popularity';

const L = (lang: Lang) => lang === 'fr' ? {
  axes: {
    danceability: 'Dansabilité',
    energy: 'Énergie',
    valence: 'Valence',
    acousticness: 'Acousticité',
    tempo: 'Tempo',
    loudness: 'Volume',
    popularity: 'Popularité',
    durationMinutes: 'Durée',
  },
  trendMetrics: [
    { key: 'durationMinutes' as TrendMetric, label: 'Durée' },
    { key: 'valence' as TrendMetric, label: 'Valence' },
    { key: 'acousticness' as TrendMetric, label: 'Acousticité' },
    { key: 'loudness' as TrendMetric, label: 'Volume' },
    { key: 'tempo' as TrendMetric, label: 'Tempo' },
    { key: 'popularity' as TrendMetric, label: 'Popularité' },
  ],
  trendTitle: (metric: string) => `Tendance : ${metric} par rang de popularité dans le catalogue`,
  rankAxis: 'Rang de popularité (1 = le plus populaire)',
  rankLabel: (rank: number, metric: string, value: string) => `Rang #${rank} · ${metric} : ${value}`,
} : {
  axes: {
    danceability: 'Danceability',
    energy: 'Energy',
    valence: 'Valence',
    acousticness: 'Acousticness',
    tempo: 'Tempo',
    loudness: 'Loudness',
    popularity: 'Popularity',
    durationMinutes: 'Duration',
  },
  trendMetrics: [
    { key: 'durationMinutes' as TrendMetric, label: 'Duration' },
    { key: 'valence' as TrendMetric, label: 'Valence' },
    { key: 'acousticness' as TrendMetric, label: 'Acousticness' },
    { key: 'loudness' as TrendMetric, label: 'Loudness' },
    { key: 'tempo' as TrendMetric, label: 'Tempo' },
    { key: 'popularity' as TrendMetric, label: 'Popularity' },
  ],
  trendTitle: (metric: string) => `Trend: ${metric} by popularity rank within catalog`,
  rankAxis: 'Popularity rank (1 = most popular)',
  rankLabel: (rank: number, metric: string, value: string) => `Rank #${rank} · ${metric}: ${value}`,
};

export const TREND_METRICS = L('en').trendMetrics;

export function getTrendMetrics(lang: Lang) {
  return L(lang).trendMetrics;
}

interface ParsedTrack {
  id: string;
  artists: string[];
  primaryArtist: string;
  trackName: string;
  popularity: number;
  durationMinutes: number;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  loudness: number;
  tempo: number;
}

export interface Performer { rank: number; name: string }

export interface Viz10State {
  selectedArtists: Set<string>;
  trendMetric: TrendMetric;
  search: string;
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function splitArtists(value: unknown) {
  return String(value || '').split(';').map((a) => a.trim()).filter(Boolean);
}

function normalizeText(v: string) { return v.trim().toLowerCase(); }

function parseTrackRow(row: TrackRow, index: number): ParsedTrack | null {
  const artists = splitArtists(row.artists);
  const track: ParsedTrack = {
    id: String(row.track_id || `row-${index}`),
    artists,
    primaryArtist: artists[0] || '',
    trackName: String(row.track_name || ''),
    popularity: Number(row.popularity),
    durationMinutes: Number(row.duration_ms) / 60000,
    danceability: Number(row.danceability),
    energy: Number(row.energy),
    valence: Number(row.valence),
    acousticness: Number(row.acousticness),
    loudness: Number(row.loudness),
    tempo: Number(row.tempo),
  };
  if (!track.primaryArtist || !Number.isFinite(track.popularity)) return null;
  if (!RADAR_AXES.every((a) => Number.isFinite(track[a.key as keyof ParsedTrack] as number))) return null;
  return track;
}

type Normalizer = (key: string, value: number) => number;

function buildNormalizer(tracks: ParsedTrack[], performers: Performer[]): Normalizer {
  const loudness = d3.extent(tracks, (d) => d.loudness) as [number, number];
  const tempo = d3.extent(tracks, (d) => d.tempo) as [number, number];
  const names = new Set(performers.map((p) => normalizeText(p.name)));
  const topTracks = tracks.filter((t) => names.has(normalizeText(t.primaryArtist)));
  const duration = d3.extent(topTracks, (d) => d.durationMinutes) as [number, number];

  return (key, value) => {
    const axis = RADAR_AXES.find((a) => a.key === key);
    if (!axis) return 0;
    if (axis.kind === 'unit') return clamp01(value);
    if (axis.kind === 'popularity') return clamp01(value / 100);
    if (axis.kind === 'loudness') return clamp01((value - loudness[0]) / (loudness[1] - loudness[0] || 1));
    if (axis.kind === 'tempo') return clamp01((value - tempo[0]) / (tempo[1] - tempo[0] || 1));
    if (axis.kind === 'duration') return clamp01((value - duration[0]) / (duration[1] - duration[0] || 1));
    return 0;
  };
}

function formatRaw(key: string, value: number) {
  const axis = RADAR_AXES.find((a) => a.key === key);
  if (!axis) return String(value);
  if (axis.kind === 'popularity') return d3.format('.0f')(value);
  if (axis.kind === 'loudness') return `${d3.format('.1f')(value)} dB`;
  if (axis.kind === 'tempo') return `${d3.format('.0f')(value)} BPM`;
  if (axis.kind === 'duration') return `${d3.format('.2f')(value)} min`;
  return d3.format('.2f')(value);
}

const ARTIST_COLORS = d3.scaleOrdinal(d3.schemeTableau10);

export interface Viz10Chart {
  update: (state: Viz10State) => void;
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function createViz10Chart(
  radarContainer: HTMLElement,
  trendContainer: HTMLElement,
  rows: TrackRow[],
  performers: Performer[],
  tip: VizTooltip,
  lang: Lang = 'fr',
): Viz10Chart {
  let _lang = lang;
  const strings = () => L(_lang);
  const tracks = rows.map(parseTrackRow).filter((d): d is ParsedTrack => d !== null);
  const normalize = buildNormalizer(tracks, performers);
  let state: Viz10State = {
    selectedArtists: new Set(performers.slice(0, 3).map((p) => p.name)),
    trendMetric: 'durationMinutes',
    search: '',
  };

  function getProfile(name: string) {
    const artistTracks = tracks.filter((t) => normalizeText(t.primaryArtist) === normalizeText(name));
    const values: Record<string, number> = {};
    const normalized: Record<string, number> = {};
    RADAR_AXES.forEach((axis) => {
      const mean = d3.mean(artistTracks, (d) => d[axis.key as keyof ParsedTrack] as number) ?? 0;
      values[axis.key] = mean;
      normalized[axis.key] = normalize(axis.key, mean);
    });
    return {
      name,
      count: artistTracks.length,
      values,
      normalized,
      meanPopularity: d3.mean(artistTracks, (d) => d.popularity) ?? 0,
      meanDuration: d3.mean(artistTracks, (d) => d.durationMinutes) ?? 0,
    };
  }

  function renderRadar() {
    radarContainer.innerHTML = '';
    const selected = performers.filter((p) => state.selectedArtists.has(p.name));
    const width = Math.max(320, radarContainer.clientWidth || 480);
    const height = Math.max(360, radarContainer.clientHeight || 420);
    const radius = Math.min(width, height) / 2 - 56;
    const cx = width / 2;
    const cy = height / 2;
    const angleSlice = (Math.PI * 2) / RADAR_AXES.length;
    const levels = [0.25, 0.5, 0.75, 1];

    const theme = getChartTheme();
    const svg = d3.select(radarContainer).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    g.selectAll('.grid').data(levels).join('circle')
      .attr('r', (d) => radius * d).attr('fill', 'none').attr('stroke', theme.border);

    const labels = strings().axes;
    RADAR_AXES.forEach((axis, i) => {
      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', radius * Math.sin(i * angleSlice))
        .attr('y2', -radius * Math.cos(i * angleSlice))
        .attr('stroke', theme.border);
      g.append('text')
        .attr('class', 'axis-label')
        .attr('x', (radius + 16) * Math.sin(i * angleSlice))
        .attr('y', -(radius + 12) * Math.cos(i * angleSlice))
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .text(labels[axis.key as keyof typeof labels]);
    });

    selected.forEach((performer, pi) => {
      const profile = getProfile(performer.name);
      if (!profile.count) return;
      const color = ARTIST_COLORS(performer.name);
      const points = RADAR_AXES.map((axis, i) => ({
        axis: labels[axis.key as keyof typeof labels],
        key: axis.key,
        value: profile.normalized[axis.key],
        raw: profile.values[axis.key],
        angle: i * angleSlice,
        artist: profile.name,
      }));

      const line = d3.lineRadial<{ angle: number; value: number }>()
        .radius((d) => radius * d.value).angle((d) => d.angle).curve(d3.curveLinearClosed);

      g.append('path').attr('d', line(points)).attr('fill', color).attr('fill-opacity', 0.12)
        .attr('stroke', color).attr('stroke-width', 2);

      g.selectAll(`.pt-${pi}`).data(points).join('circle')
        .attr('cx', (d) => radius * d.value * Math.sin(d.angle))
        .attr('cy', (d) => -radius * d.value * Math.cos(d.angle))
        .attr('r', 4).attr('fill', color)
        .on('mouseover', (event, d) => {
          tip.show(event, `<div><strong>${d.artist}</strong> · ${d.axis}</div>
            <div><span class="tooltip-value">${formatRaw(d.key, d.raw)}</span> (norm ${d3.format('.2f')(d.value)})</div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', () => tip.hide());
    });
  }

  function renderTrend() {
    trendContainer.innerHTML = '';
    const selected = performers.filter((p) => state.selectedArtists.has(p.name));
    const metric = state.trendMetric;
    const width = Math.max(480, trendContainer.clientWidth || 720);
    const height = Math.max(320, trendContainer.clientHeight || 360);
    const margin = { top: 32, right: 24, bottom: 48, left: 56 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const series = selected.map((p) => {
      const artistTracks = tracks
        .filter((t) => normalizeText(t.primaryArtist) === normalizeText(p.name))
        .sort((a, b) => d3.descending(a.popularity, b.popularity))
        .map((t, i) => ({
          rank: i + 1,
          value: t[metric as keyof ParsedTrack] as number,
          trackName: t.trackName,
          artist: p.name,
        }));
      return { name: p.name, points: artistTracks };
    }).filter((s) => s.points.length);

    const maxRank = d3.max(series, (s) => d3.max(s.points, (d) => d.rank)) || 1;
    const yExtent = d3.extent(series.flatMap((s) => s.points), (d) => d.value) as [number, number];

    const x = d3.scaleLinear().domain([1, maxRank]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yExtent).nice().range([innerHeight, 0]);

    const svg = d3.select(trendContainer).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const metricLabel = strings().trendMetrics.find((m) => m.key === metric)?.label || metric;
    g.append('text').attr('class', 'chart-title').attr('y', -12)
      .text(strings().trendTitle(metricLabel));

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(8));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));
    g.append('text').attr('class', 'axis-label').attr('x', innerWidth / 2).attr('y', innerHeight + 36)
      .attr('text-anchor', 'middle').text(strings().rankAxis);
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2).attr('y', -42).attr('text-anchor', 'middle').text(metricLabel);

    series.forEach((s) => {
      const color = ARTIST_COLORS(s.name);
      g.append('path')
        .datum(s.points)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2)
        .attr('d', d3.line<{ rank: number; value: number }>().x((d) => x(d.rank)).y((d) => y(d.value)));

      g.selectAll(null).data(s.points).join('circle')
        .attr('cx', (d) => x(d.rank)).attr('cy', (d) => y(d.value))
        .attr('r', 3).attr('fill', color)
        .on('mouseover', (event, d) => {
          tip.show(event, `<div><strong>${d.artist}</strong></div>
            <div>${d.trackName}</div>
            <div>${strings().rankLabel(d.rank, metricLabel, formatRaw(metric, d.value))}</div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', () => tip.hide());
    });
  }

  function render() {
    renderRadar();
    renderTrend();
  }

  render();
  return {
    update(s) { state = s; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { radarContainer.innerHTML = ''; trendContainer.innerHTML = ''; },
  };
}
