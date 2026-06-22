import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import { GENRE_FAMILIES, assignGenreFamily } from '../../viz-shared/utils/genre-families';

// ─── Feature Definitions ──────────────────────────────────────────────────────

export const FEATURE_KEYS = ['valence', 'danceability', 'energy', 'acousticness', 'speechiness', 'instrumentalness'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS_EN: Record<FeatureKey, string> = {
  valence: 'Valence',
  danceability: 'Danceability',
  energy: 'Energy',
  acousticness: 'Acousticness',
  speechiness: 'Speechiness',
  instrumentalness: 'Instrumentalness',
};

const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  valence: 'Musical positivity. High valence → happy, cheerful. Low valence → sad, angry.',
  danceability: 'How suitable for dancing based on rhythm, tempo and beat strength.',
  energy: 'Perceptual measure of intensity. High energy tracks feel fast and loud.',
  acousticness: 'Confidence the track is acoustic (not electronic).',
  speechiness: 'Presence of spoken words. Values above 0.66 suggest spoken-word tracks.',
  instrumentalness: 'Predicts whether a track has no vocals. Above 0.5 = likely instrumental.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenreBin {
  genre: string;
  en: string;
  color: string;
  avgValue: number;
  values: number[];
  q1: number;
  q3: number;
  median: number;
}

export interface Viz08Chart {
  setFeature: (feature: FeatureKey) => void;
  resize: () => void;
  destroy: () => void;
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz08Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz08Chart {
  let feature: FeatureKey = 'valence';

  function buildData(feat: FeatureKey): GenreBin[] {
    const famValues = new Map<string, number[]>();
    for (const fam of GENRE_FAMILIES) famValues.set(fam.key, []);

    for (const row of rows) {
      const tags = String(row.track_genre || '').split(';').map((g) => g.trim()).filter(Boolean);
      const v = Number(row[feat as keyof TrackRow]);
      if (!Number.isFinite(v)) continue;

      for (const tag of tags) {
        const fam = assignGenreFamily(tag);
        if (!fam) continue;
        famValues.get(fam.key)!.push(v);
        break;
      }
    }

    return GENRE_FAMILIES.map((fam) => {
      const vals = famValues.get(fam.key)!;
      if (vals.length < 10) return null;
      const sorted = [...vals].sort(d3.ascending);
      return {
        genre: fam.key,
        en: fam.en,
        color: fam.color,
        avgValue: d3.mean(vals) ?? 0,
        values: vals,
        q1: d3.quantile(sorted, 0.25) ?? 0,
        q3: d3.quantile(sorted, 0.75) ?? 0,
        median: d3.quantile(sorted, 0.5) ?? 0,
      };
    }).filter((d): d is GenreBin => d !== null)
      .sort((a, b) => d3.descending(a.avgValue, b.avgValue));
  }

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    const data = buildData(feature);
    if (data.length === 0) return;

    const margin = { top: 72, right: 24, bottom: 64, left: 152 };
    const width  = Math.max(560, container.clientWidth  || 800);
    const height = Math.max(420, Math.max(400, data.length * 34 + margin.top + margin.bottom));
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const y = d3.scaleBand<string>()
      .domain(data.map((d) => d.en))
      .range([0, innerH]).padding(0.28);

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
    g.append('text').attr('class', 'chart-title')
      .attr('x', innerW / 2).attr('y', -46).attr('text-anchor', 'middle')
      .text(`Average ${FEATURE_LABELS_EN[feature]} by Genre Family`);

    // Description
    g.append('text').attr('class', 'chart-subtitle')
      .attr('x', innerW / 2).attr('y', -26).attr('text-anchor', 'middle')
      .text(FEATURE_DESCRIPTIONS[feature]);

    // Grid
    g.append('g').attr('class', 'grid')
      .selectAll('line').data(x.ticks(5)).join('line')
      .attr('x1', (v) => x(v)).attr('x2', (v) => x(v))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', theme.border).attr('stroke-opacity', 0.4);

    // Bars
    const bh = y.bandwidth();

    g.selectAll<SVGGElement, GenreBin>('.bar-row')
      .data(data, (d) => d.genre)
      .join('g').attr('class', 'bar-row')
      .each(function (d) {
        const row = d3.select(this);
        const yPos = y(d.en)!;

        // IQR background
        row.append('rect')
          .attr('x', x(d.q1)).attr('width', Math.max(0, x(d.q3) - x(d.q1)))
          .attr('y', yPos).attr('height', bh)
          .attr('fill', d.color).attr('opacity', 0.12).attr('rx', 2);

        // Avg bar
        row.append('rect')
          .attr('x', 0).attr('width', x(d.avgValue))
          .attr('y', yPos + bh * 0.25).attr('height', bh * 0.5)
          .attr('fill', d.color).attr('rx', 2).attr('opacity', 0.82)
          .on('mouseover', function (event) {
            d3.select(this).attr('opacity', 1);
            tip.show(event, `
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem">
                <span style="width:10px;height:10px;border-radius:2px;background:${d.color};flex-shrink:0"></span>
                <strong style="font-size:0.9rem">${d.en}</strong>
              </div>
              <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
                <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                  <span style="color:var(--muted)">Average ${FEATURE_LABELS_EN[feature]}</span>
                  <span class="tooltip-value">${d.avgValue.toFixed(3)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                  <span style="color:var(--muted)">Median</span>
                  <span class="tooltip-value">${d.median.toFixed(3)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                  <span style="color:var(--muted)">IQR</span>
                  <span class="tooltip-value">${d.q1.toFixed(3)} – ${d.q3.toFixed(3)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                  <span style="color:var(--muted)">Tracks</span>
                  <span class="tooltip-value">${d3.format(',')(d.values.length)}</span>
                </div>
              </div>`);
          })
          .on('mousemove', (event) => tip.move(event))
          .on('mouseout', function () { d3.select(this).attr('opacity', 0.82); tip.hide(); });

        // Median tick
        row.append('line')
          .attr('x1', x(d.median)).attr('x2', x(d.median))
          .attr('y1', yPos + bh * 0.15).attr('y2', yPos + bh * 0.85)
          .attr('stroke', d.color).attr('stroke-width', 2).attr('stroke-opacity', 0.55)
          .attr('stroke-dasharray', '3,2').attr('pointer-events', 'none');

        // Value label
        row.append('text').attr('class', 'value-label')
          .attr('x', x(d.avgValue) + 6).attr('y', yPos + bh / 2 + 4)
          .style('font-size', '11px')
          .text(d.avgValue.toFixed(3));
      });

    // Axes
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.1f')));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSizeOuter(0));

    g.append('text').attr('class', 'axis-label')
      .attr('x', innerW / 2).attr('y', innerH + 44)
      .attr('text-anchor', 'middle')
      .text(`${FEATURE_LABELS_EN[feature]} (0 – 1)`);

    g.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -138)
      .attr('text-anchor', 'middle')
      .text('Genre Family');
  }

  render();

  return {
    setFeature: (f) => { feature = f; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
