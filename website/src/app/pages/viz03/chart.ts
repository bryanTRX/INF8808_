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
  lang: 'en' | 'fr';
}

export interface Viz03Chart {
  resize: () => void;
  destroy: () => void;
  update: (opts: Partial<Viz03Options>) => void;
}

interface FamilyStat {
  key: string;
  en: string;
  fr: string;
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
      fr: fam.fr,
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
      return d3.ascending(opts.lang === 'fr' ? a.fr : a.en, opts.lang === 'fr' ? b.fr : b.en);
    });
  }

  function makeTooltip(d: FamilyStat, segment: 'clean' | 'explicit', lang: 'en' | 'fr'): string {
    const famName = lang === 'fr' ? d.fr : d.en;
    const segLabel = segment === 'clean'
      ? (lang === 'fr' ? 'Propre' : 'Clean')
      : (lang === 'fr' ? 'Explicite' : 'Explicit');
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
          <span style="color:var(--muted)">${lang === 'fr' ? 'Titres (segment)' : 'Tracks (segment)'}</span>
          <span class="tooltip-value">${d3.format(',')(count)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">${lang === 'fr' ? 'Total famille' : 'Family total'}</span>
          <span class="tooltip-value">${d3.format(',')(d.total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">${lang === 'fr' ? 'Explicite' : 'Explicit'}</span>
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

    const margin = { top: 52, right: 160, bottom: 80, left: 52 };
    const width = Math.max(560, container.clientWidth || 900);
    const height = Math.max(460, container.clientHeight || 520);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // Scales
    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.key))
      .range([0, innerW])
      .padding(0.25);

    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    // Stack using raw percentages (already sum to 100)
    const stackGen = d3
      .stack<FamilyStat>()
      .keys(['cleanPct', 'explicitPct'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stacked = stackGen(data);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', innerW / 2)
      .attr('y', -28)
      .attr('text-anchor', 'middle')
      .text(
        lang === 'fr'
          ? 'Proportion de titres explicites vs propres par famille de genres'
          : 'Explicit vs Clean Track Share by Genre Family',
      );

    // Grid
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (v) => y(v))
      .attr('y2', (v) => y(v))
      .attr('stroke', theme.border)
      .attr('stroke-opacity', 0.4);

    // Y axis
    g.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v}%`));

    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .text(lang === 'fr' ? 'Proportion (%)' : 'Proportion (%)');

    // X axis — family names (shortened if needed)
    const truncate = (s: string) => (s.length > 14 ? s.slice(0, 14) + '…' : s);

    g.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickSizeOuter(0)
          .tickSizeInner(0)
          .tickPadding(8)
          .tickFormat((key) => {
            const d = data.find((f) => f.key === key);
            if (!d) return key;
            return truncate(lang === 'fr' ? d.fr : d.en);
          }),
      )
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.4em')
      .attr('dy', '0.2em')
      .style('font-size', '11px');

    // X axis title
    svg
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', margin.left + innerW / 2)
      .attr('y', height - 8)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .text(lang === 'fr' ? 'Famille de genres' : 'Genre Family');

    // Stacked bars
    const segmentColors: Record<string, string> = {
      cleanPct: COLOR_CLEAN,
      explicitPct: COLOR_EXPLICIT,
    };
    const segmentKeys: Record<string, 'clean' | 'explicit'> = {
      cleanPct: 'clean',
      explicitPct: 'explicit',
    };

    stacked.forEach((series) => {
      const segKey = segmentKeys[series.key] ?? 'clean';
      const fillColor = segmentColors[series.key] ?? COLOR_CLEAN;

      g.selectAll<SVGRectElement, d3.SeriesPoint<FamilyStat>>(`.bar-${series.key}`)
        .data(series)
        .join('rect')
        .attr('class', `bar-${series.key}`)
        .attr('x', (d) => x(d.data.key)!)
        .attr('width', x.bandwidth())
        .attr('y', (d) => y(d[1]))
        .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
        .attr('fill', fillColor)
        .attr('opacity', 0.88)
        .attr('rx', series.key === 'cleanPct' ? 0 : 3)
        .on('mouseover', function (event, d) {
          d3.select(this).attr('opacity', 1);
          tip.show(event, makeTooltip(d.data, segKey, lang));
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.88);
          tip.hide();
        });
    });

    // Family color dot on each bar (top of bar)
    data.forEach((d) => {
      const xPos = x(d.key)! + x.bandwidth() / 2;
      g.append('circle')
        .attr('cx', xPos)
        .attr('cy', y(100) - 8)
        .attr('r', 4)
        .attr('fill', d.color)
        .attr('stroke', theme.panel)
        .attr('stroke-width', 1.5)
        .attr('pointer-events', 'none');
    });

    // Legend (right side)
    const legendX = innerW + 20;
    const legG = g.append('g').attr('transform', `translate(${legendX},0)`);

    legG
      .append('text')
      .attr('class', 'axis-label')
      .style('font-weight', '700')
      .style('font-size', '11px')
      .text(lang === 'fr' ? 'Contenu' : 'Content');

    const legendItems = [
      { color: COLOR_CLEAN, label: lang === 'fr' ? 'Propre' : 'Clean' },
      { color: COLOR_EXPLICIT, label: lang === 'fr' ? 'Explicite' : 'Explicit' },
    ];

    legendItems.forEach(({ color, label }, i) => {
      const row = legG.append('g').attr('transform', `translate(0,${22 + i * 26})`);
      row.append('rect').attr('width', 14).attr('height', 14).attr('rx', 2).attr('fill', color).attr('opacity', 0.88);
      row.append('text').attr('class', 'legend-label').attr('x', 22).attr('y', 11).text(label);
    });

    // Separator between legend sections
    legG.append('line')
      .attr('x1', 0).attr('x2', 120)
      .attr('y1', 82).attr('y2', 82)
      .attr('stroke', theme.border).attr('stroke-opacity', 0.5);

    legG
      .append('text')
      .attr('class', 'axis-label')
      .attr('y', 98)
      .style('font-weight', '700')
      .style('font-size', '11px')
      .text(lang === 'fr' ? 'Famille' : 'Family');

    GENRE_FAMILIES.forEach((fam, i) => {
      const inData = data.find((d) => d.key === fam.key);
      if (!inData) return;
      const row = legG.append('g').attr('transform', `translate(0,${112 + i * 20})`);
      row.append('circle').attr('cx', 6).attr('cy', 4).attr('r', 5).attr('fill', fam.color);
      row
        .append('text')
        .attr('class', 'legend-label')
        .attr('x', 18)
        .attr('y', 8)
        .style('font-size', '10px')
        .text(lang === 'fr' ? fam.fr : fam.en);
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
