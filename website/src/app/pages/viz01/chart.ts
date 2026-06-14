import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Genre Family Definitions ────────────────────────────────────────────────

export interface GenreFamily {
  key: string;
  en: string;
  fr: string;
  color: string;
  keywords: string[]; // max 15 Spotify tag fragments to match
}

export const GENRE_FAMILIES: GenreFamily[] = [
  {
    key: 'rock-metal',
    en: 'Rock / Metal',
    fr: 'Rock / Métal',
    color: '#e05252',
    keywords: ['rock', 'metal', 'punk', 'hardcore', 'alternative', 'grunge', 'emo', 'heavymetal', 'blackmetal', 'deathmetal', 'progressiverock', 'garage', 'shoegaze', 'postpunk', 'noise'],
  },
  {
    key: 'pop',
    en: 'Pop',
    fr: 'Pop',
    color: '#4e9af1',
    keywords: ['pop', 'kpop', 'jpop', 'dancepop', 'synthpop', 'electropop', 'powerpop', 'indiepop', 'cantopop', 'teenpop', 'bedroompop', 'artpop', 'bubblegum', 'poprock', 'mandopop'],
  },
  {
    key: 'electronic',
    en: 'Electronic / Dance',
    fr: 'Électronique / Dance',
    color: '#a855f7',
    keywords: ['edm', 'house', 'techno', 'trance', 'dubstep', 'drumandbass', 'electronic', 'electronica', 'club', 'dance', 'electro', 'breakbeat', 'dnb', 'footwork', 'disco'],
  },
  {
    key: 'hip-hop',
    en: 'Hip-hop / Rap',
    fr: 'Hip-hop / Rap',
    color: '#f59e0b',
    keywords: ['hiphop', 'rap', 'trap', 'drill', 'grime', 'consciouship', 'gangsterrap', 'undergroundhip', 'cloudrap', 'mumble', 'crunk', 'bounce', 'phonk', 'lofihiphop', 'horrorcore'],
  },
  {
    key: 'classical',
    en: 'Classical / Instrumental',
    fr: 'Classique / Instrumental',
    color: '#10b981',
    keywords: ['classical', 'opera', 'piano', 'orchestra', 'chamber', 'baroque', 'romantic', 'avantgarde', 'symphony', 'string', 'choral', 'concerto', 'renaissance', 'minimalism', 'neoclassical'],
  },
  {
    key: 'folk',
    en: 'Folk / Acoustic',
    fr: 'Folk / Acoustique',
    color: '#65a30d',
    keywords: ['folk', 'acoustic', 'singersongwriter', 'country', 'bluegrass', 'americana', 'celtic', 'traditional', 'stomp', 'altcountry', 'newamericana', 'cowboy', 'roots', 'western', 'outlaw'],
  },
  {
    key: 'latin-world',
    en: 'Latin / World',
    fr: 'Latin / Monde',
    color: '#f97316',
    keywords: ['latin', 'salsa', 'cumbia', 'bachata', 'bossanova', 'samba', 'flamenco', 'afrobeat', 'reggae', 'ska', 'world', 'dancehall', 'sertanejo', 'pagode', 'tropicalia'],
  },
  {
    key: 'jazz-blues',
    en: 'Jazz / Blues',
    fr: 'Jazz / Blues',
    color: '#0891b2',
    keywords: ['jazz', 'blues', 'bebop', 'swing', 'cooljazz', 'smoothjazz', 'gospel', 'souljazz', 'chicagoblues', 'deltablues', 'electricblues', 'fusion', 'acidjazz', 'hardbop', 'freejazz'],
  },
  {
    key: 'rnb-soul',
    en: 'R&B / Soul',
    fr: 'R&B / Soul',
    color: '#ec4899',
    keywords: ['rnb', 'soul', 'funk', 'neosoul', 'motown', 'quietstorm', 'phillysoul', 'southernsoul', 'doowop', 'groove', 'funkrock', 'blueeyedsoul', 'contemporaryrnb', 'newjack', 'gogo'],
  },
  {
    key: 'ambient',
    en: 'Ambient / Chill',
    fr: 'Ambient / Chill',
    color: '#64748b',
    keywords: ['ambient', 'chill', 'newage', 'sleep', 'meditation', 'lofi', 'study', 'postrock', 'drone', 'atmospheric', 'space', 'downtempo', 'triphop', 'chillout', 'darkambient'],
  },
];

// ─── Dimension Definitions ────────────────────────────────────────────────────

export interface DimDef {
  key: string;
  en: string;
  fr: string;
  domain: [number, number];
  fmt: (v: number) => string;
}

export const ALL_DIMS: DimDef[] = [
  { key: 'danceability', en: 'Danceability', fr: 'Dansabilité', domain: [0, 1], fmt: d3.format('.2f') },
  { key: 'energy', en: 'Energy', fr: 'Énergie', domain: [0, 1], fmt: d3.format('.2f') },
  { key: 'acousticness', en: 'Acousticness', fr: 'Acousticité', domain: [0, 1], fmt: d3.format('.2f') },
  { key: 'valence', en: 'Valence', fr: 'Valence', domain: [0, 1], fmt: d3.format('.2f') },
  { key: 'speechiness', en: 'Speechiness', fr: 'Parole', domain: [0, 0.5], fmt: d3.format('.2f') },
  { key: 'instrumentalness', en: 'Instrumentalness', fr: 'Instrumentalité', domain: [0, 1], fmt: d3.format('.2f') },
  { key: 'tempo', en: 'Tempo (BPM)', fr: 'Tempo (BPM)', domain: [60, 180], fmt: d3.format('.0f') },
];

export const DEFAULT_DIM_KEYS = ['danceability', 'energy', 'acousticness', 'valence', 'tempo'];

// ─── Processed Family Data ────────────────────────────────────────────────────

export interface FamilyAvg {
  family: GenreFamily;
  trackCount: number;
  subgenres: string[];
  values: Record<string, number>;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]+/g, '');
}

function assignFamily(genreTag: string): GenreFamily | null {
  const norm = normalize(genreTag);
  for (const fam of GENRE_FAMILIES) {
    for (const kw of fam.keywords) {
      if (norm === kw || norm.includes(kw) || kw.includes(norm)) {
        return fam;
      }
    }
  }
  return null;
}

function buildFamilyData(rows: TrackRow[]): FamilyAvg[] {
  const famTracks = new Map<string, TrackRow[]>();
  const famGenres = new Map<string, Map<string, number>>();

  for (const fam of GENRE_FAMILIES) {
    famTracks.set(fam.key, []);
    famGenres.set(fam.key, new Map());
  }

  for (const row of rows) {
    const tags = String(row.track_genre || '')
      .split(';')
      .map((g) => g.trim())
      .filter(Boolean);

    for (const tag of tags) {
      const fam = assignFamily(tag);
      if (!fam) continue;
      famTracks.get(fam.key)!.push(row);
      const gMap = famGenres.get(fam.key)!;
      gMap.set(tag, (gMap.get(tag) ?? 0) + 1);
      break; // one track → one family (first match wins)
    }
  }

  const result: FamilyAvg[] = [];

  for (const fam of GENRE_FAMILIES) {
    const tracks = famTracks.get(fam.key)!;
    if (tracks.length === 0) continue;

    const gMap = famGenres.get(fam.key)!;
    const subgenres = [...gMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);

    const values: Record<string, number> = {};
    for (const dim of ALL_DIMS) {
      values[dim.key] =
        d3.mean(tracks, (d) => {
          const v = Number(d[dim.key as keyof TrackRow]);
          return Number.isFinite(v) ? v : undefined;
        }) ?? 0;
    }

    result.push({ family: fam, trackCount: tracks.length, subgenres, values });
  }

  return result.sort((a, b) => b.trackCount - a.trackCount);
}

// ─── Chart Options & Interface ────────────────────────────────────────────────

export interface Viz01Options {
  dimKeys: string[];
  maxFamilies: number;
  lang: 'en' | 'fr';
}

export interface Viz01Chart {
  resize: () => void;
  destroy: () => void;
  update: (opts: Partial<Viz01Options>) => void;
  getFamilyData: () => FamilyAvg[];
}

// ─── Chart Creation ───────────────────────────────────────────────────────────

export function createViz01Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  initialOpts?: Partial<Viz01Options>,
): Viz01Chart {
  const allFamilyData = buildFamilyData(rows);

  let opts: Viz01Options = {
    dimKeys: DEFAULT_DIM_KEYS,
    maxFamilies: 10,
    lang: 'en',
    ...initialOpts,
  };

  const brushed = new Map<string, [number, number]>();

  function getActiveDims(): DimDef[] {
    return ALL_DIMS.filter((d) => opts.dimKeys.includes(d.key));
  }

  function getActiveData(): FamilyAvg[] {
    return allFamilyData.slice(0, Math.min(opts.maxFamilies, GENRE_FAMILIES.length));
  }

  function isInBrush(d: FamilyAvg): boolean {
    for (const [dimKey, [lo, hi]] of brushed.entries()) {
      const v = d.values[dimKey] ?? 0;
      if (v < lo || v > hi) return false;
    }
    return true;
  }

  function makeTooltip(d: FamilyAvg, dims: DimDef[], lang: 'en' | 'fr'): string {
    const famName = lang === 'fr' ? d.family.fr : d.family.en;
    const subList = d.subgenres.join(', ');
    const dimRows = dims
      .map(
        (dim) =>
          `<div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
            <span style="color:var(--muted)">${lang === 'fr' ? dim.fr : dim.en}</span>
            <span class="tooltip-value">${dim.fmt(d.values[dim.key] ?? 0)}</span>
          </div>`,
      )
      .join('');

    return `
      <div style="margin-bottom:0.45rem;display:flex;align-items:center;gap:0.5rem">
        <span style="flex-shrink:0;width:12px;height:12px;border-radius:50%;background:${d.family.color};display:inline-block"></span>
        <strong style="font-size:0.9rem">${famName}</strong>
      </div>
      <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.3rem">
        ${d3.format(',')(d.trackCount)}&nbsp;${lang === 'fr' ? 'titres' : 'tracks'}
      </div>
      <div style="color:var(--muted);font-size:0.77rem;font-style:italic;margin-bottom:0.55rem">${subList}</div>
      <div style="border-top:1px solid var(--border);padding-top:0.45rem;font-size:0.82rem">
        ${dimRows}
      </div>`;
  }

  function render() {
    container.innerHTML = '';
    brushed.clear();

    const dims = getActiveDims();
    const data = getActiveData();
    const theme = getChartTheme();
    const { lang } = opts;

    if (dims.length < 2 || data.length === 0) return;

    const totalTracks = allFamilyData.reduce((s, d) => s + d.trackCount, 0);
    const width = Math.max(580, container.clientWidth || 900);

    const legendRows = Math.ceil(data.length / 5);
    const legendH = legendRows * 26 + 20;

    const svgH = Math.max(480, (container.clientHeight || 540));
    const chartH = svgH - legendH;
    const margin = { top: 50, right: 20, bottom: 20, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = chartH - margin.top - margin.bottom;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', svgH);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', innerW / 2)
      .attr('y', -28)
      .attr('text-anchor', 'middle')
      .text(
        lang === 'fr'
          ? `Profil audio moyen par famille de genres · ${d3.format(',')(totalTracks)} titres`
          : `Average audio profile by genre family · ${d3.format(',')(totalTracks)} tracks`,
      );

    // Scales
    const x = d3
      .scalePoint<string>()
      .domain(dims.map((d) => d.key))
      .range([0, innerW])
      .padding(0.15);

    const yScales = new Map<string, d3.ScaleLinear<number, number>>(
      dims.map((dim) => [
        dim.key,
        d3.scaleLinear().domain(dim.domain).range([innerH, 0]).clamp(true),
      ]),
    );

    // Background axis lines
    dims.forEach((dim) => {
      g.append('line')
        .attr('x1', x(dim.key)!)
        .attr('x2', x(dim.key)!)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', theme.border)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.4);
    });

    // Line generator
    const lineGen = d3
      .line<[string, number]>()
      .defined(([, v]) => Number.isFinite(v))
      .x(([k]) => x(k)!)
      .y(([k, v]) => yScales.get(k)!(v));

    const makePath = (d: FamilyAvg) =>
      lineGen(dims.map((dim) => [dim.key, d.values[dim.key] ?? 0]));

    // Lines
    const paths = g
      .selectAll<SVGPathElement, FamilyAvg>('.pc-line')
      .data(data, (d) => d.family.key)
      .join('path')
      .attr('class', 'pc-line')
      .attr('fill', 'none')
      .attr('stroke', (d) => d.family.color)
      .attr('stroke-width', 2.2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', 0.82)
      .attr('d', (d) => makePath(d));

    function updateLineStyles() {
      paths
        .attr('opacity', (d) => (isInBrush(d) ? 0.85 : 0.1))
        .attr('stroke-width', (d) => (isInBrush(d) ? 2.2 : 1.5));
    }

    // Hover interactions on lines
    paths
      .on('mouseover', function (event, d) {
        if (!isInBrush(d)) return;
        d3.select(this).raise().attr('stroke-width', 4.5).attr('opacity', 1);
        tip.show(event, makeTooltip(d, dims, lang));
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function (_, d) {
        d3.select(this)
          .attr('stroke-width', isInBrush(d) ? 2.2 : 1.5)
          .attr('opacity', isInBrush(d) ? 0.85 : 0.1);
        tip.hide();
      });

    // Dot markers at each axis crossing
    data.forEach((d) => {
      dims.forEach((dim) => {
        const xPos = x(dim.key)!;
        const yPos = yScales.get(dim.key)!(d.values[dim.key] ?? 0);
        g.append('circle')
          .attr('cx', xPos)
          .attr('cy', yPos)
          .attr('r', 3)
          .attr('fill', d.family.color)
          .attr('stroke', theme.panel)
          .attr('stroke-width', 1)
          .attr('opacity', 0.9)
          .attr('pointer-events', 'none');
      });
    });

    // Axes + brushes
    dims.forEach((dim) => {
      const xPos = x(dim.key)!;
      const yScale = yScales.get(dim.key)!;
      const axisG = g.append('g').attr('transform', `translate(${xPos},0)`);

      axisG
        .append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(dim.fmt as (v: d3.NumberValue) => string));

      axisG
        .append('text')
        .attr('class', 'axis-label')
        .attr('y', -16)
        .attr('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('font-size', '11px')
        .text(lang === 'fr' ? dim.fr : dim.en);

      // Brush
      const brush = d3
        .brushY()
        .extent([
          [-9, 0],
          [9, innerH],
        ])
        .on('brush end', (event: d3.D3BrushEvent<unknown>) => {
          const sel = event.selection as [number, number] | null;
          if (!sel) {
            brushed.delete(dim.key);
          } else {
            const [py0, py1] = sel;
            brushed.set(dim.key, [yScale.invert(py1), yScale.invert(py0)]);
          }
          updateLineStyles();
        });

      axisG.append('g').attr('class', 'dim-brush').call(brush as d3.BrushBehavior<unknown>);
    });

    // Legend below chart
    const legG = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${chartH + 6})`);

    const colW = Math.floor(innerW / Math.min(data.length, 5));

    data.forEach((d, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const lx = col * colW;
      const ly = row * 26;

      const item = legG
        .append('g')
        .attr('transform', `translate(${lx},${ly + 14})`)
        .style('cursor', 'pointer');

      item
        .append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('y', -10)
        .attr('fill', d.family.color);

      item
        .append('text')
        .attr('x', 18)
        .attr('class', 'legend-label')
        .style('font-size', '11px')
        .text(lang === 'fr' ? d.family.fr : d.family.en);

      item
        .on('mouseover', (event) => {
          const famName = lang === 'fr' ? d.family.fr : d.family.en;
          tip.show(
            event,
            `<div style="margin-bottom:0.4rem;display:flex;align-items:center;gap:0.4rem">
              <span style="width:10px;height:10px;border-radius:50%;background:${d.family.color};display:inline-block;flex-shrink:0"></span>
              <strong>${famName}</strong>
            </div>
            <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.3rem">
              ${lang === 'fr' ? 'Sous-genres inclus' : 'Included subgenres'}:
            </div>
            <div style="font-size:0.82rem">${d.subgenres.join(', ')}</div>`,
          );
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', () => tip.hide());
    });
  }

  render();

  return {
    resize: render,
    destroy: () => {
      container.innerHTML = '';
      brushed.clear();
    },
    update: (newOpts) => {
      opts = { ...opts, ...newOpts };
      render();
    },
    getFamilyData: () => allFamilyData,
  };
}
