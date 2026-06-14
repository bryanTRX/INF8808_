import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

const STACK_KEYS = ['clean', 'explicit'] as const;
const COLORS: Record<(typeof STACK_KEYS)[number], string> = { clean: '#10cc95', explicit: '#ef533b' };
const LABELS: Record<(typeof STACK_KEYS)[number], string> = { clean: 'Clean', explicit: 'Explicit' };

interface GenreStat {
  genre: string;
  total: number;
  explicit: number;
  clean: number;
  explicitPercent: number;
  cleanPercent: number;
}

function isExplicit(value: unknown): boolean {
  return String(value).toLowerCase() === 'true';
}

function aggregateByGenre(rows: TrackRow[]): GenreStat[] {
  const byGenre = new Map<string, { genre: string; total: number; explicit: number; clean: number }>();

  rows.forEach((row) => {
    const genre = String(row.track_genre || '').trim().toLowerCase();
    if (!genre) return;
    const explicit = isExplicit(row.explicit);
    if (!byGenre.has(genre)) byGenre.set(genre, { genre, total: 0, explicit: 0, clean: 0 });
    const target = byGenre.get(genre)!;
    target.total += 1;
    if (explicit) target.explicit += 1;
    else target.clean += 1;
  });

  return Array.from(byGenre.values())
    .map((item) => ({
      ...item,
      explicitPercent: (item.explicit / item.total) * 100,
      cleanPercent: (item.clean / item.total) * 100,
    }))
    .sort((a, b) => d3.ascending(a.explicitPercent, b.explicitPercent));
}

export interface Viz03Chart {
  resize: () => void;
  destroy: () => void;
}

export function createViz03Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz03Chart {
  const genreStats = aggregateByGenre(rows);

  function render() {
    container.innerHTML = '';
    if (!genreStats.length) return;

    const width = Math.max(640, container.clientWidth || 960);
    const height = Math.max(420, container.clientHeight || 520);
    const margin = { top: 48, right: 100, bottom: 0, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const barCount = genreStats.length;
    const maxGenreLength = d3.max(genreStats, (d) => d.genre.length) ?? 10;
    const fontSize = Math.max(6.5, Math.min(8.5, (innerWidth / barCount) * 0.85));
    const labelWidth = maxGenreLength * fontSize * 0.58;
    margin.bottom = Math.max(104, labelWidth * 0.72 + 36);
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand().domain(genreStats.map((d) => d.genre)).range([0, innerWidth]).paddingInner(0.12);
    const y = d3.scaleLinear().domain([0, 100]).range([chartHeight, 0]);
    const stack = d3.stack<GenreStat>().keys(STACK_KEYS).order(d3.stackOrderNone).offset(d3.stackOffsetExpand);
    const stacked = stack(genreStats);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('text').attr('class', 'chart-title').attr('x', 0).attr('y', -24)
      .text('Content Divide: Percentage of Explicit vs. Clean Tracks');

    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}`));
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2).attr('y', -40).attr('text-anchor', 'middle').text('Percentage (%)');

    const xAxis = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));
    xAxis.selectAll('.tick text').attr('y', 8).attr('transform', 'rotate(-45)').style('text-anchor', 'end')
      .style('font-size', `${fontSize}px`);

    g.append('text').attr('class', 'axis-label').attr('x', innerWidth / 2)
      .attr('y', chartHeight + margin.bottom - 14).attr('text-anchor', 'middle').text('Music Genre');

    g.selectAll('.bar-group').data(stacked).join('g')
      .attr('class', 'bar-group')
      .attr('fill', (s) => COLORS[s.key as keyof typeof COLORS])
      .selectAll('rect').data((s) => s).join('rect')
      .attr('x', (d) => x(d.data.genre)!)
      .attr('y', (d) => y(d[1] * 100))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.max(0, y(d[0] * 100) - y(d[1] * 100)))
      .on('mouseover', (event, d) => {
        const el = event.currentTarget as SVGRectElement;
        d3.select(el).attr('opacity', 0.88);
        const key = (d3.select(el.parentElement!).datum() as d3.Series<GenreStat, string>).key as keyof typeof LABELS;
        const percent = key === 'explicit' ? d.data.explicitPercent : d.data.cleanPercent;
        tip.show(event, `<div><strong>${d.data.genre}</strong></div>
          <div><strong>${LABELS[key]}: </strong><span class="tooltip-value">${d3.format('.1f')(percent)}%</span></div>
          <div><strong>Tracks: </strong><span class="tooltip-value">${d3.format(',')(d.data.total)}</span></div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', (event) => { d3.select(event.currentTarget as SVGRectElement).attr('opacity', 1); tip.hide(); });

    const legend = svg.append('g').attr('transform', `translate(${width - margin.right + 12},${margin.top + 4})`);
    legend.append('text').attr('class', 'axis-label').text('Content Type');
    STACK_KEYS.forEach((key, i) => {
      const row = legend.append('g').attr('transform', `translate(0,${22 + i * 24})`);
      row.append('rect').attr('width', 14).attr('height', 14).attr('rx', 2).attr('fill', COLORS[key]);
      row.append('text').attr('class', 'legend-label').attr('x', 22).attr('y', 11).text(LABELS[key]);
    });
  }

  render();
  return { resize: render, destroy: () => { container.innerHTML = ''; } };
}
