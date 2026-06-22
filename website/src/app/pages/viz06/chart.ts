import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import { GENRE_FAMILIES, assignGenreFamily } from '../../viz-shared/utils/genre-families';

const LBL = {
  title: 'Average Popularity by Genre Family',
  xLabel: 'Average Popularity',
  yLabel: 'Genre Family',
  tipTracks: 'Tracks',
  tipAvgPop: 'Avg. popularity',
  tipMedPop: 'Median',
  tipTopGenre: 'Top subgenre',
};

export interface Viz06Chart {
  resize: () => void;
  destroy: () => void;
}

interface FamilyPop {
  key: string;
  en: string;
  color: string;
  count: number;
  avgPop: number;
  medPop: number;
  topSubgenre: string;
  subgenres: string[];
}

function buildFamilyPop(rows: TrackRow[]): FamilyPop[] {
  const famTracks = new Map<string, { popularities: number[]; genres: Map<string, number> }>();
  for (const fam of GENRE_FAMILIES) {
    famTracks.set(fam.key, { popularities: [], genres: new Map() });
  }

  for (const row of rows) {
    const tags = String(row.track_genre || '').split(';').map((g) => g.trim()).filter(Boolean);
    const pop = Number(row.popularity);
    if (!Number.isFinite(pop)) continue;

    for (const tag of tags) {
      const fam = assignGenreFamily(tag);
      if (!fam) continue;
      const c = famTracks.get(fam.key)!;
      c.popularities.push(pop);
      c.genres.set(tag, (c.genres.get(tag) ?? 0) + 1);
      break;
    }
  }

  return GENRE_FAMILIES.map((fam) => {
    const c = famTracks.get(fam.key)!;
    if (c.popularities.length < 10) return null;
    const sorted = [...c.genres.entries()].sort((a, b) => b[1] - a[1]);
    return {
      key: fam.key,
      en: fam.en,
      color: fam.color,
      count: c.popularities.length,
      avgPop: d3.mean(c.popularities) ?? 0,
      medPop: d3.median(c.popularities) ?? 0,
      topSubgenre: sorted[0]?.[0] ?? '',
      subgenres: sorted.slice(0, 5).map(([g]) => g),
    };
  }).filter((d): d is FamilyPop => d !== null)
    .sort((a, b) => d3.descending(a.avgPop, b.avgPop));
}

export function createViz06Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz06Chart {
  const allData = buildFamilyPop(rows);

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    if (allData.length === 0) return;

    const margin = { top: 48, right: 64, bottom: 64, left: 148 };
    const width = Math.max(580, container.clientWidth || 800);
    const height = Math.max(360, allData.length * 38 + margin.top + margin.bottom);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
    const y = d3.scaleBand<string>()
      .domain(allData.map((d) => d.en))
      .range([0, innerH]).padding(0.28);

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('text').attr('class', 'chart-title')
      .attr('x', innerW / 2).attr('y', -24).attr('text-anchor', 'middle')
      .text(LBL.title);

    g.append('g').attr('class', 'grid')
      .selectAll('line').data(x.ticks(6)).join('line')
      .attr('x1', (v) => x(v)).attr('x2', (v) => x(v))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', theme.border).attr('stroke-opacity', 0.4);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6));

    g.append('text').attr('class', 'axis-label')
      .attr('x', innerW / 2).attr('y', innerH + 44).attr('text-anchor', 'middle')
      .text(LBL.xLabel);

    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSizeOuter(0));

    g.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -130)
      .attr('text-anchor', 'middle')
      .text(LBL.yLabel);

    const bh = y.bandwidth();

    const rows2 = g.selectAll<SVGGElement, FamilyPop>('.row')
      .data(allData, (d) => d.key)
      .join('g').attr('class', 'row');

    rows2.append('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.en)!)
      .attr('width', (d) => x(d.avgPop))
      .attr('height', bh)
      .attr('fill', (d) => d.color)
      .attr('rx', 3).attr('opacity', 0.75)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1);
        tip.show(event, `
          <div style="margin-bottom:0.45rem;display:flex;align-items:center;gap:0.5rem">
            <span style="width:10px;height:10px;border-radius:2px;background:${d.color};display:inline-block"></span>
            <strong style="font-size:0.9rem">${d.en}</strong>
          </div>
          <div style="color:var(--muted);font-size:0.77rem;font-style:italic;margin-bottom:0.4rem">${d.subgenres.join(', ')}</div>
          <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipTracks}</span>
              <span class="tooltip-value">${d3.format(',')(d.count)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipAvgPop}</span>
              <span class="tooltip-value">${d3.format('.1f')(d.avgPop)} / 100</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipMedPop}</span>
              <span class="tooltip-value">${d3.format('.1f')(d.medPop)} / 100</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipTopGenre}</span>
              <span class="tooltip-value">${d.topSubgenre}</span>
            </div>
          </div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { d3.select(this).attr('opacity', 0.75); tip.hide(); });

    rows2.append('text').attr('class', 'value-label')
      .attr('x', (d) => x(d.avgPop) + 6)
      .attr('y', (d) => y(d.en)! + bh / 2 + 4)
      .style('font-size', '11px')
      .text((d) => d3.format('.1f')(d.avgPop));
  }

  render();

  return {
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
