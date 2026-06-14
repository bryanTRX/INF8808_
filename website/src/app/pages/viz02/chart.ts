import * as d3 from 'd3';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { TrackRow } from '../../core/models/track-row';
import { filterTopGenres } from '../../viz-shared/utils/data-helpers';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

interface BoxDatum {
  genre: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
}

function boxStats(values: number[]): Omit<BoxDatum, 'genre' | 'count'> {
  const sorted = values.filter(Number.isFinite).sort(d3.ascending);
  const q1 = d3.quantile(sorted, 0.25) ?? 0;
  const median = d3.quantile(sorted, 0.5) ?? 0;
  const q3 = d3.quantile(sorted, 0.75) ?? 0;
  const iqr = q3 - q1;
  const min = Math.max(d3.min(sorted) ?? 0, q1 - 1.5 * iqr);
  const max = Math.min(d3.max(sorted) ?? 0, q3 + 1.5 * iqr);
  return { min, q1, median, q3, max };
}

export interface Viz02Chart {
  resize: () => void;
  destroy: () => void;
}

export function createViz02Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz02Chart {
  const filtered = filterTopGenres(rows, 50).map((d) => ({
    ...d,
    duration_min: Number(d.duration_ms) / 60000,
  }));
  const popMedian =
    d3.median(
      rows.filter((d) => String(d.track_genre) === 'pop').map((d) => Number(d.duration_ms) / 60000),
      (d) => d,
    ) ?? 0;

  const groups = d3.group(filtered, (d) => String(d.track_genre || ''));
  const data: BoxDatum[] = [...groups.entries()]
    .map(([genre, tracks]) => ({
      genre,
      count: tracks.length,
      ...boxStats(tracks.map((d) => d.duration_min)),
    }))
    .sort((a, b) => d3.ascending(a.genre, b.genre));

  function render() {
    container.innerHTML = '';
    const width = Math.max(640, container.clientWidth || 960);
    const height = Math.max(520, data.length * 14 + 120);
    const margin = { top: 48, right: 120, bottom: 48, left: 140 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
    const y = d3.scaleBand().domain(data.map((d) => d.genre)).range([0, innerHeight]).padding(0.2);
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map((d) => d.genre));

    const theme = getChartTheme();
    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', 0)
      .attr('y', -24)
      .text('Structural Norms: Track Duration Across Top 50 Genres');

    g.append('g').attr('class', 'axis').call(d3.axisBottom(x).ticks(10)).attr('transform', `translate(0,${innerHeight})`);
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSizeOuter(0));

    g.append('text')
      .attr('class', 'axis-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 36)
      .attr('text-anchor', 'middle')
      .text('Duration (Minutes)');

    g.append('line')
      .attr('x1', x(popMedian))
      .attr('x2', x(popMedian))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', theme.reference)
      .attr('stroke-dasharray', '6,4')
      .attr('stroke-width', 1.5);

    g.append('text')
      .attr('class', 'axis-label')
      .attr('x', x(popMedian) + 4)
      .attr('y', 12)
      .attr('fill', theme.reference)
      .attr('font-size', 11)
      .text(`Pop Median: ${d3.format('.2f')(popMedian)} min`);

    const row = g.selectAll('.box-row').data(data).join('g').attr('class', 'box-row').attr('transform', (d) => `translate(0,${y(d.genre)})`);

    row
      .append('line')
      .attr('x1', (d) => x(d.min))
      .attr('x2', (d) => x(d.max))
      .attr('y1', y.bandwidth() / 2)
      .attr('y2', y.bandwidth() / 2)
      .attr('stroke', (d) => color(d.genre) as string)
      .attr('stroke-width', 1);

    row
      .append('rect')
      .attr('x', (d) => x(d.q1))
      .attr('width', (d) => Math.max(0, x(d.q3) - x(d.q1)))
      .attr('y', y.bandwidth() * 0.15)
      .attr('height', y.bandwidth() * 0.7)
      .attr('fill', (d) => color(d.genre) as string)
      .attr('opacity', 0.65)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.9);
        tip.show(
          event,
          `<div><strong>${d.genre}</strong></div>
           <div>Median: <span class="tooltip-value">${d3.format('.2f')(d.median)} min</span></div>
           <div>Q1–Q3: ${d3.format('.2f')(d.q1)} – ${d3.format('.2f')(d.q3)}</div>
           <div>Tracks: ${d3.format(',')(d.count)}</div>`,
        );
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.65);
        tip.hide();
      });

    row
      .append('line')
      .attr('x1', (d) => x(d.median))
      .attr('x2', (d) => x(d.median))
      .attr('y1', y.bandwidth() * 0.15)
      .attr('y2', y.bandwidth() * 0.85)
      .attr('stroke', theme.text)
      .attr('stroke-width', 1.5);
  }

  render();
  return { resize: render, destroy: () => { container.innerHTML = ''; } };
}
