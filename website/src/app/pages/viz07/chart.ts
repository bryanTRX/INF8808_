import * as d3 from 'd3';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import type { Lang } from '../../core/services/lang.service';

const L = (lang: Lang) =>
  lang === 'fr'
    ? {
        axisX: 'Durée (min : sec)',
        axisY: 'Popularité moyenne',
        avgLabel: 'Moy. générale',
        songs: 'titres',
        rank: 'Rang',
        of: 'sur',
        avg: 'Moy.',
        median: 'Médiane',
        tipAvg: 'Moy. popularité',
        tipMedian: 'Médiane',
        tipCount: 'Titres',
        tipRank: 'Rang',
        hoverDefault: 'Survolez une barre pour voir la popularité moyenne pour cette durée.',
      }
    : {
        axisX: 'Song length (min : sec)',
        axisY: 'Average popularity',
        avgLabel: 'Overall avg.',
        songs: 'tracks',
        rank: 'Rank',
        of: 'of',
        avg: 'Avg.',
        median: 'Median',
        tipAvg: 'Avg. popularity',
        tipMedian: 'Median',
        tipCount: 'Tracks',
        tipRank: 'Rank',
        hoverDefault: 'Hover a bar to see average popularity for that length range.',
      };

export interface DurationBin {
  bin_start: number;
  avg_duration: number;
  avg_popularity: number;
  median_popularity: number;
  count: number;
}

export interface Viz07Meta {
  tracks_in_view: number;
  correlation: number;
  bin_width_minutes: number;
}

export interface Viz07State {
  showCounts: boolean;
}

function computeBins(rows: TrackRow[]): { bins: DurationBin[]; meta: Viz07Meta } {
  const BIN_WIDTH = 0.5; // 30 seconds
  const MAX_MIN = 15;
  const valid = rows
    .map((d) => ({
      duration_min: Number(d.duration_ms) / 60000,
      popularity: Number(d.popularity),
    }))
    .filter((d) => Number.isFinite(d.duration_min) && Number.isFinite(d.popularity) && d.duration_min < MAX_MIN);

  const binMap = new Map<number, { sumDur: number; sumPop: number; pops: number[]; count: number }>();
  valid.forEach((d) => {
    const start = Math.floor(d.duration_min / BIN_WIDTH) * BIN_WIDTH;
    if (!binMap.has(start)) binMap.set(start, { sumDur: 0, sumPop: 0, pops: [], count: 0 });
    const b = binMap.get(start)!;
    b.sumDur += d.duration_min;
    b.sumPop += d.popularity;
    b.pops.push(d.popularity);
    b.count += 1;
  });

  const bins: DurationBin[] = [...binMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bin_start, b]) => ({
      bin_start,
      avg_duration: b.sumDur / b.count,
      avg_popularity: b.sumPop / b.count,
      median_popularity: d3.median(b.pops) ?? 0,
      count: b.count,
    }));

  const correlation = (() => {
    const pairs = valid.map((d) => ({ x: d.duration_min, y: d.popularity }));
    const mx = d3.mean(pairs, (d) => d.x)!;
    const my = d3.mean(pairs, (d) => d.y)!;
    let num = 0, dx = 0, dy = 0;
    pairs.forEach((d) => {
      const a = d.x - mx, b = d.y - my;
      num += a * b; dx += a * a; dy += b * b;
    });
    return num / Math.sqrt(dx * dy) || 0;
  })();

  return {
    bins,
    meta: { tracks_in_view: valid.length, correlation: +correlation.toFixed(4), bin_width_minutes: BIN_WIDTH },
  };
}

function formatDuration(min: number) {
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface Viz07Chart {
  update: (state: Viz07State) => void;
  setLang: (lang: Lang) => void;
  onHover: (html: string | null) => void;
  resize: () => void;
  destroy: () => void;
  getMeta: () => Viz07Meta;
  getFullBins: () => DurationBin[];
  getDefaultHoverText: () => string;
}

export function createViz07Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  onHover: (html: string | null) => void,
  initLang: Lang = 'fr',
): Viz07Chart {
  const { bins: fullData, meta } = computeBins(rows);
  let _lang: Lang = initLang;
  let state: Viz07State = { showCounts: true };
  let hoveredBin: number | null = null;

  // Fixed layout constants
  const margin = { top: 28, right: 32, bottom: 52, left: 58 };
  const plotHeight = 300;
  const countGap = 14;
  const countPlotHeight = 52;
  // Each bin gets a fixed pixel width so all bins are always visible via scroll
  const BAR_SPACING = 30;
  const BAR_W = 18;

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const theme = getChartTheme();
    const data = fullData;

    const innerWidth = data.length * BAR_SPACING;
    const innerHeight = plotHeight;
    const svgWidth = innerWidth + margin.left + margin.right;
    const mainSvgHeight = margin.top + plotHeight + margin.bottom;
    const totalSvgHeight = mainSvgHeight + (state.showCounts ? countGap + countPlotHeight : 0);

    const y = d3.scaleLinear()
      .domain([
        Math.max(0, (d3.min(data, (d) => d.avg_popularity) ?? 0) - 3),
        (d3.max(data, (d) => d.avg_popularity) ?? 100) + 6,
      ])
      .range([innerHeight, 0]);

    const x = d3.scaleLinear()
      .domain([
        data[0].avg_duration - meta.bin_width_minutes / 2,
        data[data.length - 1].avg_duration + meta.bin_width_minutes / 2,
      ])
      .range([0, innerWidth]);

    const yCount = d3.scaleLinear()
      .domain([0, (d3.max(data, (d) => d.count) ?? 1) * 1.1])
      .range([countPlotHeight, 0]);

    const overallAvg = d3.mean(data, (d) => d.avg_popularity) ?? 0;

    // ── Scrollable wrapper — one single wide SVG scrolls left/right ───────────
    const scrollDiv = d3.select(container).append('div')
      .attr('class', 'viz07-scroll');

    const svg = scrollDiv.append('svg')
      .attr('width', svgWidth)
      .attr('height', totalSvgHeight);

    const gMain = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Y axis
    gMain.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));

    // Y axis label
    gMain.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2).attr('y', -44)
      .attr('text-anchor', 'middle')
      .text(lbl.axisY);

    // Horizontal grid lines
    gMain.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(() => ''))
      .call((g) => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', theme.border).attr('stroke-opacity', 0.3); });

    // X axis
    gMain.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(x)
          .tickValues(data.map((d) => d.avg_duration))
          .tickFormat((d) => formatDuration(+d)),
      )
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.4em')
      .attr('dy', '0.1em')
      .style('font-size', '9px');

    // X axis label
    gMain.append('text').attr('class', 'axis-label')
      .attr('x', innerWidth / 2).attr('y', innerHeight + 48)
      .attr('text-anchor', 'middle').text(lbl.axisX);

    // Global average reference line
    gMain.append('line')
      .attr('stroke', theme.muted).attr('stroke-dasharray', '6,5').attr('stroke-width', 1.5)
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', y(overallAvg)).attr('y2', y(overallAvg));
    gMain.append('text').attr('class', 'axis-label')
      .style('font-size', '10px').style('font-weight', '600')
      .attr('x', innerWidth - 4).attr('y', y(overallAvg) - 5)
      .attr('text-anchor', 'end')
      .text(`${lbl.avgLabel} ${overallAvg.toFixed(1)}`);

    // Bars
    const barsLayer = gMain.append('g');
    barsLayer.selectAll('.bar-group').data(data, (d) => (d as DurationBin).bin_start).join('g')
      .attr('class', 'bar-group')
      .each(function (d) {
        const g = d3.select(this);
        g.append('rect').attr('class', 'bar').attr('fill', theme.bar)
          .attr('x', x(d.avg_duration) - BAR_W / 2)
          .attr('y', y(d.avg_popularity))
          .attr('width', BAR_W)
          .attr('height', Math.max(0, innerHeight - y(d.avg_popularity)))
          .attr('rx', 3)
          .classed('is-hovered', d.bin_start === hoveredBin);
        g.append('text').attr('class', 'value-label')
          .style('font-size', '8.5px').style('font-weight', '600')
          .attr('text-anchor', 'middle')
          .attr('x', x(d.avg_duration)).attr('y', y(d.avg_popularity) - 3)
          .text(d.avg_popularity.toFixed(1));
      });

    // Invisible hit targets
    const hitLayer = gMain.append('g');
    hitLayer.selectAll('.bar-hit').data(data, (d) => (d as DurationBin).bin_start).join('rect')
      .attr('fill', 'transparent').attr('cursor', 'pointer')
      .attr('x', (d) => x(d.avg_duration) - BAR_SPACING / 2)
      .attr('y', 0).attr('width', BAR_SPACING).attr('height', innerHeight)
      .on('mouseenter', (event, d) => {
        hoveredBin = d.bin_start;
        barsLayer.selectAll('.bar').classed('is-hovered', (b) => (b as DurationBin).bin_start === hoveredBin);
        const rank = [...data].sort((a, b) => b.avg_popularity - a.avg_popularity)
          .findIndex((b) => b.bin_start === d.bin_start) + 1;
        const binEnd = d.bin_start + meta.bin_width_minutes;
        const range = `${formatDuration(d.bin_start)} – ${formatDuration(binEnd)}`;
        onHover(
          `<strong>${range}</strong> &nbsp;·&nbsp; ` +
          `${lbl.rank} #${rank} ${lbl.of} ${data.length} &nbsp;·&nbsp; ` +
          `${d.count.toLocaleString()} ${lbl.songs}<br>` +
          `${lbl.avg} <strong>${d.avg_popularity.toFixed(1)}</strong> &nbsp;·&nbsp; ` +
          `${lbl.median} <strong>${d.median_popularity.toFixed(1)}</strong>`,
        );
        tip.show(
          event,
          `<div style="margin-bottom:0.35rem">
            <strong style="font-size:0.9rem">${range}</strong>
          </div>
          <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${lbl.tipAvg}</span>
              <span class="tooltip-value">${d.avg_popularity.toFixed(1)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${lbl.tipMedian}</span>
              <span class="tooltip-value">${d.median_popularity.toFixed(1)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${lbl.tipCount}</span>
              <span class="tooltip-value">${d.count.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${lbl.tipRank}</span>
              <span class="tooltip-value">#${rank} / ${data.length}</span>
            </div>
          </div>`,
        );
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseleave', () => {
        hoveredBin = null;
        barsLayer.selectAll('.bar').classed('is-hovered', false);
        onHover(null);
        tip.hide();
      });

    // Mini count bars
    if (state.showCounts) {
      const gCounts = svg.append('g')
        .attr('transform', `translate(${margin.left},${mainSvgHeight + countGap})`);
      gCounts.selectAll('.count-bar').data(data, (d) => (d as DurationBin).bin_start).join('rect')
        .attr('class', 'count-bar').attr('fill', theme.muted).attr('opacity', 0.45)
        .attr('x', (d) => x(d.avg_duration) - BAR_W / 2)
        .attr('y', (d) => yCount(d.count))
        .attr('width', BAR_W)
        .attr('height', (d) => Math.max(0, countPlotHeight - yCount(d.count)))
        .attr('rx', 2);
    }
  }

  render();
  return {
    update(s) { state = s; render(); },
    setLang(l) { _lang = l; render(); },
    onHover,
    resize: render,
    destroy: () => { container.innerHTML = ''; },
    getMeta: () => meta,
    getFullBins: () => fullData,
    getDefaultHoverText: () => L(_lang).hoverDefault,
  };
}
