import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import { GENRE_FAMILIES, assignGenreFamily } from '../../viz-shared/utils/genre-families';

// ─── Constants ────────────────────────────────────────────────────────────────

// Teal for clean, orange-red for explicit — as specified
const COLOR_CLEAN = '#0d9488';
const COLOR_EXPLICIT = '#ef4444';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc' | 'alpha';

export interface Viz03Options {
  sortOrder: SortOrder;
  lang: 'en';
}

export interface Viz03Chart {
  resize: () => void;
  destroy: () => void;
  update: (opts: Partial<Viz03Options>) => void;
}

interface FamilyStat {
  key: string;
  en: string;
  color: string;
  total: number;
  explicit: number;
  clean: number;
  explicitPct: number;
  cleanPct: number;
  subgenres: string[]; // top 5 genre tags by track count
}

// ─── Data Processing ──────────────────────────────────────────────────────────

function isExplicit(value: unknown): boolean {
  return String(value).toLowerCase() === 'true';
}

function buildFamilyStats(rows: TrackRow[]): FamilyStat[] {
  const counts = new Map<string, { total: number; explicit: number; genres: Map<string, number> }>();

  for (const fam of GENRE_FAMILIES) {
    counts.set(fam.key, { total: 0, explicit: 0, genres: new Map() });
  }

  for (const row of rows) {
    const tags = String(row.track_genre || '')
      .split(';')
      .map((g) => g.trim())
      .filter(Boolean);

    for (const tag of tags) {
      const fam = assignGenreFamily(tag);
      if (!fam) continue;
      const c = counts.get(fam.key)!;
      c.total += 1;
      if (isExplicit(row.explicit)) c.explicit += 1;
      c.genres.set(tag, (c.genres.get(tag) ?? 0) + 1);
      break; // one track → one family
    }
  }

  return GENRE_FAMILIES.map((fam) => {
    const c = counts.get(fam.key)!;
    const explicitPct = c.total > 0 ? (c.explicit / c.total) * 100 : 0;
    const subgenres = [...c.genres.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);
    return {
      key: fam.key,
      en: fam.en,
      color: fam.color,
      total: c.total,
      explicit: c.explicit,
      clean: c.total - c.explicit,
      explicitPct,
      cleanPct: 100 - explicitPct,
      subgenres,
    };
  }).filter((d) => d.total > 0);
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz03Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  initialOpts?: Partial<Viz03Options>,
): Viz03Chart {
  const allStats = buildFamilyStats(rows);

  let opts: Viz03Options = {
    sortOrder: 'asc',
    lang: 'en',
    ...initialOpts,
  };

  function getSorted(): FamilyStat[] {
    return [...allStats].sort((a, b) => {
      if (opts.sortOrder === 'asc') return d3.ascending(a.explicitPct, b.explicitPct);
      if (opts.sortOrder === 'desc') return d3.descending(a.explicitPct, b.explicitPct);
      return d3.ascending(a.en, b.en);
    });
  }

  function makeTooltip(d: FamilyStat, segment: 'clean' | 'explicit', _lang?: string): string {
    const famName = d.en;
    const segLabel = segment === 'clean' ? 'Clean' : 'Explicit';
    const pct = segment === 'clean' ? d.cleanPct : d.explicitPct;
    const count = segment === 'clean' ? d.clean : d.explicit;
    const segColor = segment === 'clean' ? COLOR_CLEAN : COLOR_EXPLICIT;

    const subList = d.subgenres.join(', ');

    return `
      <div style="margin-bottom:0.45rem;display:flex;align-items:center;gap:0.5rem">
        <span style="width:10px;height:10px;border-radius:2px;background:${d.color};display:inline-block;flex-shrink:0"></span>
        <strong style="font-size:0.9rem">${famName}</strong>
      </div>
      <div style="color:var(--muted);font-size:0.77rem;font-style:italic;margin-bottom:0.5rem">${subList}</div>
      <div style="border-top:1px solid var(--border);padding-top:0.45rem;font-size:0.82rem">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem">
          <span style="width:8px;height:8px;border-radius:1px;background:${segColor};display:inline-block;flex-shrink:0"></span>
          <span style="color:var(--muted)">${segLabel}</span>
          <span class="tooltip-value" style="margin-left:auto">${d3.format('.1f')(pct)}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">Tracks (segment)</span>
          <span class="tooltip-value">${d3.format(',')(count)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">Family total</span>
          <span class="tooltip-value">${d3.format(',')(d.total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">Explicit</span>
          <span class="tooltip-value">${d3.format('.1f')(d.explicitPct)}%</span>
        </div>
      </div>`;
  }

  function render() {
    container.innerHTML = '';

    const data = getSorted();
    const { lang } = opts;
    const theme = getChartTheme();

    if (data.length === 0) return;

    // More bottom margin to accommodate 2-line horizontal labels + axis title
    const margin = { top: 56, right: 24, bottom: 110, left: 56 };
    const width  = Math.max(560, container.clientWidth || 900);
    const height = Math.max(460, container.clientHeight || 520);
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const x = d3.scaleBand<string>()
      .domain(data.map((d) => d.key))
      .range([0, innerW])
      .padding(0.28);

    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    const stackGen = d3.stack<FamilyStat>()
      .keys(['cleanPct', 'explicitPct'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stacked = stackGen(data);

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', innerW / 2).attr('y', -34)
      .attr('text-anchor', 'middle')
      .text('Explicit vs Clean Track Share by Genre Family');

    const legItems = [
      { color: COLOR_CLEAN,    label: 'Clean'    },
      { color: COLOR_EXPLICIT, label: 'Explicit' },
    ];
    const legG = g.append('g').attr('transform', `translate(${innerW - 130}, -28)`);
    legItems.forEach(({ color, label }, i) => {
      const row = legG.append('g').attr('transform', `translate(${i * 68}, 0)`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2)
        .attr('fill', color).attr('opacity', 0.88);
      row.append('text').attr('class', 'legend-label').attr('x', 16).attr('y', 9)
        .style('font-size', '10.5px').text(label);
    });

    g.append('g').attr('class', 'grid')
      .selectAll('line').data(y.ticks(5)).join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (v) => y(v)).attr('y2', (v) => y(v))
      .attr('stroke', theme.border).attr('stroke-opacity', 0.4);

    g.append('g').attr('class', 'axis')
      .call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v}%`));

    g.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('Share (%)');

    // X axis ticks (no default text — we draw custom 2-line labels below)
    g.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSizeOuter(0).tickSizeInner(4).tickFormat(() => ''));

    data.forEach((d) => {
      const cx = x(d.key)! + x.bandwidth() / 2;
      const fullName = d.en;
      // Split on ' / ' to get two lines; if no '/', just one line
      const parts = fullName.includes(' / ') ? fullName.split(' / ') : [fullName];

      const labelG = g.append('g').attr('transform', `translate(${cx}, ${innerH + 10})`);
      parts.forEach((part, i) => {
        labelG.append('text')
          .attr('y', i * 14)
          .attr('text-anchor', 'middle')
          .attr('class', 'axis-label')
          .style('font-size', '10.5px')
          .style('fill', theme.textSecondary)
          .text(part);
      });
    });

    g.append('text').attr('class', 'axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 82)
      .attr('text-anchor', 'middle')
      .style('font-size', '11.5px').style('font-weight', '600')
      .text('Genre Family');

    const segmentColors: Record<string, string> = { cleanPct: COLOR_CLEAN, explicitPct: COLOR_EXPLICIT };
    const segmentKeys:   Record<string, 'clean' | 'explicit'> = { cleanPct: 'clean', explicitPct: 'explicit' };

    stacked.forEach((series) => {
      const segKey   = segmentKeys[series.key]   ?? 'clean';
      const fillColor = segmentColors[series.key] ?? COLOR_CLEAN;

      g.selectAll<SVGRectElement, d3.SeriesPoint<FamilyStat>>(`.bar-${series.key}`)
        .data(series).join('rect')
        .attr('class', `bar-${series.key}`)
        .attr('x', (d) => x(d.data.key)!)
        .attr('width', x.bandwidth())
        .attr('y', (d) => y(d[1]))
        .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
        .attr('fill', fillColor).attr('opacity', 0.88)
        .attr('rx', series.key === 'explicitPct' ? 3 : 0)
        .on('mouseover', function (event, d) {
          d3.select(this).attr('opacity', 1);
          tip.show(event, makeTooltip(d.data, segKey, lang));
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.88); tip.hide(); });
    });
  }

  render();

  return {
    resize: render,
    destroy: () => { container.innerHTML = ''; },
    update: (newOpts) => {
      opts = { ...opts, ...newOpts };
      render();
    },
  };
}
