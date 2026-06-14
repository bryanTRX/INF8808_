import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { filterTopGenres } from '../../viz-shared/utils/data-helpers';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

const DIMENSIONS = [
  { key: 'danceability', label: 'Danceability', max: 1 },
  { key: 'energy', label: 'Energy', max: 1 },
  { key: 'acousticness', label: 'Acousticness', max: 1 },
  { key: 'valence', label: 'Valence', max: 1 },
  { key: 'popularity', label: 'Popularity', max: 100 },
] as const;

type GenreAvg = {
  genre: string;
  genre_id: number;
  danceability: number;
  energy: number;
  acousticness: number;
  valence: number;
  popularity: number;
};

export interface Viz01Chart {
  resize: () => void;
  destroy: () => void;
}

export function createViz01Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz01Chart {
  const filtered = filterTopGenres(rows, 50);
  const groups = d3.group(filtered, (d) => String(d.track_genre || ''));
  const data: GenreAvg[] = [...groups.entries()].map(([genre, tracks], genre_id) => ({
    genre,
    genre_id,
    danceability: d3.mean(tracks, (d) => Number(d.danceability)) ?? 0,
    energy: d3.mean(tracks, (d) => Number(d.energy)) ?? 0,
    acousticness: d3.mean(tracks, (d) => Number(d.acousticness)) ?? 0,
    valence: d3.mean(tracks, (d) => Number(d.valence)) ?? 0,
    popularity: d3.mean(tracks, (d) => Number(d.popularity)) ?? 0,
  }));

  function render() {
    container.innerHTML = '';
    const width = Math.max(640, container.clientWidth || 900);
    const height = Math.max(420, container.clientHeight || 480);
    const margin = { top: 48, right: 24, bottom: 16, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const theme = getChartTheme();
    const tealrose = d3.interpolateRgbBasis(theme.lineScale);
    const color = d3.scaleSequential(tealrose).domain([0, Math.max(1, data.length - 1)]);
    const x = d3.scalePoint<string>().domain(DIMENSIONS.map((d) => d.key)).range([0, innerWidth]).padding(0.15);
    const yScales = DIMENSIONS.map((dim) =>
      d3.scaleLinear().domain([0, dim.max]).range([innerHeight, 0]),
    );

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', 0)
      .attr('y', -24)
      .text(`Average Audio Features for ${data.length} Genres`);

    DIMENSIONS.forEach((dim, i) => {
      const axisG = g.append('g').attr('transform', `translate(${x(dim.key)!},0)`);
      axisG.append('g').attr('class', 'axis').call(d3.axisLeft(yScales[i]).ticks(5));
      axisG
        .append('text')
        .attr('class', 'axis-label')
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .text(dim.label);
    });

    const line = d3
      .line<number>()
      .defined((v) => Number.isFinite(v))
      .x((_, i) => x(DIMENSIONS[i].key)!)
      .y((v, i) => yScales[i](v));

    g.selectAll('.pc-line')
      .data(data)
      .join('path')
      .attr('class', 'pc-line')
      .attr('fill', 'none')
      .attr('stroke', (d) => color(d.genre_id))
      .attr('stroke-width', 1.4)
      .attr('opacity', 0.75)
      .attr('d', (d) => line(DIMENSIONS.map((dim) => d[dim.key])))
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke-width', 2.5).attr('opacity', 1);
        tip.show(
          event,
          `<div><strong>${d.genre}</strong></div>
           <div>Danceability: <span class="tooltip-value">${d3.format('.2f')(d.danceability)}</span></div>
           <div>Energy: <span class="tooltip-value">${d3.format('.2f')(d.energy)}</span></div>
           <div>Popularity: <span class="tooltip-value">${d3.format('.1f')(d.popularity)}</span></div>`,
        );
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () {
        d3.select(this).attr('stroke-width', 1.4).attr('opacity', 0.75);
        tip.hide();
      });
  }

  render();
  return { resize: render, destroy: () => { container.innerHTML = ''; } };
}
