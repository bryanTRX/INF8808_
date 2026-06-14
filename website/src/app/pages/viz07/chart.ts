import * as d3 from 'd3';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

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
  rangeMin?: number;
  rangeMax?: number;
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
  onHover: (html: string | null) => void;
  resize: () => void;
  destroy: () => void;
  getMeta: () => Viz07Meta;
  getFullBins: () => DurationBin[];
}

export function createViz07Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  onHover: (html: string | null) => void,
): Viz07Chart {
  const { bins: fullData, meta } = computeBins(rows);
  let state: Viz07State = { showCounts: true };
  let currentData = fullData;
  let hoveredBin: number | null = null;

  const margin = { top: 28, right: 24, bottom: 48, left: 56 };
  const plotHeight = 280;
  const countGap = 16;
  const countPlotHeight = 52;
  const brushGap = 12;
  const brushHeight = 28;

  function filterData() {
    if (state.rangeMin != null && state.rangeMax != null) {
      const filtered = fullData.filter((d) => d.avg_duration >= state.rangeMin! && d.avg_duration <= state.rangeMax!);
      if (filtered.length >= 2) currentData = filtered;
      else currentData = fullData;
    } else {
      currentData = fullData;
    }
  }

  function render() {
    filterData();
    container.innerHTML = '';

    const width = Math.max(640, container.clientWidth || 980);
    const mainTop = margin.top;
    const countTop = mainTop + plotHeight + margin.bottom + countGap;
    const brushTop = countTop + countPlotHeight + brushGap;
    const totalHeight = brushTop + brushHeight + 16;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = plotHeight;

    const x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleLinear().range([innerHeight, 0]);
    const yCount = d3.scaleLinear().range([countPlotHeight, 0]);

    x.domain(d3.extent(currentData, (d) => d.avg_duration) as [number, number]);
    y.domain([
      Math.max(0, (d3.min(currentData, (d) => d.avg_popularity) ?? 0) - 3),
      (d3.max(currentData, (d) => d.avg_popularity) ?? 100) + 6,
    ]);
    yCount.domain([0, (d3.max(currentData, (d) => d.count) ?? 1) * 1.1]);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', totalHeight);
    const gMain = svg.append('g').attr('transform', `translate(${margin.left},${mainTop})`);
    const gCounts = svg.append('g').attr('transform', `translate(${margin.left},${countTop})`);
    const gBrush = svg.append('g').attr('transform', `translate(${margin.left},${brushTop})`);

    gMain.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(Math.min(8, currentData.length)).tickFormat((d) => formatDuration(+d)));
    gMain.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));
    gMain.append('g').attr('class', 'grid').attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSize(-innerHeight).tickFormat(() => ''));

    gMain.append('text').attr('class', 'axis-label').attr('x', innerWidth / 2).attr('y', innerHeight + 36)
      .attr('text-anchor', 'middle').text('Song length (min : sec)');
    gMain.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2).attr('y', -38).attr('text-anchor', 'middle').text('Average popularity');

    const theme = getChartTheme();
    const barWidth = Math.max(8, (innerWidth / currentData.length) * 0.62);
    const overallAvg = d3.mean(currentData, (d) => d.avg_popularity) ?? 0;

    gMain.append('line').attr('stroke', theme.muted).attr('stroke-dasharray', '6,5')
      .attr('x1', 0).attr('x2', innerWidth).attr('y1', y(overallAvg)).attr('y2', y(overallAvg));
    gMain.append('text').attr('class', 'axis-label').attr('font-size', 11)
      .attr('x', innerWidth - 4).attr('y', y(overallAvg) - 6).attr('text-anchor', 'end')
      .text(`Avg ${overallAvg.toFixed(1)}`);

    const barsLayer = gMain.append('g');
    barsLayer.selectAll('.bar-group').data(currentData, (d) => (d as DurationBin).bin_start).join('g')
      .attr('class', 'bar-group')
      .each(function (d) {
        const g = d3.select(this);
        g.append('rect').attr('class', 'bar').attr('fill', theme.bar)
          .attr('x', x(d.avg_duration) - barWidth / 2)
          .attr('y', y(d.avg_popularity))
          .attr('width', barWidth)
          .attr('height', Math.max(0, innerHeight - y(d.avg_popularity)))
          .attr('rx', 4)
          .classed('is-hovered', d.bin_start === hoveredBin);
        g.append('text').attr('class', 'value-label').attr('font-size', 10).attr('font-weight', 600)
          .attr('text-anchor', 'middle')
          .attr('x', x(d.avg_duration)).attr('y', y(d.avg_popularity) - 5)
          .text(d.avg_popularity.toFixed(1));
      });

    const hitLayer = gMain.append('g');
    hitLayer.selectAll('.bar-hit').data(currentData, (d) => (d as DurationBin).bin_start).join('rect')
      .attr('fill', 'transparent').attr('cursor', 'pointer')
      .attr('x', (d) => x(d.avg_duration) - barWidth / 2)
      .attr('y', 0).attr('width', barWidth).attr('height', innerHeight)
      .on('mouseenter', (event, d) => {
        hoveredBin = d.bin_start;
        barsLayer.selectAll('.bar').classed('is-hovered', (b) => (b as DurationBin).bin_start === hoveredBin);
        const rank = [...currentData].sort((a, b) => b.avg_popularity - a.avg_popularity)
          .findIndex((b) => b.bin_start === d.bin_start) + 1;
        const binEnd = d.bin_start + meta.bin_width_minutes;
        onHover(`<strong>${formatDuration(d.bin_start)} – ${formatDuration(binEnd)}</strong><br>
          Avg popularity: ${d.avg_popularity.toFixed(1)} · Median: ${d.median_popularity.toFixed(1)}<br>
          Rank #${rank} of ${currentData.length} · ${d.count.toLocaleString()} songs`);
        tip.show(event, `<div>${formatDuration(d.bin_start)} – ${formatDuration(binEnd)}</div>
          <div>Avg: <span class="tooltip-value">${d.avg_popularity.toFixed(1)}</span></div>
          <div>Songs: ${d.count.toLocaleString()}</div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseleave', () => {
        hoveredBin = null;
        barsLayer.selectAll('.bar').classed('is-hovered', false);
        onHover(null);
        tip.hide();
      });

    gCounts.selectAll('.count-bar').data(currentData, (d) => (d as DurationBin).bin_start).join('rect')
      .attr('fill', '#94a3b8').attr('opacity', 0.65)
      .attr('x', (d) => x(d.avg_duration) - barWidth / 2)
      .attr('y', (d) => yCount(d.count))
      .attr('width', barWidth)
      .attr('height', (d) => Math.max(0, countPlotHeight - yCount(d.count)))
      .attr('rx', 2);

    gCounts.style('display', state.showCounts ? '' : 'none');

    const brush = d3.brushX().extent([[0, 0], [innerWidth, brushHeight]]).on('end', (event) => {
      if (!event.selection) return;
      const [a, b] = event.selection.map(x.invert);
      state = { ...state, rangeMin: a, rangeMax: b };
      render();
    });

    gBrush.append('rect').attr('fill', theme.brushFill).attr('stroke', theme.brushStroke).attr('width', innerWidth).attr('height', brushHeight);
    gBrush.append('text').attr('class', 'axis-label').attr('x', innerWidth / 2).attr('y', brushHeight / 2 + 4)
      .attr('text-anchor', 'middle').attr('font-size', 11).text('← Drag here to zoom →');
    gBrush.call(brush);
  }

  render();
  return {
    update(s) { state = s; render(); },
    onHover,
    resize: render,
    destroy: () => { container.innerHTML = ''; },
    getMeta: () => meta,
    getFullBins: () => fullData,
  };
}
