import * as d3 from 'd3';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import { GENRE_FAMILIES, assignGenreFamily } from '../../viz-shared/utils/genre-families';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc' | 'alpha';

export interface Viz02Options {
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
  key: string;
  label: string;      // short display name for x-axis
  fullLabel: string;  // full name for tooltip
  color: string;
  subgenres: string[];
  count: number;
  median: number;
  q1: number;
  q3: number;
  wMin: number;
  wMax: number;
  outliers: number[];
}

function boxStats(values: number[]): Omit<BoxDatum, 'key' | 'label' | 'fullLabel' | 'color' | 'subgenres' | 'count'> {
  const sorted = values.filter(Number.isFinite).sort(d3.ascending);
  if (sorted.length === 0) return { median: 0, q1: 0, q3: 0, wMin: 0, wMax: 0, outliers: [] };

  const q1 = d3.quantile(sorted, 0.25) ?? 0;
  const median = d3.quantile(sorted, 0.5) ?? 0;
  const q3 = d3.quantile(sorted, 0.75) ?? 0;
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;

  return {
    q1, median, q3,
    wMin: sorted.find((v) => v >= lo) ?? q1,
    wMax: [...sorted].reverse().find((v) => v <= hi) ?? q3,
    outliers: sorted.filter((v) => v < lo || v > hi),
  };
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz02Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  initialOpts?: Partial<Viz02Options>,
): Viz02Chart {

  // Group durations by genre family
  const famDurations = new Map<string, number[]>();
  const famGenreCounts = new Map<string, Map<string, number>>();
  for (const fam of GENRE_FAMILIES) {
    famDurations.set(fam.key, []);
    famGenreCounts.set(fam.key, new Map());
  }

  for (const row of rows) {
    const tags = String(row.track_genre || '').split(';').map((t) => t.trim().toLowerCase().replace(/[\s-]/g, ''));
    const dur = Number(row.duration_ms) / 60000;
    if (!Number.isFinite(dur) || dur <= 0 || dur > 15) continue;

    for (const tag of tags) {
      const fam = assignGenreFamily(tag);
      if (!fam) continue;
      famDurations.get(fam.key)!.push(dur);
      const gMap = famGenreCounts.get(fam.key)!;
      const raw = String(row.track_genre || '').trim();
      gMap.set(raw, (gMap.get(raw) ?? 0) + 1);
      break;
    }
  }

  // Compute the pop family median as reference (use raw 'pop' tags)
  const allPopDurations = rows
    .filter((r) => String(r.track_genre || '').toLowerCase().includes('pop'))
    .map((r) => Number(r.duration_ms) / 60000)
    .filter((v) => Number.isFinite(v) && v > 0);
  const popMedian = d3.median(allPopDurations) ?? 3.53;

  // Build allBoxData (one entry per family)
  const allBoxData: BoxDatum[] = GENRE_FAMILIES
    .map((fam) => {
      const vals = famDurations.get(fam.key) ?? [];
      if (vals.length < 20) return null;
      const gMap = famGenreCounts.get(fam.key)!;
      const subgenres = [...gMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
      return {
        key: fam.key,
        label: fam.en.split(' /')[0].trim(),   // short: "Rock", "Electronic", …
        fullLabel: fam.en,
        color: fam.color,
        subgenres,
        count: vals.length,
        ...boxStats(vals),
      };
    })
    .filter((d): d is BoxDatum => d !== null);

  let opts: Viz02Options = {
    sortOrder: 'desc',
    lang: 'en',
    ...initialOpts,
  };

  function getVisibleData(): BoxDatum[] {
    return [...allBoxData].sort((a, b) => {
      if (opts.sortOrder === 'asc')   return d3.ascending(a.median, b.median);
      if (opts.sortOrder === 'desc')  return d3.descending(a.median, b.median);
      return d3.ascending(a.label, b.label);
    });
  }

  function getLabel(d: BoxDatum): string {
    if (opts.lang === 'fr') {
      const fam = GENRE_FAMILIES.find((f) => f.key === d.key);
      return fam ? fam.fr.split(' /')[0].trim() : d.label;
    }
    return d.label;
  }

  function getFullLabel(d: BoxDatum): string {
    const fam = GENRE_FAMILIES.find((f) => f.key === d.key);
    return fam ? (opts.lang === 'fr' ? fam.fr : fam.en) : d.fullLabel;
  }

  function makeTooltip(d: BoxDatum): string {
    const fmt = d3.format('.2f');
    const fmtN = d3.format(',');
    const lang = opts.lang;
    const diff = d.median - popMedian;
    const diffStr = diff >= 0
      ? `+${fmt(diff)} min ${lang === 'fr' ? 'au-dessus de la médiane pop' : 'above pop median'}`
      : `${fmt(diff)} min ${lang === 'fr' ? 'en-dessous de la médiane pop' : 'below pop median'}`;

    const outlierLine = d.outliers.length > 0
      ? `<div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
          <span style="color:var(--muted)">${lang === 'fr' ? 'Valeurs aberrantes' : 'Outliers'}</span>
          <span class="tooltip-value">${d.outliers.length}</span>
        </div>` : '';

    return `
      <div style="margin-bottom:0.45rem;display:flex;align-items:center;gap:0.5rem">
        <span style="flex-shrink:0;width:12px;height:12px;border-radius:3px;background:${d.color};display:inline-block"></span>
        <strong style="font-size:0.9rem">${getFullLabel(d)}</strong>
      </div>
      <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.3rem">
        ${fmtN(d.count)}&nbsp;${lang === 'fr' ? 'titres' : 'tracks'}
      </div>
      <div style="color:var(--muted);font-size:0.77rem;font-style:italic;margin-bottom:0.45rem">${d.subgenres.join(', ')}</div>
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
          <span style="color:var(--muted)">${lang === 'fr' ? 'Moustaches' : 'Whiskers'}</span>
          <span class="tooltip-value">${fmt(d.wMin)} – ${fmt(d.wMax)} min</span>
        </div>
        ${outlierLine}
        <div style="margin-top:0.4rem;font-size:0.78rem;color:var(--muted)">${diffStr}</div>
      </div>`;
  }

  function render() {
    container.innerHTML = '';
    const data = getVisibleData();
    const { lang } = opts;
    const theme = getChartTheme();
    if (data.length === 0) return;

    // ── Layout ──────────────────────────────────────────────────────────────
    const margin = { top: 58, right: 24, bottom: 72, left: 58 };
    const width  = Math.max(560, container.clientWidth || 800);
    const height = Math.max(460, container.clientHeight || 520);
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    // ── Scales ───────────────────────────────────────────────────────────────
    const x = d3.scaleBand<string>()
      .domain(data.map((d) => d.key))
      .range([0, innerW])
      .padding(0.3);

    const yMax = Math.max(10, (d3.max(data, (d) => d.wMax) ?? 10) * 1.1);
    const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]).nice();

    const bw = x.bandwidth();

    // ── SVG ──────────────────────────────────────────────────────────────────
    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', innerW / 2)
      .attr('y', -36)
      .attr('text-anchor', 'middle')
      .text(lang === 'fr'
        ? 'Distribution des durées de titres par famille de genres'
        : 'Track Duration Distribution by Genre Family');

    // ── Grid ─────────────────────────────────────────────────────────────────
    g.append('g').attr('class', 'grid')
      .selectAll('line').data(y.ticks(6)).join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (v) => y(v)).attr('y2', (v) => y(v))
      .attr('stroke', theme.border).attr('stroke-opacity', 0.4);

    // ── Y axis ───────────────────────────────────────────────────────────────
    g.append('g').attr('class', 'axis')
      .call(d3.axisLeft(y).ticks(6).tickFormat((v) => `${v} min`));

    g.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -44)
      .attr('text-anchor', 'middle')
      .text(lang === 'fr' ? 'Durée (minutes)' : 'Duration (minutes)');

    // ── X axis — horizontal labels ────────────────────────────────────────────
    g.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSizeOuter(0).tickFormat((key) => {
        const d = data.find((d) => d.key === key);
        return d ? getLabel(d) : (key as string);
      }))
      .selectAll('text')
      .style('font-size', '11px')
      .attr('text-anchor', 'middle');

    // X axis title
    g.append('text').attr('class', 'axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 52)
      .attr('text-anchor', 'middle')
      .text(lang === 'fr' ? 'Famille de genres' : 'Genre Family');

    // ── Pop median reference ──────────────────────────────────────────────────
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', y(popMedian)).attr('y2', y(popMedian))
      .attr('stroke', theme.muted).attr('stroke-dasharray', '6,4')
      .attr('stroke-width', 1.5).attr('stroke-linecap', 'round');

    g.append('text')
      .attr('x', 6).attr('y', y(popMedian) - 5)
      .attr('fill', theme.muted).attr('class', 'axis-label')
      .style('font-size', '10px').style('font-weight', '600')
      .text(lang === 'fr' ? 'Médiane pop' : 'Pop median');

    // ── Boxes ────────────────────────────────────────────────────────────────
    const boxG = g.selectAll<SVGGElement, BoxDatum>('.box-col')
      .data(data, (d) => d.key)
      .join('g')
      .attr('class', 'box-col')
      .attr('transform', (d) => `translate(${x(d.key)! + bw / 2},0)`);

    // Whisker line
    boxG.append('line')
      .attr('x1', 0).attr('x2', 0)
      .attr('y1', (d) => y(d.wMin)).attr('y2', (d) => y(d.wMax))
      .attr('stroke', (d) => d.color).attr('stroke-width', 1.5).attr('opacity', 0.5);

    // Whisker caps
    const capW = bw * 0.3;
    (['wMin', 'wMax'] as const).forEach((which) => {
      boxG.append('line')
        .attr('x1', -capW).attr('x2', capW)
        .attr('y1', (d) => y(d[which])).attr('y2', (d) => y(d[which]))
        .attr('stroke', (d) => d.color).attr('stroke-width', 1.5).attr('opacity', 0.5);
    });

    // Outliers (sampled)
    boxG.each(function (d) {
      const rowG = d3.select(this);
      const shown = d.outliers.length > 30
        ? d.outliers.filter((_, i) => i % Math.ceil(d.outliers.length / 30) === 0)
        : d.outliers;
      rowG.selectAll<SVGCircleElement, number>('.outlier').data(shown).join('circle')
        .attr('class', 'outlier').attr('cx', 0).attr('cy', (v) => y(v)).attr('r', 2.2)
        .attr('fill', 'none').attr('stroke', (d.color)).attr('stroke-width', 1)
        .attr('opacity', 0.35).attr('pointer-events', 'none');
    });

    // IQR box fill (interactive)
    boxG.append('rect')
      .attr('x', -bw * 0.38).attr('width', bw * 0.76)
      .attr('y', (d) => y(d.q3)).attr('height', (d) => Math.max(1, y(d.q1) - y(d.q3)))
      .attr('fill', (d) => d.color).attr('rx', 3).attr('opacity', 0.18)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.38);
        tip.show(event, makeTooltip(d));
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { d3.select(this).attr('opacity', 0.18); tip.hide(); });

    // IQR box stroke
    boxG.append('rect')
      .attr('x', -bw * 0.38).attr('width', bw * 0.76)
      .attr('y', (d) => y(d.q3)).attr('height', (d) => Math.max(1, y(d.q1) - y(d.q3)))
      .attr('fill', 'none').attr('stroke', (d) => d.color)
      .attr('stroke-width', 1.5).attr('rx', 3).attr('opacity', 0.7)
      .attr('pointer-events', 'none');

    // Median line
    boxG.append('line')
      .attr('x1', -bw * 0.38).attr('x2', bw * 0.38)
      .attr('y1', (d) => y(d.median)).attr('y2', (d) => y(d.median))
      .attr('stroke', (d) => d.color).attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round').attr('pointer-events', 'none');
  }

  render();

  return {
    resize: render,
    destroy: () => { container.innerHTML = ''; },
    update: (newOpts) => { opts = { ...opts, ...newOpts }; render(); },
  };
}
