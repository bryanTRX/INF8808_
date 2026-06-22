import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Labels ───────────────────────────────────────────────────────────────────

const LBL = {
  title: 'Audio Feature Radar — Top Performers',
  subtitle: 'Hover a performer to highlight their profile',
  tipTracks: 'Tracks',
  tipAvgPop: 'Avg. popularity',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Performer {
  artist: string;
  track_count: number;
  avg_popularity: number;
  avg_danceability: number;
  avg_energy: number;
  avg_valence: number;
  avg_acousticness: number;
  avg_speechiness: number;
}

const RADAR_FEATURES: Array<{ key: keyof Performer; label: string }> = [
  { key: 'avg_danceability',  label: 'Danceability' },
  { key: 'avg_energy',        label: 'Energy' },
  { key: 'avg_valence',       label: 'Valence' },
  { key: 'avg_acousticness',  label: 'Acousticness' },
  { key: 'avg_speechiness',   label: 'Speechiness' },
];

export interface Viz10Chart {
  resize: () => void;
  destroy: () => void;
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz10Chart(
  container: HTMLElement,
  _rows: TrackRow[],
  performers: Performer[],
  tip: VizTooltip,
): Viz10Chart {

  const TOP_N = 12;
  const topPerformers = performers.slice(0, TOP_N);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(topPerformers.map((p) => p.artist));

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();

    const W = Math.max(560, container.clientWidth || 800);
    const H = Math.max(480, container.clientHeight || 560);

    const margin = { top: 60, right: 24, bottom: 80, left: 24 };
    const cx = (W - margin.left - margin.right) / 2 + margin.left;
    const cy = (H - margin.top - margin.bottom) / 2 + margin.top;
    const radius = Math.min(cx - margin.left, cy - margin.top) * 0.72;

    const numAxes = RADAR_FEATURES.length;
    const angleSlice = (2 * Math.PI) / numAxes;

    const r = d3.scaleLinear().domain([0, 1]).range([0, radius]);

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);

    // Title
    svg.append('text').attr('class', 'chart-title')
      .attr('x', W / 2).attr('y', 28).attr('text-anchor', 'middle')
      .text(LBL.title);
    svg.append('text').attr('class', 'chart-subtitle')
      .attr('x', W / 2).attr('y', 46).attr('text-anchor', 'middle')
      .text(LBL.subtitle);

    const g = svg.append('g');

    // Background grid circles
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach((lvl) => {
      g.append('circle').attr('cx', cx).attr('cy', cy)
        .attr('r', r(lvl))
        .attr('fill', 'none').attr('stroke', theme.border).attr('stroke-opacity', 0.35);
      g.append('text')
        .attr('x', cx).attr('y', cy - r(lvl) - 3)
        .attr('text-anchor', 'middle')
        .style('font-size', '9px').style('fill', theme.textSecondary)
        .text(lvl.toFixed(1));
    });

    // Axis lines + labels
    RADAR_FEATURES.forEach((feat, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x2 = cx + r(1) * Math.cos(angle);
      const y2 = cy + r(1) * Math.sin(angle);

      g.append('line').attr('x1', cx).attr('y1', cy).attr('x2', x2).attr('y2', y2)
        .attr('stroke', theme.border).attr('stroke-opacity', 0.4).attr('stroke-width', 1);

      const labelR = r(1) + 18;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);

      g.append('text').attr('x', lx).attr('y', ly)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .style('font-size', '11px').style('font-weight', '600').style('fill', theme.text)
        .text(feat.label);
    });

    // Radar paths
    function radarPath(perf: Performer): string {
      const points = RADAR_FEATURES.map((feat, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const val = Number(perf[feat.key]);
        const rv = r(Number.isFinite(val) ? val : 0);
        return [cx + rv * Math.cos(angle), cy + rv * Math.sin(angle)] as [number, number];
      });
      return d3.line()(points) + 'Z';
    }

    topPerformers.forEach((perf) => {
      const color = colorScale(perf.artist);

      const path = g.append('path')
        .attr('d', radarPath(perf))
        .attr('fill', color).attr('fill-opacity', 0.06)
        .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-opacity', 0.55)
        .attr('stroke-linejoin', 'round');

      path.on('mouseover', function (event) {
        path.attr('fill-opacity', 0.25).attr('stroke-opacity', 1).attr('stroke-width', 2.5).raise();
        tip.show(event, `
          <strong style="font-size:0.9rem">${perf.artist}</strong>
          <div style="border-top:1px solid var(--border);margin-top:0.4rem;padding-top:0.4rem;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipTracks}</span>
              <span class="tooltip-value">${d3.format(',')(perf.track_count)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipAvgPop}</span>
              <span class="tooltip-value">${d3.format('.1f')(perf.avg_popularity)}</span>
            </div>
            ${RADAR_FEATURES.map((feat) => `
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${feat.label}</span>
                <span class="tooltip-value">${Number(perf[feat.key]).toFixed(3)}</span>
              </div>`).join('')}
          </div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () {
        path.attr('fill-opacity', 0.06).attr('stroke-opacity', 0.55).attr('stroke-width', 1.5);
        tip.hide();
      });
    });

    // Legend
    const legG = svg.append('g').attr('transform', `translate(${W / 2 - (TOP_N / 2) * 90},${H - margin.bottom + 8})`);
    topPerformers.forEach((perf, i) => {
      const col = i % Math.ceil(TOP_N / 2);
      const row = Math.floor(i / Math.ceil(TOP_N / 2));
      const item = legG.append('g').attr('transform', `translate(${col * 90},${row * 18})`);
      item.append('circle').attr('cx', 6).attr('cy', -3).attr('r', 5).attr('fill', colorScale(perf.artist)).attr('opacity', 0.8);
      item.append('text').attr('x', 14)
        .style('font-size', '9.5px').style('fill', theme.textSecondary)
        .text(perf.artist.length > 12 ? perf.artist.slice(0, 12) + '…' : perf.artist);
    });
  }

  render();

  return {
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
