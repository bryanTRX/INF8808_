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
  comparisonTitle: 'Comparaison des profils audio',
  tracks: 'titres',
  clickHint: 'Cliquez sur un artiste pour l\'ajouter ou le retirer de la comparaison.',
  norm: 'norm',
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
  comparisonTitle: 'Audio Profile Comparison',
  tracks: 'tracks',
  clickHint: 'Click an artist to add or remove them from the comparison.',
  norm: 'norm',
};

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

export interface Viz10Chart {
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
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

export function createViz10Chart(
  container: HTMLElement,
  rows: TrackRow[],
  performers: Performer[],
  tip: VizTooltip,
  lang: Lang = 'fr',
): Viz10Chart {
  let _lang = lang;
  const strings = () => L(_lang);
  const tracks = rows.map(parseTrackRow).filter((d): d is ParsedTrack => d !== null);
  const normalize = buildNormalizer(tracks, performers);
  // Default: first 3 artists in comparison
  const selectedArtists = new Set<string>(performers.slice(0, 3).map((p) => p.name));

  function getProfile(name: string) {
    const artistTracks = tracks.filter((t) => normalizeText(t.primaryArtist) === normalizeText(name));
    const values: Record<string, number> = {};
    const normalized: Record<string, number> = {};
    RADAR_AXES.forEach((axis) => {
      const mean = d3.mean(artistTracks, (d) => d[axis.key as keyof ParsedTrack] as number) ?? 0;
      values[axis.key] = mean;
      normalized[axis.key] = normalize(axis.key, mean);
    });
    return { name, count: artistTracks.length, values, normalized };
  }

  function drawRadarShape(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    profile: ReturnType<typeof getProfile>,
    radius: number,
    angleSlice: number,
    color: string,
    strokeWidth: number,
    fillOpacity: number,
  ) {
    const points = RADAR_AXES.map((axis, i) => ({
      angle: i * angleSlice,
      value: profile.normalized[axis.key],
      key: axis.key,
      raw: profile.values[axis.key],
      axis: axis.key,
    }));

    const line = d3.lineRadial<{ angle: number; value: number }>()
      .radius((d) => radius * d.value).angle((d) => d.angle).curve(d3.curveLinearClosed);

    g.append('path').attr('d', line(points))
      .attr('fill', color).attr('fill-opacity', fillOpacity)
      .attr('stroke', color).attr('stroke-width', strokeWidth);
    return points;
  }

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    const lbl = strings();

    // ── Click hint ──────────────────────────────────────────────────────────
    d3.select(container).append('p')
      .style('font-size', '0.78rem').style('color', 'var(--muted)')
      .style('margin', '0 0 0.75rem').text(lbl.clickHint);

    // ── Mini-radar grid ─────────────────────────────────────────────────────
    const grid = d3.select(container).append('div')
      .style('display', 'grid')
      .style('grid-template-columns', 'repeat(auto-fill, minmax(160px, 1fr))')
      .style('gap', '10px')
      .style('margin-bottom', '1.5rem');

    performers.forEach((performer) => {
      const isSelected = selectedArtists.has(performer.name);
      const color = ARTIST_COLORS(performer.name);
      const profile = getProfile(performer.name);

      const card = grid.append('div')
        .style('border', `2px solid ${isSelected ? color : 'var(--border)'}`)
        .style('border-radius', 'var(--radius-md)')
        .style('padding', '8px 8px 6px')
        .style('cursor', 'pointer')
        .style('background', isSelected ? `${color}18` : 'var(--panel)')
        .style('transition', 'border-color 0.15s, background 0.15s')
        .on('click', () => {
          if (selectedArtists.has(performer.name)) {
            if (selectedArtists.size > 1) selectedArtists.delete(performer.name);
          } else {
            selectedArtists.add(performer.name);
          }
          render();
        })
        .on('mouseenter', function (event) {
          const rows = RADAR_AXES.map((a) =>
            `<div style="display:flex;justify-content:space-between;gap:1.2rem;line-height:1.8">
              <span style="color:var(--muted)">${lbl.axes[a.key as keyof typeof lbl.axes]}</span>
              <span class="tooltip-value">${formatRaw(a.key, profile.values[a.key])}</span>
            </div>`,
          ).join('');
          tip.show(event,
            `<div style="margin-bottom:0.4rem;display:flex;align-items:center;gap:0.5rem">
              <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
              <strong>${performer.name}</strong>
            </div>
            <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.4rem">${profile.count} ${lbl.tracks}</div>
            <div style="border-top:1px solid var(--border);padding-top:0.35rem;font-size:0.81rem">${rows}</div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseleave', () => tip.hide());

      // Mini SVG radar
      const size = 140;
      const r = size / 2 - 18;
      const cx = size / 2, cy = size / 2;
      const aSlice = (Math.PI * 2) / RADAR_AXES.length;

      const svg = card.append('svg')
        .attr('width', size).attr('height', size)
        .attr('viewBox', `0 0 ${size} ${size}`)
        .style('display', 'block').style('margin', '0 auto');
      const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

      // Grid circles
      [0.25, 0.5, 0.75, 1].forEach((lvl) => {
        g.append('circle').attr('r', r * lvl).attr('fill', 'none').attr('stroke', theme.border).attr('stroke-width', 0.5);
      });
      // Axis lines
      RADAR_AXES.forEach((_, i) => {
        g.append('line')
          .attr('x1', 0).attr('y1', 0)
          .attr('x2', r * Math.sin(i * aSlice))
          .attr('y2', -r * Math.cos(i * aSlice))
          .attr('stroke', theme.border).attr('stroke-width', 0.5);
      });

      drawRadarShape(g, profile, r, aSlice, color, 1.5, 0.2);

      // Artist name
      card.append('div')
        .style('text-align', 'center')
        .style('font-size', '0.7rem')
        .style('font-weight', '700')
        .style('color', isSelected ? color : 'var(--muted)')
        .style('margin-top', '2px')
        .style('white-space', 'nowrap')
        .style('overflow', 'hidden')
        .style('text-overflow', 'ellipsis')
        .text(`${performer.rank}. ${performer.name}`);
    });

    // ── Comparison radar ────────────────────────────────────────────────────
    const selected = performers.filter((p) => selectedArtists.has(p.name));
    const compSection = d3.select(container).append('div')
      .style('border', '1px solid var(--border)').style('border-radius', 'var(--radius-lg)')
      .style('background', 'var(--panel)').style('padding', '1rem');

    compSection.append('p')
      .style('margin', '0 0 0.5rem')
      .style('font-size', '0.85rem').style('font-weight', '600').style('color', 'var(--text-secondary)')
      .text(lbl.comparisonTitle);

    const compDiv = compSection.append('div').node()!;
    const cW = Math.max(400, container.clientWidth - 40 || 700);
    const cH = 420;
    const cRadius = Math.min(cW, cH) / 2 - 80;
    const cCx = cW / 2, cCy = cH / 2;
    const aSliceBig = (Math.PI * 2) / RADAR_AXES.length;

    const svg = d3.select(compDiv).append('svg')
      .attr('width', cW).attr('height', cH).attr('viewBox', `0 0 ${cW} ${cH}`);
    const g = svg.append('g').attr('transform', `translate(${cCx},${cCy})`);

    // Grid
    [0.25, 0.5, 0.75, 1].forEach((lvl) => {
      g.append('circle').attr('r', cRadius * lvl).attr('fill', 'none')
        .attr('stroke', theme.border).attr('stroke-width', lvl === 1 ? 1 : 0.5);
    });

    // Axes + labels
    const axisLabels = strings().axes;
    RADAR_AXES.forEach((axis, i) => {
      const ax = cRadius * Math.sin(i * aSliceBig);
      const ay = -cRadius * Math.cos(i * aSliceBig);
      g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', ax).attr('y2', ay)
        .attr('stroke', theme.border);
      const labelR = cRadius + 22;
      g.append('text').attr('class', 'axis-label')
        .attr('x', labelR * Math.sin(i * aSliceBig))
        .attr('y', -labelR * Math.cos(i * aSliceBig))
        .attr('text-anchor', 'middle').attr('font-size', 11)
        .text(axisLabels[axis.key as keyof typeof axisLabels]);
    });

    // Artist overlays
    selected.forEach((performer) => {
      const profile = getProfile(performer.name);
      if (!profile.count) return;
      const color = ARTIST_COLORS(performer.name);
      const pts = drawRadarShape(g, profile, cRadius, aSliceBig, color, 2, 0.12);

      // Dots with tooltip
      g.selectAll(null).data(pts).join('circle')
        .attr('cx', (d) => cRadius * d.value * Math.sin(d.angle))
        .attr('cy', (d) => -cRadius * d.value * Math.cos(d.angle))
        .attr('r', 4).attr('fill', color)
        .on('mouseover', (event, d) => {
          tip.show(event,
            `<div style="margin-bottom:0.3rem"><strong>${performer.name}</strong> · ${axisLabels[d.axis as keyof typeof axisLabels]}</div>
            <div><span class="tooltip-value">${formatRaw(d.key, d.raw)}</span>
            <span style="color:var(--muted);font-size:0.78rem"> (${lbl.norm} ${d3.format('.2f')(d.value)})</span></div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', () => tip.hide());
    });

    // Legend
    if (selected.length) {
      const legStartY = -cRadius - 10;
      const legG = g.append('g').attr('transform', `translate(${cRadius - 10},${legStartY})`);
      selected.forEach((p, i) => {
        const row = legG.append('g').attr('transform', `translate(0,${i * 18})`);
        row.append('circle').attr('r', 5).attr('cx', 0).attr('cy', 4).attr('fill', ARTIST_COLORS(p.name));
        row.append('text').attr('x', 12).attr('y', 9).attr('font-size', 10)
          .attr('fill', theme.text).text(p.name);
      });
    }
  }

  render();
  return {
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
