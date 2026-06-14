import * as d3 from 'd3';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc' | 'alpha';
export type TopN = 10 | 20 | 30 | 50;

export interface Viz02Options {
  topN: TopN;
  sortOrder: SortOrder;
  lang: 'en' | 'fr';
}

export interface Viz02Chart {
  resize: () => void;
  destroy: () => void;
  update: (opts: Partial<Viz02Options>) => void;
}

// ─── Box Statistics ───────────────────────────────────────────────────────────

interface BoxDatum {
  genre: string;
  count: number;
  median: number;
  q1: number;
  q3: number;
  wMin: number;
  wMax: number;
  outliers: number[];
}

function boxStats(values: number[]): Omit<BoxDatum, 'genre' | 'count'> {
  const sorted = values.filter(Number.isFinite).sort(d3.ascending);
  if (sorted.length === 0) return { median: 0, q1: 0, q3: 0, wMin: 0, wMax: 0, outliers: [] };

  const q1 = d3.quantile(sorted, 0.25) ?? 0;
  const median = d3.quantile(sorted, 0.5) ?? 0;
  const q3 = d3.quantile(sorted, 0.75) ?? 0;
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;

  const inside = sorted.filter((v) => v >= lo && v <= hi);
  const outliers = sorted.filter((v) => v < lo || v > hi);

  return {
    q1,
    median,
    q3,
    wMin: inside.length ? inside[0] : q1,
    wMax: inside.length ? inside[inside.length - 1] : q3,
    outliers,
  };
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz02Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  initialOpts?: Partial<Viz02Options>,
): Viz02Chart {
  // Pre-compute box data for every unique genre
  const durationByGenre = new Map<string, number[]>();

  for (const row of rows) {
    const genre = String(row.track_genre || '').trim();
    const dur = Number(row.duration_ms) / 60000;
    if (!genre || !Number.isFinite(dur) || dur <= 0) continue;
    if (!durationByGenre.has(genre)) durationByGenre.set(genre, []);
    durationByGenre.get(genre)!.push(dur);
  }

  const allBoxData: BoxDatum[] = [...durationByGenre.entries()]
    .filter(([, vals]) => vals.length >= 30)
    .map(([genre, vals]) => ({ genre, count: vals.length, ...boxStats(vals) }))
    .sort((a, b) => d3.ascending(a.genre, b.genre));

  const popValues = durationByGenre.get('pop') ?? [];
  const popMedian = d3.median(popValues) ?? 3.53;

  let opts: Viz02Options = {
    topN: 50,
    sortOrder: 'asc',
    lang: 'en',
    ...initialOpts,
  };

  function getVisibleData(): BoxDatum[] {
    const sorted = [...allBoxData].sort((a, b) => {
      if (opts.sortOrder === 'asc') return d3.ascending(a.median, b.median);
      if (opts.sortOrder === 'desc') return d3.descending(a.median, b.median);
      return d3.ascending(a.genre, b.genre);
    });
    return sorted.slice(0, opts.topN);
  }

  function makeTooltip(d: BoxDatum, lang: 'en' | 'fr'): string {
    const fmt = d3.format('.2f');
    const fmtN = d3.format(',');
    const diff = d.median - popMedian;
    const diffStr =
      diff >= 0
        ? `+${fmt(diff)} min ${lang === 'fr' ? 'au-dessus' : 'above'} pop`
        : `${fmt(diff)} min ${lang === 'fr' ? 'en-dessous' : 'below'} pop`;

    const outlierLine =
      d.outliers.length > 0
        ? `<div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
            <span style="color:var(--muted)">${lang === 'fr' ? 'Valeurs aberrantes' : 'Outliers'}</span>
            <span class="tooltip-value">${d.outliers.length}</span>
          </div>`
        : '';

    return `
      <div style="margin-bottom:0.45rem">
        <strong style="font-size:0.9rem">${d.genre}</strong>
      </div>
      <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.5rem">
        ${fmtN(d.count)}&nbsp;${lang === 'fr' ? 'titres' : 'tracks'}
      </div>
      <div style="border-top:1px solid var(--border);padding-top:0.45rem;font-size:0.82rem">
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">${lang === 'fr' ? 'Médiane' : 'Median'}</span>
          <span class="tooltip-value">${fmt(d.median)} min</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">Q1 – Q3</span>
          <span class="tooltip-value">${fmt(d.q1)} – ${fmt(d.q3)} min</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">${lang === 'fr' ? 'Étendue moustaches' : 'Whisker range'}</span>
          <span class="tooltip-value">${fmt(d.wMin)} – ${fmt(d.wMax)} min</span>
        </div>
        ${outlierLine}
        <div style="margin-top:0.4rem;font-size:0.78rem;color:var(--chart-reference)">
          ${diffStr}
        </div>
      </div>`;
  }

  function render() {
    container.innerHTML = '';

    const data = getVisibleData();
    const { lang } = opts;
    const theme = getChartTheme();

    if (data.length === 0) return;

    // ── Layout ────────────────────────────────────────────────────────────────
    // Vertical box plot: X = genres (band), Y = duration (linear)
    const margin = { top: 48, right: 24, bottom: 160, left: 52 };
    const width = Math.max(560, container.clientWidth || 960);
    const height = Math.max(720, container.clientHeight || 800);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // ── Scales ────────────────────────────────────────────────────────────────
    // X: genres (categorical band scale)
    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.genre))
      .range([0, innerW])
      .padding(0.35);

    // Y: duration in minutes
    const yMax = Math.max(10, (d3.max(data, (d) => d.wMax) ?? 10) * 1.08);
    const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]).nice();

    const accent = theme.accent;
    const bw = x.bandwidth();

    // ── SVG ───────────────────────────────────────────────────────────────────
    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', innerW / 2)
      .attr('y', -26)
      .attr('text-anchor', 'middle')
      .text(
        lang === 'fr'
          ? `Distribution des durées de pistes — Top ${opts.topN} genres`
          : `Track Duration Distribution — Top ${opts.topN} Genres`,
      );

    // ── Grid lines (horizontal) ────────────────────────────────────────────────
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(6))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (v) => y(v))
      .attr('y2', (v) => y(v))
      .attr('stroke', theme.border)
      .attr('stroke-opacity', 0.4);

    // ── Axes ──────────────────────────────────────────────────────────────────
    // Y axis
    g.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(y).ticks(6).tickFormat((v) => `${v} min`));

    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .text(lang === 'fr' ? 'Durée (minutes)' : 'Duration (minutes)');

    // X axis — vertical labels, truncated to avoid overlap
    const maxLabelLen = 13;
    const truncate = (s: string) =>
      s.length > maxLabelLen ? s.slice(0, maxLabelLen) + '…' : s;

    g.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickSizeOuter(0)
          .tickSizeInner(0)
          .tickPadding(6)
          .tickFormat((d) => truncate(d as string)),
      )
      .selectAll('text')
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.4em')
      .attr('dy', '-0.55em')
      .style('font-size', '10px');

    // ── X axis title (appended to SVG directly to avoid g-clip issues) ───────
    svg
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', margin.left + innerW / 2)
      .attr('y', margin.top + innerH + margin.bottom - 12)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .text(lang === 'fr' ? 'Genre' : 'Genre');

    // ── Pop median reference line ──────────────────────────────────────────────
    const refColor = theme.muted;

    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', y(popMedian))
      .attr('y2', y(popMedian))
      .attr('stroke', refColor)
      .attr('stroke-dasharray', '6,4')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round');

    // Label on the line (left side, no value shown)
    g.append('text')
      .attr('x', 8)
      .attr('y', y(popMedian) - 5)
      .attr('fill', refColor)
      .attr('class', 'axis-label')
      .style('font-size', '10.5px')
      .style('font-weight', '600')
      .text(lang === 'fr' ? 'Médiane pop' : 'Pop median');

    // ── Box rows ──────────────────────────────────────────────────────────────
    const boxRows = g
      .selectAll<SVGGElement, BoxDatum>('.box-col')
      .data(data, (d) => d.genre)
      .join('g')
      .attr('class', 'box-col')
      .attr('transform', (d) => `translate(${x(d.genre)! + bw / 2},0)`);

    // Whisker vertical line
    boxRows
      .append('line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', (d) => y(d.wMin))
      .attr('y2', (d) => y(d.wMax))
      .attr('stroke', accent)
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.55);

    // Whisker caps (horizontal ticks)
    const capW = bw * 0.35;
    ['wMin', 'wMax'].forEach((which) => {
      boxRows
        .append('line')
        .attr('x1', -capW)
        .attr('x2', capW)
        .attr('y1', (d) => y(d[which as 'wMin' | 'wMax']))
        .attr('y2', (d) => y(d[which as 'wMin' | 'wMax']))
        .attr('stroke', accent)
        .attr('stroke-width', 1.2)
        .attr('opacity', 0.55);
    });

    // Outlier dots
    boxRows.each(function (d) {
      const rowG = d3.select(this);
      const shown =
        d.outliers.length > 30
          ? d.outliers.filter((_, i) => i % Math.ceil(d.outliers.length / 30) === 0)
          : d.outliers;
      rowG
        .selectAll<SVGCircleElement, number>('.outlier')
        .data(shown)
        .join('circle')
        .attr('class', 'outlier')
        .attr('cx', 0)
        .attr('cy', (v) => y(v))
        .attr('r', 2.2)
        .attr('fill', 'none')
        .attr('stroke', accent)
        .attr('stroke-width', 1)
        .attr('opacity', 0.4)
        .attr('pointer-events', 'none');
    });

    // IQR box fill (interactive)
    boxRows
      .append('rect')
      .attr('x', -bw * 0.4)
      .attr('width', bw * 0.8)
      .attr('y', (d) => y(d.q3))
      .attr('height', (d) => Math.max(1, y(d.q1) - y(d.q3)))
      .attr('fill', accent)
      .attr('rx', 2)
      .attr('opacity', 0.2)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.42);
        tip.show(event, makeTooltip(d, lang));
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.2);
        tip.hide();
      });

    // IQR box stroke
    boxRows
      .append('rect')
      .attr('x', -bw * 0.4)
      .attr('width', bw * 0.8)
      .attr('y', (d) => y(d.q3))
      .attr('height', (d) => Math.max(1, y(d.q1) - y(d.q3)))
      .attr('fill', 'none')
      .attr('stroke', accent)
      .attr('stroke-width', 1.2)
      .attr('rx', 2)
      .attr('opacity', 0.6)
      .attr('pointer-events', 'none');

    // Median line (horizontal inside box)
    boxRows
      .append('line')
      .attr('x1', -bw * 0.4)
      .attr('x2', bw * 0.4)
      .attr('y1', (d) => y(d.median))
      .attr('y2', (d) => y(d.median))
      .attr('stroke', theme.text)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('pointer-events', 'none');
  }

  render();

  return {
    resize: render,
    destroy: () => {
      container.innerHTML = '';
    },
    update: (newOpts) => {
      opts = { ...opts, ...newOpts };
      render();
    },
  };
}
